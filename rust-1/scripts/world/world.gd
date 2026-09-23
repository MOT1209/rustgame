extends Node3D
## World root (Phase 1).
## Placeholder terrain spawn. Terrain generation lands in Phase 3.

const BUILDING_PROTOTYPE := preload("res://scenes/world/building.tscn")

func _ready() -> void:
	_spawn_placeholder_structures()

func _spawn_placeholder_structures() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for i in 8:
		var building := BUILDING_PROTOTYPE.instantiate()
		building.position = Vector3(rng.randf_range(-25.0, 25.0), 0.0, rng.randf_range(-25.0, 25.0))
		add_child(building)