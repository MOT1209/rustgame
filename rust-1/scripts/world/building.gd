extends StaticBody3D
## Building block (Rust-inspired). Tier data scaffold for Phase 4/5.

const TIER_DATA := {
	"Twig": {"health": 10.0, "color": Color(0.82, 0.72, 0.55)},
	"Wood": {"health": 250.0, "color": Color(0.42, 0.32, 0.2)},
	"Stone": {"health": 500.0, "color": Color(0.55, 0.55, 0.58)},
	"Sheet Metal": {"health": 1000.0, "color": Color(0.7, 0.72, 0.78)},
	"Armored": {"health": 2000.0, "color": Color(0.85, 0.88, 0.95)},
}

var tier: String = "Twig"
var health: float = TIER_DATA["Twig"]["health"]
var max_health: float = TIER_DATA["Twig"]["health"]

@onready var mesh_instance: MeshInstance3D = $MeshInstance3D
@onready var tier_label: Label3D = $TierLabel

func _ready() -> void:
	_apply_tier()

func upgrade() -> void:
	var order := TIER_DATA.keys()
	var index := order.find(tier)
	if index >= 0 and index < order.size() - 1:
		tier = order[index + 1]
		_apply_tier()

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