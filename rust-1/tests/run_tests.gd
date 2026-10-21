extends SceneTree
## Headless test runner for the Godot port.
##
##   godot --headless --script tests/run_tests.gd
##
## Exits 0 when everything is green, 1 otherwise — so CI can gate on it.

const T := preload("res://tests/test_framework.gd")

const SUITES := [
	preload("res://tests/test_damage.gd"),
	preload("res://tests/test_survival.gd"),
	preload("res://tests/test_stamina.gd"),
	preload("res://tests/test_inventory_crafting.gd"),
]


func _initialize() -> void:
	print("RUSTGAME — Godot test run")
	print("")
	for suite in SUITES:
		suite.run_all()
	quit(T.report())
