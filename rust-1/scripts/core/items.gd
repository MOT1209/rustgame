class_name GameItems
extends RefCounted
## The item registry — loaded from the SHARED seed data, so the JS game,
## the Unity port and this Godot port can never drift apart.
##
## Source: res://data/seed/items.json + consumables.json
## (copies of unity/RustgameUnity/Assets/_Project/Data/Seed/*.json — a CI
## check keeps the copies byte-identical).

const ITEMS_PATH := "res://data/seed/items.json"
const CONSUMABLES_PATH := "res://data/seed/consumables.json"

static var _items: Dictionary = {}
static var _consumables: Dictionary = {}
static var _loaded := false


static func _load_json(path: String, key: String) -> Variant:
	var data = null
	# 1) the imported resource (works in an exported build)
	if ResourceLoader.exists(path):
		var res = load(path)
		if res != null:
			data = res.get("data")
	# 2) the raw file (works in the editor / headless script runs)
	if data == null and FileAccess.file_exists(path):
		data = JSON.parse_string(FileAccess.get_file_as_string(path))
	if data is Dictionary:
		return data.get(key, [])
	return null


static func _ensure_loaded() -> void:
	if _loaded:
		return
	_loaded = true

	var items_data = _load_json(ITEMS_PATH, "items")
	if items_data is Array:
		for entry in items_data:
			if entry is Dictionary:
				_items[entry.get("id", "")] = entry

	var consumables_data = _load_json(CONSUMABLES_PATH, "consumables")
	if consumables_data is Array:
		for entry in consumables_data:
			if entry is Dictionary:
				_consumables[entry.get("itemId", "")] = entry


## The known item ids (a Dictionary keyed by id) — pass it to StorageInventory
## so unknown items are rejected.
static func registry() -> Dictionary:
	_ensure_loaded()
	return _items


static func get_item(id: String) -> Dictionary:
	_ensure_loaded()
	return _items.get(id, {})


static func is_known_item(id: String) -> bool:
	_ensure_loaded()
	return _items.has(id)


## The stack limit for an item (999 when unknown).
static func get_stack_limit(id: String) -> int:
	_ensure_loaded()
	var item: Dictionary = _items.get(id, {})
	if item.has("stackLimit"):
		return int(item["stackLimit"])
	return 999


## The food/medical definition for an item (empty when it is not consumable).
static func get_food_def(id: String) -> Dictionary:
	_ensure_loaded()
	return _consumables.get(id, {})


## Seconds before the item rots. 0 = never spoils.
static func get_spoil_seconds(id: String) -> float:
	var def := get_food_def(id)
	if def.has("spoilTimeSeconds"):
		return float(def["spoilTimeSeconds"])
	return 0.0


static func display_name(id: String) -> String:
	var item := get_item(id)
	if item.has("displayName"):
		return item["displayName"]
	return id
