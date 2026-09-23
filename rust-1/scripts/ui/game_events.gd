extends Node
## Global event bus (Phase 6). Decouples player/world/buildings from HUD.

signal message_shown(text: String)
signal player_health_changed(current: float, max: float)
signal player_hunger_changed(current: float, max: float)
signal build_tier_changed(tier: String)
signal inventory_changed

func show_message(text: String) -> void:
	message_shown.emit(text)

func notify_build_tier(tier: String) -> void:
	build_tier_changed.emit(tier)

func notify_player_health(current: float, max: float) -> void:
	player_health_changed.emit(current, max)

func notify_player_hunger(current: float, max: float) -> void:
	player_hunger_changed.emit(current, max)

func notify_inventory_changed() -> void:
	inventory_changed.emit()