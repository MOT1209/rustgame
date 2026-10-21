extends RefCounted
## Tests for the central damage system (port of js/player/damage.ts).

const T := preload("res://tests/test_framework.gd")
const Damage := preload("res://scripts/core/damage.gd")


static func run_all() -> void:
	T.suite("damage")

	# --- apply_damage ---
	var stats := {"health": 100.0, "max_health": 100.0}
	T.eq(Damage.apply_damage(stats, 30.0, Damage.Type.ANIMAL), 30.0, "applies the damage")
	T.eq(stats["health"], 70.0, "lowers the health")
	T.eq(stats["last_damage_type"], Damage.Type.ANIMAL, "records the damage type")

	T.eq(Damage.apply_damage(stats, 0.0), 0.0, "ignores zero damage")
	T.eq(Damage.apply_damage(stats, -5.0), 0.0, "ignores negative damage")
	T.eq(stats["health"], 70.0, "the health is untouched by invalid damage")
	T.eq(Damage.apply_damage({}, 10.0), 0.0, "ignores empty stats")

	# Never below zero.
	var low := {"health": 10.0, "max_health": 100.0}
	T.eq(Damage.apply_damage(low, 999.0), 10.0, "never goes below zero health")
	T.eq(low["health"], 0.0, "clamps the health at zero")

	# --- heal ---
	var hurt := {"health": 40.0, "max_health": 100.0}
	T.eq(Damage.heal(hurt, 25.0), 25.0, "heals the reported amount")
	T.eq(hurt["health"], 65.0, "raises the health")
	T.eq(Damage.heal(hurt, 999.0), 35.0, "never heals past the maximum")
	T.eq(hurt["health"], 100.0, "clamps at max health")
	T.eq(Damage.heal(hurt, 0.0), 0.0, "ignores zero healing")
	T.eq(Damage.heal(hurt, -5.0), 0.0, "ignores negative healing")

	# --- is_dead ---
	T.ok(not Damage.is_dead({"health": 1.0}), "1 HP is not dead")
	T.ok(Damage.is_dead({"health": 0.0}), "0 HP is dead")
	T.ok(not Damage.is_dead({}), "empty stats are not dead")
