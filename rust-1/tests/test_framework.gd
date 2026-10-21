class_name TestFramework
extends RefCounted
## A tiny assert framework — no external dependency, so the suite runs
## headless in CI with nothing but the Godot binary.
##
## Usage:
##   const T := preload("res://tests/test_framework.gd")
##   T.suite("damage")
##   T.eq(actual, expected, "label")

static var failures: Array[String] = []
static var passed: int = 0
static var total: int = 0
static var current_suite: String = ""


static func suite(name: String) -> void:
	current_suite = name
	print("── ", name)


static func ok(condition: bool, label: String) -> void:
	total += 1
	if condition:
		passed += 1
		print("   PASS  ", label)
	else:
		failures.append("%s / %s" % [current_suite, label])
		print("   FAIL  ", label)


static func eq(actual: Variant, expected: Variant, label: String) -> void:
	var same := false
	var numeric := (typeof(actual) == TYPE_FLOAT or typeof(actual) == TYPE_INT) \
			and (typeof(expected) == TYPE_FLOAT or typeof(expected) == TYPE_INT)
	if numeric:
		same = is_equal_approx(float(actual), float(expected))
	else:
		same = actual == expected
	if same:
		ok(true, label)
	else:
		ok(false, "%s (expected %s, got %s)" % [label, str(expected), str(actual)])


static func approx(actual: float, expected: float, label: String, tolerance: float = 0.0001) -> void:
	if is_equal_approx(actual, expected) or absf(actual - expected) <= tolerance:
		ok(true, label)
	else:
		ok(false, "%s (expected %s, got %s)" % [label, str(expected), str(actual)])


static func report() -> int:
	print("")
	if failures.is_empty():
		print("ALL GREEN — %d/%d assertions passed." % [passed, total])
		return 0
	print("FAILED — %d/%d assertions passed, %d failed:" % [passed, total, failures.size()])
	for f in failures:
		print("   ✗ ", f)
	return 1
