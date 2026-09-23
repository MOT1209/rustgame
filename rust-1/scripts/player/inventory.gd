extends Node
## Global inventory (Phase 5+).
## Simple resource storage shared across scenes, with capacity (Backpack raises it).

signal changed

const ITEMS := {
	"wood": "Wood",
	"stone": "Stone",
	"food": "Canned Food",
	"water": "Water",
	"bandage": "Bandage",
	"medkit": "First Aid Kit",
	"cloth": "Cloth",
}

const BASE_CAPACITY := 60
const BACKPACK_CAPACITY := 150

var capacity := BASE_CAPACITY

var _counts := {
	"wood": 0,
	"stone": 0,
	"food": 0,
	"water": 0,
	"bandage": 0,
	"medkit": 0,
	"cloth": 0,
}

func add(item: String, amount: int = 1) -> bool:
	if not _counts.has(item):
		return false
	if total_count() + amount > capacity:
		GameEvents.show_message("Inventory full! Find a Backpack.")
		return false
	_counts[item] += amount
	changed.emit()
	GameEvents.notify_inventory_changed()
	return true

func has(item: String, amount: int = 1) -> bool:
	return _counts.get(item, 0) >= amount

func consume(item: String, amount: int = 1) -> bool:
	if not has(item, amount):
		return false
	_counts[item] -= amount
	changed.emit()
	GameEvents.notify_inventory_changed()
	return true

func count(item: String) -> int:
	return _counts.get(item, 0)

func total_count() -> int:
	var total := 0
	for k in _counts:
		total += _counts[k]
	return total

func grant_backpack() -> void:
	capacity = BACKPACK_CAPACITY
	GameEvents.show_message("Backpack equipped: capacity %d." % capacity)
	GameEvents.notify_inventory_changed()

func reset() -> void:
	for k in _counts:
		_counts[k] = 0
	capacity = BASE_CAPACITY
	changed.emit()
	GameEvents.notify_inventory_changed()
