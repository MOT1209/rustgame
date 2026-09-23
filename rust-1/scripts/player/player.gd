extends CharacterBody3D
## Player controller (Phases 1-7).
## Movement, jump, sprint, third-person camera, GLB animation, building,
## gathering, survival stats (health/hunger), consumables, axe + torch.

const WALK_SPEED := 4.5
const RUN_SPEED := 8.0
const JUMP_VELOCITY := 6.0
const MOUSE_SENSITIVITY := 0.0025
const PITCH_LIMIT := 1.48353  # 85 degrees in radians

const BUILDING_SCENE := preload("res://scenes/world/building.tscn")
const TENT_SCENE := preload("res://scenes/world/tent.tscn")
const BONFIRE_SCENE := preload("res://scenes/world/bonfire.tscn")
const AXE_MODEL := preload("res://assets/models/pack/Axe.glb")
const BUILDING_SIZE := 3.0
const BUILD_RANGE := 12.0
const BUILD_TARGET_CAMERA_LAYER := 1  # world/terrain layer
const INTERACT_MASK := 5  # world (1) + building (4)
const INTERACT_RANGE := 5.0

const STATE_IDLE := "Idle"
const STATE_WALK := "Walk"

# Blueprints: name -> {scene or "", cost, ghost size, y offset}
const BLUEPRINTS := [
	{"name": "Wall", "cost": {"wood": 10}, "ghost": Vector3(3, 3, 3), "y_off": 1.5},
	{"name": "Tent", "cost": {"wood": 50}, "ghost": Vector3(3.2, 2.6, 3.6), "y_off": 0.1},
	{"name": "Bonfire", "cost": {"wood": 30, "stone": 10}, "ghost": Vector3(1.8, 0.8, 1.8), "y_off": 0.05},
]

const MAX_HEALTH := 100.0
const MAX_HUNGER := 100.0
const HUNGER_DRAIN := 0.25
const HUNGER_DRAIN_SPRINT := 0.5
const STARVE_DAMAGE := 2.0
const REGEN_RATE := 1.0

@onready var camera_pivot: Node3D = $CameraPivot
@onready var camera: Camera3D = $CameraPivot/Camera3D
@onready var visual: Node3D = $Visual
@onready var animation_player: AnimationPlayer = $Visual/AnimationPlayer

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

var build_mode := false
var blueprint_index := 0

var health := MAX_HEALTH
var hunger := MAX_HUNGER
var gather_power := 2  # axe equipped

var _ghost: MeshInstance3D
var _ghost_target := Vector3.ZERO
var _ghost_valid := false
var _ghost_affordable := false
var _target_material := StandardMaterial3D.new()
var _grid := BUILDING_SIZE

var _current_anim := ""
var _spawn_pos := Vector3.ZERO
var _was_on_floor := true
var _fall_speed := 0.0
var _last_health_int := -1
var _last_hunger_int := -1
var _is_sprinting := false
var _torch_light: OmniLight3D

func _ready() -> void:
	add_to_group("player")
	_spawn_pos = global_position
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	_setup_ghost()
	_setup_torch()
	_setup_axe()
	_play_anim(STATE_IDLE)
	_push_stats(true)

func _setup_ghost() -> void:
	_ghost = MeshInstance3D.new()
	_ghost.name = "BuildGhost"
	_refresh_ghost_mesh()
	_target_material.albedo_color = Color(0.3, 0.9, 0.4, 0.35)
	_target_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_target_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_target_material.no_depth_test = true
	_ghost.material_override = _target_material
	_ghost.visible = false
	add_child(_ghost)

func _refresh_ghost_mesh() -> void:
	var size: Vector3 = BLUEPRINTS[blueprint_index]["ghost"]
	var mesh := BoxMesh.new()
	mesh.size = size
	_ghost.mesh = mesh

