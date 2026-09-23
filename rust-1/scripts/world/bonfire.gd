extends StaticBody3D
## Placeable bonfire (Phase 4+). Warm light with flicker, heals nearby player.

const HEAL_RADIUS := 4.0
const HEAL_RATE := 3.0

var _time := 0.0
var _light: OmniLight3D

func _ready() -> void:
	_light = $BonfireLight

func _process(delta: float) -> void:
	_time += delta
	if _light:
		_light.light_energy = 2.0 + 0.5 * sin(_time * 9.0) + 0.25 * sin(_time * 23.0)
	var player := get_tree().get_first_node_in_group("player")
	if player == null or not player.has_method("heal"):
		return
	if global_position.distance_to((player as Node3D).global_position) <= HEAL_RADIUS:
		player.heal(HEAL_RATE * delta)
