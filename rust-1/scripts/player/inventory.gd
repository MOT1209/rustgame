extends Node
## Global inventory — the player's bag.
##
## Backed by StorageInventory (the port of js/inventory/storage.js), so the
## stack limits and the known-item rules come from the SHARED seed data
## (res://data/seed/items.json) instead of a hand-written list.
##
## The capacity is a Godot-specific rule on top of it: the player's bag holds
## 60 items (150 with a backpack). Storage boxes use StorageInventory's own
## 12-stack cap instead.

const Storage := preload("res://scripts/core/storage_inventory.gd")
const Crafting := preload("res://scripts/core/crafting.gd")
const Items := preload("res://scripts/core/items.gd")

signal changed

const BASE_CAPACITY := 60
const BACKPACK_CAPACITY := 150

## The prototype used its own item ids; the shared seed data (the same ids
## the JS game and the Unity port use) is the source of truth. These aliases
## keep the old ids working.
const ITEM_ALIASES := {
	"food": "canned_food",
	"medkit": "syringe",
}

var capacity := BASE_CAPACITY

var _inv: StorageInventory


func _ready() -> void:
	_inv = Storage.new([], Items.registry(), 0)


## Maps a legacy id onto the shared one.
func resolve_id(item: String) -> String:
	return ITEM_ALIASES.get(item, item)


func add(item: String, amount: int = 1) -> bool:
	# The backpack is a capacity upgrade, not a stackable item.
	if item == "backpack":
		grant_backpack()
		return true
	var id := resolve_id(item)
	if total_count() + amount > capacity:
		GameEvents.show_message("Inventory full! Find a Backpack.")
		return false
	var added := _inv.add(id, amount)
	if added <= 0:
		return false
	changed.emit()
	GameEvents.notify_inventory_changed()
	return true


func has(item: String, amount: int = 1) -> bool:
	return _inv.has(resolve_id(item), amount)


func consume(item: String, amount: int = 1) -> bool:
	if not _inv.consume(resolve_id(item), amount):
		return false
	changed.emit()
	GameEvents.notify_inventory_changed()
	return true


func count(item: String) -> int:
	return _inv.count(resolve_id(item))


func total_count() -> int:
	return _inv.total()


## Crafts a recipe from the shared recipe data. Returns the craft result
## dictionary (ok / crafted / granted / missing / error).
func craft(recipe_id: String, qty: int = 1) -> Dictionary:
	var recipe := Crafting.get_recipe(recipe_id)
	if recipe.is_empty():
		return {"ok": false, "crafted": 0, "granted": 0, "missing": {}, "error": "unknown recipe"}
	if total_count() + qty > capacity:
		GameEvents.show_message("Inventory full! Find a Backpack.")
		return {"ok": false, "crafted": 0, "granted": 0, "missing": {}, "error": "inventory full"}
	var result := Crafting.craft(recipe, _inv, qty)
	if result["ok"]:
		changed.emit()
		GameEvents.notify_inventory_changed()
	else:
		GameEvents.show_message("Cannot craft: %s" % result.get("error", "?"))
	return result


func grant_backpack() -> void:
	capacity = BACKPACK_CAPACITY
	GameEvents.show_message("Backpack equipped: capacity %d." % capacity)
	GameEvents.notify_inventory_changed()


func reset() -> void:
	_inv = Storage.new([], Items.registry(), 0)
	capacity = BASE_CAPACITY
	changed.emit()
	GameEvents.notify_inventory_changed()