func _setup_torch() -> void:
	_torch_light = OmniLight3D.new()
	_torch_light.name = "TorchLight"
	_torch_light.position = Vector3(0.3, 1.7, 0.3)
	_torch_light.light_color = Color(1.0, 0.75, 0.45)
	_torch_light.light_energy = 0.0
	_torch_light.omni_range = 9.0
	_torch_light.shadow_enabled = false
	visual.add_child(_torch_light)

func set_torch_lit(lit: bool) -> void:
	if _torch_light:
		_torch_light.light_energy = 2.4 if lit else 0.0

func _setup_axe() -> void:
	var axe: Node3D = AXE_MODEL.instantiate()
	axe.name = "Axe"
	axe.position = Vector3(0.34, 0.85, -0.08)
	axe.rotation_degrees = Vector3(10, 0, -18)
	visual.add_child(axe)

func _play_anim(anim_name: String) -> void:
	if _current_anim == anim_name:
		return
	_current_anim = anim_name
	if not animation_player or not animation_player.has_animation(anim_name):
		return
	var anim := animation_player.get_animation(anim_name)
	anim.loop_mode = Animation.LOOP_LINEAR
	animation_player.play(anim_name)

func _unhandled_input(event: InputEvent) -> void:
	if build_mode:
		_handle_build_input(event)
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * MOUSE_SENSITIVITY)
		camera_pivot.rotate_x(-event.relative.y * MOUSE_SENSITIVITY)
		camera_pivot.rotation.x = clampf(camera_pivot.rotation.x, -PITCH_LIMIT, PITCH_LIMIT)
	if event.is_action_pressed("build_open"):
		_toggle_build_mode()
	elif event.is_action_pressed("heal"):
		_use_heal()
	elif event.is_action_pressed("eat_food"):
		_eat_food()
	elif event.is_action_pressed("drink_water"):
		_drink_water()

func _handle_build_input(event: InputEvent) -> void:
	if event.is_action_pressed("build_open") or event.is_action_pressed("cancel_build"):
		_toggle_build_mode()
		event.accept()
	elif event.is_action_pressed("build_slot_1"):
		_select_blueprint(0)
		event.accept()
	elif event.is_action_pressed("build_slot_2"):
		_select_blueprint(1)
		event.accept()
	elif event.is_action_pressed("build_slot_3"):
		_select_blueprint(2)
		event.accept()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		_place_blueprint()
		event.accept()
	elif event is InputEventMouseMotion:
		_update_ghost_target()
		event.accept()

func _process(delta: float) -> void:
	_tick_survival(delta)

func _physics_process(delta: float) -> void:
	_apply_gravity(delta)
	_handle_jump()
	_handle_movement(delta)
	_track_fall()
	move_and_slide()
	_apply_fall_damage()
	_face_movement_direction()
	_update_animation()
	if build_mode:
		_update_ghost_target()
		_apply_ghost()
	else:
		_handle_orientation_keys()
		_handle_interact()

# --- survival ---

func _tick_survival(delta: float) -> void:
	var drain := HUNGER_DRAIN_SPRINT if _is_sprinting else HUNGER_DRAIN
	hunger = clampf(hunger - drain * delta, 0.0, MAX_HUNGER)
	if hunger <= 0.0:
		take_damage(STARVE_DAMAGE * delta, true)
	elif hunger > 60.0 and health < MAX_HEALTH:
		health = clampf(health + REGEN_RATE * delta, 0.0, MAX_HEALTH)
	_push_stats()

func _push_stats(force := false) -> void:
	var h := int(health)
	var hu := int(hunger)
	if force or h != _last_health_int:
		_last_health_int = h
		GameEvents.notify_player_health(health, MAX_HEALTH)
	if force or hu != _last_hunger_int:
		_last_hunger_int = hu
		GameEvents.notify_player_hunger(hunger, MAX_HUNGER)

func take_damage(amount: float, silent := false) -> void:
	if amount <= 0.0:
		return
	health = clampf(health - amount, 0.0, MAX_HEALTH)
	_push_stats()
	if not silent and health < 30.0 and health > 0.0:
		GameEvents.show_message("Low health! Press B to heal.")
	if health <= 0.0:
		_die()

