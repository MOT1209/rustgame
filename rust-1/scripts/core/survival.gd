class_name SurvivalSystem
extends RefCounted
## Central survival system — a direct port of js/player/survival.ts.
## One tick() drives hunger, thirst, temperature, radiation, bleeding and
## natural regen. Every HP change goes through DamageSystem.
##
## Pure: `stats` is a Dictionary, `env` is a Dictionary of flags.

const Config := preload("res://scripts/core/config.gd")
const Damage := preload("res://scripts/core/damage.gd")

const STATE_NORMAL := "normal"
const STATE_HUNGRY := "hungry"
const STATE_STARVING := "starving"
const STATE_CRITICAL := "critical"
const STATE_THIRSTY := "thirsty"
const STATE_DEHYDRATED := "dehydrated"


static func hunger_state(value: float) -> String:
	if value <= 0.0:
		return STATE_CRITICAL
	if value > Config.HUNGER_NORMAL:
		return STATE_NORMAL
	if value > Config.HUNGER_HUNGRY:
		return STATE_HUNGRY
	return STATE_STARVING


static func thirst_state(value: float) -> String:
	if value <= 0.0:
		return STATE_CRITICAL
	if value > Config.THIRST_NORMAL:
		return STATE_NORMAL
	if value > Config.THIRST_THIRSTY:
		return STATE_THIRSTY
	return STATE_DEHYDRATED


static func _num(value, fallback: float) -> float:
	if (typeof(value) == TYPE_FLOAT or typeof(value) == TYPE_INT) and is_finite(float(value)):
		return float(value)
	return fallback


## Ensures every stat field exists and is clamped (save-migration friendly).
static func normalize(stats: Dictionary) -> Dictionary:
	stats["health"] = _num(stats.get("health"), Config.MAX_HEALTH)
	stats["hunger"] = _num(stats.get("hunger"), Config.HUNGER_START)
	stats["thirst"] = _num(stats.get("thirst"), Config.THIRST_START)
	stats["stamina"] = _num(stats.get("stamina"), Config.STAMINA_START)
	stats["temperature"] = _num(stats.get("temperature"), Config.TEMP_START)
	stats["radiation"] = _num(stats.get("radiation"), 0.0)
	stats["bleeding"] = _num(stats.get("bleeding"), 0.0)
	stats["max_health"] = _num(stats.get("max_health"), Config.MAX_HEALTH)

	stats["health"] = clampf(float(stats["health"]), 0.0, float(stats["max_health"]))
	stats["hunger"] = clampf(float(stats["hunger"]), 0.0, Config.MAX_HUNGER)
	stats["thirst"] = clampf(float(stats["thirst"]), 0.0, Config.MAX_THIRST)
	stats["stamina"] = clampf(float(stats["stamina"]), 0.0, Config.MAX_STAMINA)
	stats["temperature"] = clampf(float(stats["temperature"]), 0.0, Config.MAX_TEMPERATURE)
	stats["radiation"] = clampf(float(stats["radiation"]), 0.0, Config.MAX_RADIATION)
	return stats


## Advances the simulation by `dt` seconds.
## env: { sprinting, in_radiation, is_night, is_raining, near_fire, in_water }
## Returns { events, hunger_state, thirst_state, freezing }.
static func tick(stats: Dictionary, dt: float, env: Dictionary = {}) -> Dictionary:
	normalize(stats)
	if not (dt > 0.0):
		dt = 0.0

	var events: Array = []
	var prev_hunger := hunger_state(float(stats["hunger"]))
	var prev_thirst := thirst_state(float(stats["thirst"]))

	# ---- Hunger drain ----
	var hunger_rate := Config.HUNGER_DRAIN
	if env.get("sprinting", false):
		hunger_rate = Config.HUNGER_DRAIN_SPRINT
	var freezing: bool = float(stats["temperature"]) <= Config.FREEZING_THRESHOLD
	if freezing:
		hunger_rate = maxf(hunger_rate, Config.HUNGER_DRAIN_COLD)
	stats["hunger"] = maxf(0.0, float(stats["hunger"]) - hunger_rate * dt)

	# ---- Thirst drain (faster than hunger) ----
	var thirst_rate := Config.THIRST_DRAIN_SPRINT if env.get("sprinting", false) else Config.THIRST_DRAIN
	stats["thirst"] = maxf(0.0, float(stats["thirst"]) - thirst_rate * dt)

	# ---- Temperature ----
	if env.get("near_fire", false):
		stats["temperature"] = minf(Config.MAX_TEMPERATURE, float(stats["temperature"]) + Config.CAMPFIRE_WARM_RATE * dt)
	elif env.get("is_raining", false):
		stats["temperature"] = maxf(0.0, float(stats["temperature"]) - Config.TEMP_RAIN_DRAIN * dt)
	elif env.get("is_night", false):
		stats["temperature"] = maxf(0.0, float(stats["temperature"]) - Config.TEMP_NIGHT_DRAIN * dt)
	else:
		stats["temperature"] = minf(Config.MAX_TEMPERATURE, float(stats["temperature"]) + Config.TEMP_DAY_RATE * dt)
	if env.get("in_water", false):
		stats["temperature"] = maxf(0.0, float(stats["temperature"]) - Config.TEMP_COLD_WATER_DRAIN * dt)

	# ---- Radiation ----
	if env.get("in_radiation", false):
		stats["radiation"] = minf(Config.MAX_RADIATION, float(stats["radiation"]) + Config.RAD_GAIN_IN_ZONE * dt)
	else:
		stats["radiation"] = maxf(0.0, float(stats["radiation"]) - Config.RAD_DECAY * dt)

	# ---- Damage sources (centralized) ----
	if float(stats["hunger"]) <= 0.0:
		Damage.apply_damage(stats, Config.STARVATION_DAMAGE * dt, Damage.Type.HUNGER)
	if float(stats["thirst"]) <= 0.0:
		Damage.apply_damage(stats, Config.DEHYDRATION_DAMAGE * dt, Damage.Type.THIRST)
	if float(stats["radiation"]) >= Config.RAD_LETHAL_AT:
		Damage.apply_damage(stats, Config.RAD_DAMAGE * dt, Damage.Type.RADIATION)
	if float(stats["temperature"]) <= Config.CRITICAL_THRESHOLD:
		Damage.apply_damage(stats, Config.FREEZING_DAMAGE * dt, Damage.Type.COLD)
	if float(stats["bleeding"]) > 0.0:
		Damage.apply_damage(stats, Config.BLEED_DAMAGE * float(stats["bleeding"]) * dt, Damage.Type.BLEEDING)

	# ---- Natural regen (well-fed only) ----
	if float(stats["hunger"]) >= Config.REGEN_HUNGER_MIN and float(stats["thirst"]) >= Config.REGEN_THIRST_MIN \
			and float(stats["health"]) > 0.0 and float(stats["health"]) < float(stats["max_health"]):
		Damage.heal(stats, Config.NATURAL_REGEN * dt)

	# ---- State-change events (for notifications, throttled by the caller) ----
	var h_state := hunger_state(float(stats["hunger"]))
	var t_state := thirst_state(float(stats["thirst"]))
	if h_state != prev_hunger:
		events.append({"type": "hunger", "from": prev_hunger, "to": h_state})
	if t_state != prev_thirst:
		events.append({"type": "thirst", "from": prev_thirst, "to": t_state})

	return {
		"events": events,
		"hunger_state": h_state,
		"thirst_state": t_state,
		"freezing": freezing,
	}
