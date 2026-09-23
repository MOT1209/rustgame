extends Node3D
## World root (Phase 1-4).
## Spawns placeholder structures and provides world-level helpers.

const BUILDING_PROTOTYPE := preload("res://scenes/world/building.tscn")
const BUILDING_HALF := 1.5

func _ready() -> void:
	_spawn_placeholder_structures()

func _spawn_placeholder_structures() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var terrain: Node = get_node_or_null("Terrain")
	for i in 8:
		var building := BUILDING_PROTOTYPE.instantiate()
		var pos := Vector3(rng.randf_range(-25.0, 25.0), 0.0, rng.randf_range(-25.0, 25.0))
		if terrain and terrain.has_method("height_at"):
			pos.y = terrain.height_at(pos.x, pos.z) + BUILDING_HALF
		building.position = pos
		add_child(building)