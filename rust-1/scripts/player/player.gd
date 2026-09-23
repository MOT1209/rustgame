extends CharacterBody3D
## Player controller (Phase 1-5).
## Handles movement, jump, sprint, third-person camera orbit, GLB model animation and building.

const WALK_SPEED := 4.5
const RUN_SPEED := 8.0
const JUMP_VELOCITY := 6.0
const MOUSE_SENSITIVITY := 0.0025
const PITCH_LIMIT := 1.48353  # 85 degrees in radians

const BUILDING_SCENE := preload("res://scenes/world/building.tscn")
const BUILDING_SIZE := 3.0
const BUILD_RANGE := 12.0
const BUILD_TARGET_CAMERA_LAYER := 1  # world/terrain layer

const STATE_IDLE := "Idle"
const STATE_WALK := "Walk"

@onready var camera_pivot: Node3D = $CameraPivot
@onready var camera: Camera3D = $CameraPivot/Camera3D
@onready var visual: Node3D = $Visual
@onready var animation_player: AnimationPlayer = $Visual/AnimationPlayer

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

var build_mode := false

var _ghost: MeshInstance3D
var _ghost_target := Vector3.ZERO
var _target_material := StandardMaterial3D.new()
var _grid := BUILDING_SIZE

var _current_anim := ""

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	_setup_ghost()
	_play_anim(STATE_IDLE)

func _setup_ghost() -> void:
	_ghost = MeshInstance3D.new()
	_ghost.name = "BuildGhost"
	var mesh := BoxMesh.new()
	mesh.size = Vector3(_grid, _grid, _grid)
	_ghost.mesh = mesh
	_target_material.albedo_color = Color(0.3, 0.9, 0.4, 0.35)
	_target_material.flags_transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_target_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_target_material.no_depth_test = true
	_ghost.material_override = _target_material
	_ghost.visible = false
	add_child(_ghost)

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

func _handle_build_input(event: InputEvent) -> void:
	if event.is_action_pressed("build_open") or event.is_action_pressed("cancel_build"):
		_toggle_build_mode()
		event.accept()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		_place_building()
		event.accept()
	elif event is InputEventMouseMotion:
		_update_ghost_target()
		event.accept()

func _physics_process(delta: float) -> void:
	_apply_gravity(delta)
	_handle_jump()
	_handle_movement(delta)
	move_and_slide()
	_face_movement_direction()
	_update_animation()
	if build_mode:
		_update_ghost_target()
		_apply_ghost()
	else:
		_handle_orientation_keys()
		_handle_interact()

func _apply_gravity(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta

func _handle_jump() -> void:
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = JUMP_VELOCITY

func _handle_movement(delta: float) -> void:
	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var speed := RUN_SPEED if Input.is_action_pressed("sprint") else WALK_SPEED
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

func _toggle_build_mode() -> void:
	build_mode = not build_mode
	_ghost.visible = build_mode
	if build_mode:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		_update_ghost_target()
	else:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _update_ghost_target() -> void:
	var from := camera.global_position
	var to := from + -camera.global_transform.basis.z * BUILD_RANGE
	var query := PhysicsRayQueryParameters3D.create(from, to, BUILD_TARGET_CAMERA_LAYER)
	var result := get_world_3d().direct_space_state.intersect_ray(query)
	if result:
		var snapped := Vector3(
			floori(result.position.x / _grid) * _grid + _grid * 0.5,
			0.0,
			floori(result.position.z / _grid) * _grid + _grid * 0.5)
		snapped.y = result.position.y + _grid * 0.5
		_ghost_target = snapped

func _apply_ghost() -> void:
	_ghost.global_position = _ghost_target
	_ghost.rotation.y = visual.rotation.y

func _place_building() -> void:
	var building := BUILDING_SCENE.instantiate()
	building.position = _ghost_target
	building.rotation.y = visual.rotation.y
	var parent := get_tree().current_scene if get_tree().current_scene else get_tree().root
	parent.add_child(building)

func _handle_interact() -> void:
	if not Input.is_action_just_pressed("interact"):
		return
	var from := camera.global_position
	var to := from + -camera.global_transform.basis.z * 5.0
	var query := PhysicsRayQueryParameters3D.create(from, to, 4)  # building layer
	var result := get_world_3d().direct_space_state.intersect_ray(query)
	if result and result.collider.has_method("upgrade"):
		result.collider.upgrade()