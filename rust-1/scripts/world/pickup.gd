extends Node3D
## World pickup (Phase 5+). Shows a pack GLB model, bobs/spins,
## and is collected by walking close. Backpack raises capacity instead.

const ITEM_MODELS := {
	"food": "res://assets/models/pack/Can.glb",
	"water": "res://assets/models/pack/WaterBottle_1.glb",
	"bandage": "res://assets/models/pack/Bandages.glb",
	"medkit": "res://assets/models/pack/FirstAidKit.glb",
	"backpack": "res://assets/models/pack/Backpack.glb",
	"wood": "res://assets/models/pack/WoodLog.glb",
}

const ITEM_NAMES := {
	"food": "Canned Food",
	"water": "Water Bottle",
	"bandage": "Bandage",
	"medkit": "First Aid Kit",
	"backpack": "Backpack",
	"wood": "Wood Log",
}

const COLLECT_RADIUS := 1.8
const BOB_SPEED := 2.0
const BOB_HEIGHT := 0.15
const SPIN_SPEED := 1.2

@export var item_id := "food"
@export var amount := 1

var _base_y := 0.0
var _time := 0.0
var _model_holder: Node3D

func _ready() -> void:
	_base_y = position.y
	_model_holder = Node3D.new()
	_model_holder.name = "ModelHolder"
	add_child(_model_holder)
	if ITEM_MODELS.has(item_id):
		var packed: PackedScene = load(ITEM_MODELS[item_id])
		if packed:
			var model: Node3D = packed.instantiate()
			model.position.y = 0.5
			_model_holder.add_child(model)

func _process(delta: float) -> void:
	_time += delta
	_model_holder.position.y = BOB_HEIGHT * (0.5 + 0.5 * sin(_time * BOB_SPEED))
	_model_holder.rotation.y += SPIN_SPEED * delta
	_try_collect()

func _try_collect() -> void:
	var player := get_tree().get_first_node_in_group("player") as Node3D
	if player == null:
		return
	if global_position.distance_to(player.global_position) > COLLECT_RADIUS:
		return
	if item_id == "backpack":
		Inventory.grant_backpack()
		GameEvents.show_message("Picked up Backpack.")
		queue_free()
		return
	if Inventory.add(item_id, amount):
		GameEvents.show_message("Picked up %s." % ITEM_NAMES.get(item_id, item_id))
		queue_free()
