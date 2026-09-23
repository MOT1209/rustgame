extends Node3D
## World root (Phases 1-7).
## Spawns structures, resources and loot; runs the day/night cycle.

const BUILDING_PROTOTYPE := preload("res://scenes/world/building.tscn")
const RESOURCE_PROTOTYPE := preload("res://scenes/world/resource_node.tscn")
const PICKUP_PROTOTYPE := preload("res://scenes/world/pickup.tscn")
const BUILDING_HALF := 1.5
const SPREAD := 45.0
const TREE_COUNT := 24
const ROCK_COUNT := 16

# Loot scatter: item id -> count
const LOOT := {
	"food": 6,
	"water": 5,
	"bandage": 4,
	"medkit": 2,
	"backpack": 1,
}

const DAY_LENGTH := 300.0  # seconds per full day

var _time_of_day := 0.3  # 0..1, start in the morning

@onready var sun: DirectionalLight3D = $Sun
@onready var world_env: WorldEnvironment = $WorldEnvironment
@onready var player: Node3D = $Player

func _ready() -> void:
	_spawn_placeholder_structures()
	_spawn_resources()
	_spawn_loot()
	GameEvents.show_message("Survive! Gather wood (E on trees), build (Q), heal (B).")

func _process(delta: float) -> void:
	_tick_day_night(delta)

func _ground_pos(rng: RandomNumberGenerator, min_dist := 6.0) -> Vector3:
	var terrain: Node = get_node_or_null("Terrain")
	for attempt in 20:
		var pos := Vector3(rng.randf_range(-SPREAD, SPREAD), 0.0, rng.randf_range(-SPREAD, SPREAD))
		if Vector2(pos.x, pos.z).length() < min_dist:
			continue
		if terrain and terrain.has_method("height_at"):
			pos.y = terrain.height_at(pos.x, pos.z)
		return pos
	return Vector3(min_dist, 0.0, min_dist)

func _spawn_placeholder_structures() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for i in 8:
		var building := BUILDING_PROTOTYPE.instantiate()
		building.position = _ground_pos(rng, 10.0) + Vector3(0, BUILDING_HALF, 0)
		add_child(building)

func _spawn_resources() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for i in TREE_COUNT:
		var node: Node3D = RESOURCE_PROTOTYPE.instantiate()
		node.kind = 0
		node.position = _ground_pos(rng)
		add_child(node)
	for i in ROCK_COUNT:
		var node: Node3D = RESOURCE_PROTOTYPE.instantiate()
		node.kind = 1
		node.position = _ground_pos(rng)
		add_child(node)

func _spawn_loot() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for item_id in LOOT:
		for i in LOOT[item_id]:
			var pickup: Node3D = PICKUP_PROTOTYPE.instantiate()
			pickup.item_id = item_id
			pickup.position = _ground_pos(rng) + Vector3(0, 0.1, 0)
			add_child(pickup)

func _tick_day_night(delta: float) -> void:
	_time_of_day = fmod(_time_of_day + delta / DAY_LENGTH, 1.0)
	var angle := _time_of_day * TAU
	var elevation := sin(angle)  # >0 day, <0 night
	# Rotate sun around the world
	sun.rotation = Vector3(-angle + PI * 0.5, PI * 0.25, 0)
	var day_factor := clampf(elevation * 2.0 + 0.25, 0.0, 1.0)
	sun.light_energy = lerpf(0.05, 1.2, day_factor)
	var env := world_env.environment
	if env:
		env.ambient_light_energy = lerpf(0.15, 0.8, day_factor)
		env.ambient_light_color = Color(0.15, 0.2, 0.35).lerp(Color(0.6, 0.65, 0.7), day_factor)
	var is_night := elevation < 0.05
	if player and player.has_method("set_torch_lit"):
		player.set_torch_lit(is_night)
