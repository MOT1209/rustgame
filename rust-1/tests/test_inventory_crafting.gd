extends RefCounted
## Tests for the storage inventory (port of js/inventory/storage.js) and the
## crafting rules (port of js/crafting/recipes.js).

const T := preload("res://tests/test_framework.gd")
const Inv := preload("res://scripts/core/storage_inventory.gd")
const Crafting := preload("res://scripts/core/crafting.gd")
const Items := preload("res://scripts/core/items.gd")


static func run_all() -> void:
	T.suite("storage inventory")

	var inv := Inv.new()

	# --- add / count ---
	T.eq(inv.add("wood", 12), 12, "adds the items")
	T.eq(inv.count("wood"), 12, "counts them")
	T.eq(inv.count("stone"), 0, "an unknown stack counts zero")

	# --- unknown items ---
	var known := Inv.new([], {"wood": true})
	T.eq(known.add("gold", 1), 0, "rejects an unknown item")
	T.eq(known.count("gold"), 0, "the unknown item was not stored")

	# --- invalid amounts ---
	T.eq(inv.add("wood", 0), 0, "ignores zero")
	T.eq(inv.add("wood", -5), 0, "ignores a negative amount")
	T.eq(inv.count("wood"), 12, "the stack is untouched by invalid adds")

	# --- the stack limit ---
	var limited := Inv.new()
	var limit := Items.get_stack_limit("berry")
	T.eq(limited.add("berry", limit + 50), limit, "the stack limit is respected")
	T.eq(limited.add("berry", 1), 0, "a full stack takes nothing more")

	# --- remove / consume ---
	var rm := Inv.new()
	rm.add("wood", 10)
	T.eq(rm.remove("wood", 4), 4, "removes the requested amount")
	T.eq(rm.count("wood"), 6, "the count drops")
	T.eq(rm.remove("wood", 99), 6, "removal is clamped to what is there")
	T.eq(rm.count("wood"), 0, "the stack is gone")
	T.eq(rm.remove("wood", 1), 0, "removing from nothing yields nothing")

	rm.add("stone", 3)
	T.ok(not rm.consume("stone", 4), "consume is all-or-nothing")
	T.eq(rm.count("stone"), 3, "a failed consume takes nothing")
	T.ok(rm.consume("stone", 3), "consume succeeds when there is enough")
	T.eq(rm.count("stone"), 0, "the consumed items are gone")

	# --- the slot cap (the 12-stack storage box) ---
	var box := Inv.new([], null, 12)
	T.eq(box.add("wood", 1), 1, "the first stack fits")
	T.eq(box.add("stone", 1), 1, "the second stack fits")
	T.eq(box.add("wood", 5), 5, "an existing stack may still grow")
	T.eq(box.total(), 7, "the total counts every stack")

	# --- can_accept ---
	var cap := Inv.new([], null, 1)
	T.ok(cap.can_accept("wood", 10), "a free slot accepts a stack")
	cap.add("stone", 1)
	T.ok(not cap.can_accept("wood", 1), "a full slot list refuses a new id")
	T.ok(not cap.can_accept("wood", 0), "zero never fits")

	# --- transfer ---
	var source := Inv.new()
	var target := Inv.new()
	source.add("wood", 5)
	T.eq(source.transfer_to(target, "wood", 5), 5, "moves the items")
	T.eq(target.count("wood"), 5, "the target has them")
	T.eq(source.count("wood"), 0, "the source is empty")

	# A destination that cannot take everything returns the remainder.
	var full := Inv.new([], null, 1)
	full.add("stone", 1)
	var from := Inv.new()
	from.add("wood", 5)
	T.eq(from.transfer_to(full, "wood", 5), 0, "nothing moves into a full list")
	T.eq(from.count("wood"), 5, "the items came back to the source")

	# --- crafting ---
	T.suite("crafting")

	var recipe := Crafting.get_recipe("stone_axe")
	T.ok(not recipe.is_empty(), "the seeded recipes are loaded")
	T.eq(Crafting.ingredients_of(recipe).get("wood", 0), 200, "the recipe reads the shared data")

	var bag := Inv.new()
	T.ok(not Crafting.can_craft(recipe, bag), "cannot craft without materials")
	T.eq(Crafting.missing_for(recipe, bag).get("wood", 0), 200, "the missing amount is reported")

	bag.add("wood", 200)
	bag.add("stone", 100)
	T.ok(Crafting.can_craft(recipe, bag), "can craft with the materials")

	var result := Crafting.craft(recipe, bag)
	T.ok(result["ok"], "the craft succeeds")
	T.eq(result["crafted"], 1, "one item was crafted")
	T.eq(result["granted"], 1, "one item was granted")
	T.eq(bag.count("wood"), 0, "the wood was consumed")
	T.eq(bag.count("stone_hatchet"), 1, "the hatchet is in the bag")

	# A craft that cannot fit its result must not eat the ingredients.
	var tiny := Inv.new()
	tiny.add("wood", 200)
	tiny.add("stone", 100)
	tiny.add("stone_hatchet", Items.get_stack_limit("stone_hatchet"))
	var blocked := Crafting.craft(recipe, tiny)
	T.ok(not blocked["ok"], "a full result stack blocks the craft")
	T.eq(tiny.count("wood"), 200, "the materials are untouched")
