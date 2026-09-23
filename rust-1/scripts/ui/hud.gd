extends CanvasLayer
## HUD (Phase 6). Health/hunger bars, resource counts, build bar,
## messages, crosshair and inventory panel. Driven by GameEvents.

var _message_time := 0.0

@onready var health_bar: ProgressBar = $StatsPanel/HealthBar
@onready var hunger_bar: ProgressBar = $StatsPanel/HungerBar
@onready var counts_label: Label = $StatsPanel/CountsLabel
@onready var message_label: Label = $MessageLabel
@onready var slot_labels: Array = [
	$BuildBar/Slot1,
	$BuildBar/Slot2,
	$BuildBar/Slot3,
]
@onready var inventory_panel: PanelContainer = $InventoryPanel
@onready var inventory_label: Label = $InventoryPanel/InventoryLabel

func _ready() -> void:
	_style_bar(health_bar, Color(0.8, 0.2, 0.2))
	_style_bar(hunger_bar, Color(0.9, 0.6, 0.15))
	GameEvents.message_shown.connect(_on_message)
	GameEvents.player_health_changed.connect(_on_health)
	GameEvents.player_hunger_changed.connect(_on_hunger)
	GameEvents.build_tier_changed.connect(_on_build_tier)
	GameEvents.inventory_changed.connect(_refresh_counts)
	Inventory.changed.connect(_refresh_counts)
	_refresh_counts()
	_on_build_tier("Wall")

func _style_bar(bar: ProgressBar, color: Color) -> void:
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.6)
	bg.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("background", bg)
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("fill", fill)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("inventory"):
		inventory_panel.visible = not inventory_panel.visible
		if inventory_panel.visible:
			_refresh_inventory_panel()
		event.accept()

func _process(delta: float) -> void:
	if _message_time > 0.0:
		_message_time -= delta
		if _message_time <= 0.0:
			message_label.modulate.a = 0.0

func _on_message(text: String) -> void:
	message_label.text = text
	message_label.modulate.a = 1.0
	_message_time = 3.0

func _on_health(current: float, maximum: float) -> void:
	health_bar.max_value = maximum
	health_bar.value = current

func _on_hunger(current: float, maximum: float) -> void:
	hunger_bar.max_value = maximum
	hunger_bar.value = current

func _on_build_tier(tier: String) -> void:
	var names := ["Wall", "Tent", "Bonfire"]
	for i in slot_labels.size():
		var label: Label = slot_labels[i]
		if names[i] == tier:
			label.modulate = Color(1, 1, 0.4)
		else:
			label.modulate = Color(1, 1, 1, 0.75)

func _refresh_counts() -> void:
	counts_label.text = "Wood %d   Stone %d   Food %d   Water %d   Bandage %d   Medkit %d   (%d/%d)" % [
		Inventory.count("wood"), Inventory.count("stone"),
		Inventory.count("food"), Inventory.count("water"),
		Inventory.count("bandage"), Inventory.count("medkit"),
		Inventory.total_count(), Inventory.capacity,
	]
	if inventory_panel.visible:
		_refresh_inventory_panel()

func _refresh_inventory_panel() -> void:
	var lines: PackedStringArray = []
	for key in Inventory.ITEMS:
		lines.append("%s: %d" % [Inventory.ITEMS[key], Inventory.count(key)])
	lines.append("Capacity: %d/%d" % [Inventory.total_count(), Inventory.capacity])
	inventory_label.text = "\n".join(lines)