func heal(amount: float) -> void:
	health = clampf(health + amount, 0.0, MAX_HEALTH)
	_push_stats()

func _die() -> void:
	GameEvents.show_message("You died. Respawning...")
	global_position = _spawn_pos
	velocity = Vector3.ZERO
	health = MAX_HEALTH
	hunger = 70.0
	_push_stats(true)

func _track_fall() -> void:
	if not is_on_floor() and velocity.y < _fall_speed:
		_fall_speed = velocity.y

func _apply_fall_damage() -> void:
	if is_on_floor() and not _was_on_floor:
		if _fall_speed < -12.0:
			var dmg := (-_fall_speed - 12.0) * 8.0
			take_damage(dmg)
			GameEvents.show_message("Fall damage: %d." % int(dmg))
		_fall_speed = 0.0
	_was_on_floor = is_on_floor()

func _use_heal() -> void:
	if health >= MAX_HEALTH:
		GameEvents.show_message("Health already full.")
		return
	if Inventory.consume("medkit"):
		heal(50.0)
		GameEvents.show_message("Used First Aid Kit (+50 HP).")
	elif Inventory.consume("bandage"):
		heal(25.0)
		GameEvents.show_message("Used Bandage (+25 HP).")
	else:
		GameEvents.show_message("No bandage or medkit. Find loot!")

func _eat_food() -> void:
	if hunger >= MAX_HUNGER:
		GameEvents.show_message("Not hungry.")
		return
	if Inventory.consume("food"):
		hunger = clampf(hunger + 35.0, 0.0, MAX_HUNGER)
		_push_stats(true)
		GameEvents.show_message("Ate canned food (+35 hunger).")
	else:
		GameEvents.show_message("No food. Search cans!")

func _drink_water() -> void:
	if not Inventory.consume("water"):
		GameEvents.show_message("No water. Search bottles!")
		return
	hunger = clampf(hunger + 15.0, 0.0, MAX_HUNGER)
	heal(5.0)
	_push_stats(true)
	GameEvents.show_message("Drank water (+15 hunger, +5 HP).")

# --- movement / camera / anim (unchanged) ---

