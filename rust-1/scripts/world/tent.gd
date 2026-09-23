extends StaticBody3D
## Placeable tent (Phase 4+). Rest zone: slowly heals nearby player.

const HEAL_RADIUS := 3.5
const HEAL_RATE := 1.5

func _process(delta: float) -> void:
	var player := get_tree().get_first_node_in_group("player")
	if player == null or not player.has_method("heal"):
		return
	if global_position.distance_to((player as Node3D).global_position) <= HEAL_RADIUS:
		player.heal(HEAL_RATE * delta)
