class_name StorageInventory
extends RefCounted
## Storage inventory — a direct port of js/inventory/storage.js.
## Invariants: no negative counts, no unknown items (when a registry is
## supplied), stack limits respected, and an optional cap on the number of
## distinct stacks (the 12-slot storage box).
##
## Pure: no Node, no scene.

const Items := preload("res://scripts/core/items.gd")

## items: Array of { id: String, count: int }
var items: Array = []
## Known item ids (Dictionary). Null = legacy mode: any id is accepted.
var registry = null
## Max number of distinct item stacks (0 = unlimited).
var max_slots: int = 0


func _init(initial: Array = [], known_items = null, slot_limit: int = 0) -> void:
	registry = known_items
	max_slots = int(floor(slot_limit)) if slot_limit > 0 else 0
	for entry in initial:
		if entry is Dictionary:
			add(entry.get("id", ""), int(entry.get("count", 0)))


func _known(id: String) -> bool:
	if id.is_empty():
		return false
	if registry == null:
		return true
	return registry.has(id)


func count(id: String) -> int:
	for item in items:
		if item["id"] == id:
			return int(item["count"])
	return 0


func has(id: String, amount: int = 1) -> bool:
	if amount <= 0:
		return false
	return count(id) >= amount


## True when the whole amount would fit — either into the existing stack (up
## to its limit) or into a free slot. Callers check this BEFORE consuming
## ingredients, so a full stack can never eat the materials.
func can_accept(id: String, amount: int) -> bool:
	if id.is_empty() or amount <= 0:
		return false
	var limit := Items.get_stack_limit(id)
	var index := -1
	for i in range(items.size()):
		if items[i]["id"] == id:
			index = i
			break
	if index >= 0:
		return int(items[index]["count"]) + amount <= limit
	if max_slots > 0 and items.size() >= max_slots:
		return false
	return amount <= limit


## Adds items. Returns the amount actually added (a full stack or a full
## slot list can clamp it to 0).
func add(id: String, amount: int = 1) -> int:
	if not _known(id):
		return 0
	if amount <= 0:
		return 0

	var limit := Items.get_stack_limit(id)
	var index := -1
	for i in range(items.size()):
		if items[i]["id"] == id:
			index = i
			break

	# A brand-new item id is rejected once all slots are taken (existing
	# stacks may still grow).
	if index == -1 and max_slots > 0 and items.size() >= max_slots:
		return 0

	var current := int(items[index]["count"]) if index >= 0 else 0
	var room := maxi(0, limit - current)
	var actual := mini(room, amount)
	if actual <= 0:
		return 0

	if index >= 0:
		items[index]["count"] = current + actual
	else:
		items.append({"id": id, "count": actual})
	return actual


## Removes items. Returns the amount actually removed. Never negative.
func remove(id: String, amount: int = 1) -> int:
	if amount <= 0:
		return 0
	var index := -1
	for i in range(items.size()):
		if items[i]["id"] == id:
			index = i
			break
	if index == -1:
		return 0

	var actual := mini(int(items[index]["count"]), amount)
	var remaining := int(items[index]["count"]) - actual
	if remaining <= 0:
		items.remove_at(index)
	else:
		items[index]["count"] = remaining
	return actual


## Consume = remove, but all-or-nothing. Returns true on success.
func consume(id: String, amount: int = 1) -> bool:
	if not has(id, amount):
		return false
	remove(id, amount)
	return true


## Moves items to another inventory. Anything the destination cannot take
## comes back — items are never lost. Returns the amount moved.
func transfer_to(other: StorageInventory, id: String, amount: int = 1) -> int:
	if other == null:
		return 0
	var removed := remove(id, amount)
	if removed <= 0:
		return 0
	var added := other.add(id, removed)
	if added < removed:
		add(id, removed - added)
	return added


func total() -> int:
	var sum := 0
	for item in items:
		sum += int(item["count"])
	return sum


func to_array() -> Array:
	var out: Array = []
	for item in items:
		out.append({"id": item["id"], "count": int(item["count"])})
	return out


static func from_array(data: Array, known_items = null, slot_limit: int = 0) -> StorageInventory:
	var inv := StorageInventory.new([], known_items, slot_limit)
	if data is Array:
		for entry in data:
			if entry is Dictionary and typeof(entry.get("id", "")) == TYPE_STRING:
				inv.add(entry["id"], int(entry.get("count", 0)))
	return inv
