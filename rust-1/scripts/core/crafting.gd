class_name CraftingSystem
extends RefCounted
## Crafting — a port of js/crafting/recipes.js.
## The recipes come from the SHARED seed data (res://data/seed/recipes.json),
## so the costs are the same in the JS game, the Unity port and here.
##
## All-or-nothing: validate first, then consume, then grant. The result must
## have room BEFORE the ingredients are consumed, so a full stack can never
## eat the materials.

const RECIPES_PATH := "res://data/seed/recipes.json"

static var _recipes: Dictionary = {}
static var _loaded := false


static func _ensure_loaded() -> void:
	if _loaded:
		return
	_loaded = true

	var data = null
	if ResourceLoader.exists(RECIPES_PATH):
		var res = load(RECIPES_PATH)
		if res != null:
			data = res.get("data")
	if data == null and FileAccess.file_exists(RECIPES_PATH):
		data = JSON.parse_string(FileAccess.get_file_as_string(RECIPES_PATH))
	if data is Dictionary:
		data = data.get("recipes", [])
	if data is Array:
		for entry in data:
			if entry is Dictionary:
				_recipes[entry.get("id", "")] = entry


static func all_recipes() -> Dictionary:
	_ensure_loaded()
	return _recipes


static func get_recipe(id: String) -> Dictionary:
	_ensure_loaded()
	return _recipes.get(id, {})


## The ingredients of a recipe as { item_id: count }.
static func ingredients_of(recipe: Dictionary) -> Dictionary:
	var out: Dictionary = {}
	var list = recipe.get("ingredients", [])
	if list is Array:
		for entry in list:
			if entry is Dictionary:
				out[entry.get("itemId", "")] = int(entry.get("count", 0))
	return out


## What is still missing for `qty` crafts: { id: still_needed }.
## An empty dictionary means the craft is possible.
static func missing_for(recipe: Dictionary, inv, qty: int = 1) -> Dictionary:
	var missing: Dictionary = {}
	if recipe.is_empty() or inv == null:
		return {"_invalid": 1}
	var qty_clamped: int = maxi(1, qty)
	for id in ingredients_of(recipe):
		var need: int = int(ingredients_of(recipe)[id]) * qty_clamped
		var have: int = inv.count(id)
		if have < need:
			missing[id] = need - have
	return missing


static func can_craft(recipe: Dictionary, inv, qty: int = 1) -> bool:
	return missing_for(recipe, inv, qty).is_empty()


## Performs the craft. Returns { ok, crafted, granted, missing, error }.
static func craft(recipe: Dictionary, inv, qty: int = 1) -> Dictionary:
	if recipe.is_empty() or inv == null:
		return {"ok": false, "crafted": 0, "granted": 0, "missing": {"_invalid": 1}, "error": "no recipe"}

	var missing := missing_for(recipe, inv, qty)
	if not missing.is_empty():
		return {"ok": false, "crafted": 0, "granted": 0, "missing": missing, "error": "missing ingredients"}

	var qty_clamped: int = maxi(1, qty)
	var ingredients := ingredients_of(recipe)
	var result: Dictionary = recipe.get("result", {})
	var result_id: String = result.get("itemId", "")
	var result_count: int = int(result.get("count", 1)) * qty_clamped

	# The result must fit BEFORE the ingredients are consumed.
	if not inv.can_accept(result_id, result_count):
		return {"ok": false, "crafted": 0, "granted": 0, "missing": {}, "error": "no room for %s" % result_id}

	for id in ingredients:
		if not inv.consume(id, int(ingredients[id]) * qty_clamped):
			# Should never happen after validation; abort without granting.
			return {"ok": false, "crafted": 0, "granted": 0,
					"missing": {id: int(ingredients[id]) * qty_clamped}, "error": "consume failed"}

	var granted: int = inv.add(result_id, result_count)
	return {"ok": true, "crafted": qty_clamped, "granted": granted, "missing": {}, "error": ""}
