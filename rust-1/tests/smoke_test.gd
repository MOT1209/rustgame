extends SceneTree
## Headless smoke test: exercises gather, upgrade, pickup, consumables, build costs.

var _frame := 0
var _world = null
var _player = null
var _inv = null
var _phase := 0
var _failures: PackedStringArray = []

func _initialize() -> void:
	_inv = root.get_node("Inventory")
	var packed: PackedScene = load("res://scenes/world/world.tscn")
	_world = packed.instantiate()
	root.add_child(_world)
	_player = _world.get_node("Player")

func _check(cond: bool, label: String) -> void:
	if cond:
		print("PASS: ", label)
	else:
		_failures.append(label)
		print("FAIL: ", label)

func _process(_delta: float) -> bool:
	_frame += 1
	if _frame == 30:
		_phase_gather()
	elif _frame == 40:
		_phase_upgrade()
	elif _frame == 50:
		_phase_pickup_teleport()
	elif _frame == 60:
		_phase_pickup_check()
	elif _frame == 70:
		_phase_consumables()
		_phase_build_costs()
		_finish()
		return true
	return false

func _phase_gather() -> void:
	_inv.reset()
	var node = _find_resource()
	_check(node != null, "resource node exists")
	if node == null:
		return
	var before: int = _inv.count("wood") + _inv.count("stone")
	var drops: Dictionary = node.gather(2)
	for item in drops:
		_inv.add(item, int(drops[item]))
	var after: int = _inv.count("wood") + _inv.count("stone")
	_check(after > before, "gather adds resources (before=%d after=%d)" % [before, after])

func _phase_upgrade() -> void:
	_inv.reset()
	_inv.add("wood", 30)
	_inv.add("stone", 30)
	var b = load("res://scenes/world/building.tscn").instantiate()
	_world.add_child(b)
	_check(b.tier == "Twig", "new building is Twig")
	var ok: bool = b.upgrade()
	_check(ok and b.tier == "Wood", "upgrade Twig->Wood with cost")
	_check(_inv.count("wood") == 10, "upgrade consumed 20 wood (have %d)" % _inv.count("wood"))
	_inv.reset()
	var ok2: bool = b.upgrade()
	_check(not ok2 and b.tier == "Wood", "upgrade blocked without resources")
	b.queue_free()

func _phase_pickup_teleport() -> void:
	var pickup = _find_pickup()
	_check(pickup != null, "pickup exists in world")
	if pickup:
		_player.global_position = pickup.global_position

func _phase_pickup_check() -> void:
	var total: int = _inv.total_count()
	_check(total > 0, "pickup collected on proximity (total=%d)" % total)
	_player.global_position = Vector3(0, 5, 0)

func _phase_consumables() -> void:
	_inv.reset()
	_inv.add("food", 2)
	_inv.add("water", 1)
	_inv.add("bandage", 1)
	_player.hunger = 10.0
	_player._eat_food()
	_check(_player.hunger > 30.0, "eat restores hunger (%.1f)" % _player.hunger)
	_player.health = 40.0
	_player._use_heal()
	_check(_player.health > 60.0, "bandage heals (%.1f)" % _player.health)
	var h_before: float = _player.hunger
	_player._drink_water()
	_check(_player.hunger > h_before, "drink restores hunger")
	_player.take_damage(5.0)
	_check(_player.health < 100.0, "damage applies")

func _phase_build_costs() -> void:
	_inv.reset()
	_inv.add("wood", 9)
	_check(not _player._can_afford({"wood": 10}), "cannot afford wall with 9 wood")
	_inv.add("wood", 5)
	_check(_player._can_afford({"wood": 10}), "can afford wall with 14 wood")
	_check(_player._can_afford({"wood": 30, "stone": 10}) == false, "bonfire needs stone too")

func _find_resource():
	for child in _world.get_children():
		if child.has_method("gather"):
			return child
	return null

func _find_pickup():
	for child in _world.get_children():
		if child.get_script() != null and (child as Node).get_script().resource_path.ends_with("pickup.gd"):
			return child
	return null

func _finish() -> void:
	if _failures.is_empty():
		print("SMOKE_RESULT: ALL_PASS")
	else:
		print("SMOKE_RESULT: FAILURES=%d" % _failures.size())