func _apply_gravity(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta

func _handle_jump() -> void:
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = JUMP_VELOCITY

func _handle_movement(delta: float) -> void:
	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var speed := RUN_SPEED if Input.is_action_pressed("sprint") else WALK_SPEED
	_is_sprinting = Input.is_action_pressed("sprint") and input_dir.length() > 0.1
	var direction := (transform.basis * Vector3(input_dir.x, 0.0, input_dir.y)).normalized()
	if build_mode:
		speed *= 0.15
	if direction:
		velocity.x = direction.x * speed
		velocity.z = direction.z * speed
	else:
		velocity.x = move_toward(velocity.x, 0.0, speed * 8.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, speed * 8.0 * delta)

func _face_movement_direction() -> void:
	var flat_velocity := Vector3(velocity.x, 0.0, velocity.z)
	if flat_velocity.length_squared() > 0.1:
		visual.rotation.y = lerp_angle(visual.rotation.y, atan2(-velocity.x, -velocity.z), 0.15)

func _update_animation() -> void:
	var flat_speed := Vector3(velocity.x, 0.0, velocity.z).length()
	if flat_speed > 0.5:
		_play_anim(STATE_WALK)
	else:
		_play_anim(STATE_IDLE)

func _handle_orientation_keys() -> void:
	var step := 0.1
	var rot := visual.rotation.y
	if Input.is_action_pressed("upgrade_build"):
		rot += step
	if Input.is_action_pressed("cancel_build"):
		rot -= step
	visual.rotation.y = rot

# --- building ---

func _select_blueprint(index: int) -> void:
	if index < 0 or index >= BLUEPRINTS.size():
		return
	blueprint_index = index
	_refresh_ghost_mesh()
	var bp: Dictionary = BLUEPRINTS[blueprint_index]
	GameEvents.notify_build_tier(bp["name"])
	GameEvents.show_message("Selected: %s (%s)." % [bp["name"], _cost_text(bp["cost"])])
	_update_ghost_target()

func _cost_text(cost: Dictionary) -> String:
	var parts: PackedStringArray = []
	for item in cost:
		parts.append("%d %s" % [cost[item], item])
	return ", ".join(parts)

func _can_afford(cost: Dictionary) -> bool:
	for item in cost:
		if not Inventory.has(item, cost[item]):
			return false
	return true

func _toggle_build_mode() -> void:
	build_mode = not build_mode
	_ghost.visible = build_mode
	if build_mode:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		_select_blueprint(blueprint_index)
	else:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _update_ghost_target() -> void:
	_ghost_valid = false
	var from := camera.global_position
	var to := from + -camera.global_transform.basis.z * BUILD_RANGE
	var query := PhysicsRayQueryParameters3D.create(from, to, BUILD_TARGET_CAMERA_LAYER)
	var result := get_world_3d().direct_space_state.intersect_ray(query)
	if result:
		var bp: Dictionary = BLUEPRINTS[blueprint_index]
		var size: Vector3 = bp["ghost"]
		var snapped := Vector3(
			floori(result.position.x / _grid) * _grid + _grid * 0.5,
			0.0,
			floori(result.position.z / _grid) * _grid + _grid * 0.5)
		snapped.y = result.position.y + float(bp["y_off"])
		_ghost_target = snapped
		_ghost_valid = true
		_ghost_affordable = _can_afford(bp["cost"])

func _apply_ghost() -> void:
	if not _ghost_valid:
		_ghost.visible = false
		return
	_ghost.visible = true
	_ghost.global_position = _ghost_target
	_ghost.rotation.y = visual.rotation.y
	if _ghost_affordable:
		_target_material.albedo_color = Color(0.3, 0.9, 0.4, 0.35)
	else:
		_target_material.albedo_color = Color(0.9, 0.25, 0.25, 0.35)

func _place_blueprint() -> void:
	if not _ghost_valid:
		return
	var bp: Dictionary = BLUEPRINTS[blueprint_index]
	var cost: Dictionary = bp["cost"]
	if not _can_afford(cost):
		GameEvents.show_message("Need %s." % _cost_text(cost))
		return
	for item in cost:
		Inventory.consume(item, cost[item])
	var parent := get_tree().current_scene if get_tree().current_scene else get_tree().root
	match bp["name"]:
		"Wall":
			var building := BUILDING_SCENE.instantiate()
			building.position = _ghost_target
			building.rotation.y = visual.rotation.y
			parent.add_child(building)
		"Tent":
			var tent := TENT_SCENE.instantiate()
			tent.position = _ghost_target
			tent.rotation.y = visual.rotation.y
			parent.add_child(tent)
		"Bonfire":
			var fire := BONFIRE_SCENE.instantiate()
			fire.position = _ghost_target
			parent.add_child(fire)
	GameEvents.show_message("%s placed." % bp["name"])

# --- interact / gather ---

func _handle_interact() -> void:
	if not Input.is_action_just_pressed("interact"):
		return
	var from := camera.global_position
	var to := from + -camera.global_transform.basis.z * INTERACT_RANGE
	var query := PhysicsRayQueryParameters3D.create(from, to, INTERACT_MASK)
	var result := get_world_3d().direct_space_state.intersect_ray(query)
	if result.is_empty():
		return
	var collider: Object = result.collider
	if collider.has_method("gather"):
		_gather_from(collider)
	elif collider.has_method("upgrade"):
		collider.upgrade()

func _gather_from(node: Object) -> void:
	var drops: Dictionary = node.gather(gather_power)
	if drops.is_empty():
		return
	var gained: PackedStringArray = []
	for item in drops:
		if Inventory.add(item, int(drops[item])):
			gained.append("%d %s" % [int(drops[item]), item])
	if not gained.is_empty():
		GameEvents.show_message("Gathered: %s." % ", ".join(gained))
