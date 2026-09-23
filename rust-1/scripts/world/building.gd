extends StaticBody3D
## Building block (Rust-inspired). Tier data scaffold for Phase 4/5.

const TIER_DATA := {
	"Twig": {"health": 10.0, "color": Color(0.82, 0.72, 0.55)},
	"Wood": {"health": 250.0, "color": Color(0.42, 0.32, 0.2)},
	"Stone": {"health": 500.0, "color": Color(0.55, 0.55, 0.58)},
	"Sheet Metal": {"health": 1000.0, "color": Color(0.7, 0.72, 0.78)},
	"Armored": {"health": 2000.0, "color": Color(0.85, 0.88, 0.95)},
}

const UPGRADE_COSTS := {
	"Wood": {"wood": 20},
	"Stone": {"wood": 10, "stone": 30},
	"Sheet Metal": {"stone": 40, "wood": 20},
	"Armored": {"stone": 80, "wood": 40},
}

var tier: String = "Twig"
var health: float = TIER_DATA["Twig"]["health"]
var max_health: float = TIER_DATA["Twig"]["health"]

@onready var mesh_instance: MeshInstance3D = $MeshInstance3D
@onready var tier_label: Label3D = $TierLabel

func _ready() -> void:
	_apply_tier()

func next_tier() -> String:
	var order := TIER_DATA.keys()
	var index := order.find(tier)
	if index >= 0 and index < order.size() - 1:
		return order[index + 1]
	return ""

func upgrade() -> bool:
	var target := next_tier()
	if target.is_empty():
		GameEvents.show_message("Already max tier.")
		return false
	var cost: Dictionary = UPGRADE_COSTS.get(target, {})
	for item in cost:
		if not Inventory.has(item, cost[item]):
			GameEvents.show_message("Need %d %s to upgrade." % [cost[item], item])
			return false
	for item in cost:
		Inventory.consume(item, cost[item])
	tier = target
	_apply_tier()
	GameEvents.show_message("Upgraded to %s." % tier)
	return true

func _apply_tier() -> void:
	health = TIER_DATA[tier]["health"]
	max_health = health
	var mat := StandardMaterial3D.new()
	mat.albedo_color = TIER_DATA[tier]["color"]
	mesh_instance.material_override = mat
	tier_label.text = tier

func take_damage(amount: float) -> void:
	health -= amount
	if health <= 0.0:
		queue_free()