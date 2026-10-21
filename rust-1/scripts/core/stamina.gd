class_name StaminaSystem
extends RefCounted
## Stamina — a direct port of js/player/stamina.ts.
## Pure functions over the stats Dictionary.

const Config := preload("res://scripts/core/config.gd")


static func clamp_stamina(stats: Dictionary) -> float:
	if not stats.has("stamina"):
		stats["stamina"] = Config.STAMINA_START
		return Config.STAMINA_START
	var value := float(stats["stamina"])
	if not is_finite(value):
		value = Config.STAMINA_START
	value = clampf(value, 0.0, Config.MAX_STAMINA)
	stats["stamina"] = value
	return value


static func can_sprint(stats: Dictionary) -> bool:
	return clamp_stamina(stats) >= Config.MINIMUM_SPRINT_STAMINA


static func drain_sprint(stats: Dictionary, dt: float) -> float:
	var value := clamp_stamina(stats)
	value = maxf(0.0, value - Config.SPRINT_DRAIN * dt)
	stats["stamina"] = value
	return value


static func drain_jump(stats: Dictionary) -> float:
	var value := clamp_stamina(stats)
	value = maxf(0.0, value - Config.JUMP_DRAIN)
	stats["stamina"] = value
	return value


static func drain_gather(stats: Dictionary) -> float:
	var value := clamp_stamina(stats)
	value = maxf(0.0, value - Config.GATHER_DRAIN)
	stats["stamina"] = value
	return value


static func regen(stats: Dictionary, dt: float, freezing: bool = false) -> float:
	var value := clamp_stamina(stats)
	var rate := Config.REGEN_RATE_COLD if freezing else Config.REGEN_RATE
	value = minf(Config.MAX_STAMINA, value + rate * dt)
	stats["stamina"] = value
	return value


## The full per-frame update. `intent` = { want_sprint, did_jump, did_gather, freezing }.
## Returns { sprinting } after enforcing the lockout.
static func update(stats: Dictionary, dt: float, intent: Dictionary = {}) -> Dictionary:
	var want_sprint: bool = bool(intent.get("want_sprint", false))
	var sprinting := want_sprint and can_sprint(stats)
	if sprinting:
		drain_sprint(stats, dt)
	else:
		regen(stats, dt, bool(intent.get("freezing", false)))
	if intent.get("did_jump", false):
		drain_jump(stats)
	if intent.get("did_gather", false):
		drain_gather(stats)
	if float(stats["stamina"]) <= 0.0:
		sprinting = false
	return {"sprinting": sprinting}
