class_name DamageSystem
extends RefCounted
## Central damage system — a direct port of js/player/damage.ts.
## Every health change goes through here so there is exactly one place to
## hook VFX, sound and analytics.
##
## Pure: the stats object is a Dictionary (the same shape the save uses).

const Config := preload("res://scripts/core/config.gd")

enum Type { GENERIC, FALL, ANIMAL, ENVIRONMENT, HUNGER, THIRST, RADIATION, COLD, BLEEDING }

const TYPE_NAMES := {
	Type.GENERIC: "generic",
	Type.FALL: "fall",
	Type.ANIMAL: "animal",
	Type.ENVIRONMENT: "environment",
	Type.HUNGER: "hunger",
	Type.THIRST: "thirst",
	Type.RADIATION: "radiation",
	Type.COLD: "cold",
	Type.BLEEDING: "bleeding",
}


## Applies damage. Returns the damage actually dealt (0 for invalid input).
static func apply_damage(stats: Dictionary, amount: float, type: int = Type.GENERIC) -> float:
	if stats.is_empty() or not stats.has("health"):
		return 0.0
	if typeof(amount) != TYPE_FLOAT and typeof(amount) != TYPE_INT:
		return 0.0
	if not is_finite(amount) or amount <= 0.0:
		return 0.0

	var before: float = float(stats["health"])
	var after: float = maxf(0.0, before - float(amount))
	stats["health"] = after
	stats["last_damage_type"] = type
	stats["last_damage_at"] = Time.get_ticks_msec()
	return before - after


## Heals the stats. Never exceeds max health. Returns the amount healed.
static func heal(stats: Dictionary, amount: float) -> float:
	if stats.is_empty() or not stats.has("health"):
		return 0.0
	if typeof(amount) != TYPE_FLOAT and typeof(amount) != TYPE_INT:
		return 0.0
	if not is_finite(amount) or amount <= 0.0:
		return 0.0

	var maximum: float = float(stats.get("max_health", Config.MAX_HEALTH))
	var before: float = float(stats["health"])
	stats["health"] = minf(maximum, before + float(amount))
	return float(stats["health"]) - before


static func is_dead(stats: Dictionary) -> bool:
	if stats.is_empty() or not stats.has("health"):
		return false
	return float(stats["health"]) <= 0.0
