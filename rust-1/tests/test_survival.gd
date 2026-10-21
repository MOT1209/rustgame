extends RefCounted
## Tests for the survival tick (port of js/player/survival.ts).

const T := preload("res://tests/test_framework.gd")
const Config := preload("res://scripts/core/config.gd")
const Survival := preload("res://scripts/core/survival.gd")


static func _fresh() -> Dictionary:
	return {
		"health": 100.0,
		"max_health": 100.0,
		"hunger": 100.0,
		"thirst": 100.0,
		"stamina": 100.0,
		"temperature": 100.0,
		"radiation": 0.0,
		"bleeding": 0.0,
	}


static func run_all() -> void:
	T.suite("survival")

	# --- state bands ---
	T.eq(Survival.hunger_state(100.0), "normal", "hunger 100 is normal")
	T.eq(Survival.hunger_state(60.0), "hungry", "hunger 60 is hungry")
	T.eq(Survival.hunger_state(30.0), "starving", "hunger 30 is starving")
	T.eq(Survival.hunger_state(0.0), "critical", "hunger 0 is critical")
	T.eq(Survival.thirst_state(100.0), "normal", "thirst 100 is normal")
	T.eq(Survival.thirst_state(60.0), "thirsty", "thirst 60 is thirsty")
	T.eq(Survival.thirst_state(30.0), "dehydrated", "thirst 30 is dehydrated")
	T.eq(Survival.thirst_state(0.0), "critical", "thirst 0 is critical")

	# --- normalize ---
	var stats := {}
	Survival.normalize(stats)
	T.eq(stats["health"], 100.0, "normalize fills the health")
	T.eq(stats["hunger"], 100.0, "normalize fills the hunger")
	T.eq(stats["thirst"], 100.0, "normalize fills the thirst")
	T.eq(stats["radiation"], 0.0, "normalize fills the radiation")

	# --- the tick drains ---
	stats = _fresh()
	Survival.tick(stats, 1.0, {})
	T.approx(stats["hunger"], 100.0 - Config.HUNGER_DRAIN, "hunger drains by the walking rate", 0.001)
	T.approx(stats["thirst"], 100.0 - Config.THIRST_DRAIN, "thirst drains by its rate", 0.001)

	# Sprinting drains faster.
	stats = _fresh()
	Survival.tick(stats, 1.0, {"sprinting": true})
	T.approx(stats["hunger"], 100.0 - Config.HUNGER_DRAIN_SPRINT, "sprinting drains hunger faster", 0.001)

	# A zero dt changes nothing.
	stats = _fresh()
	Survival.tick(stats, 0.0, {})
	T.eq(stats["hunger"], 100.0, "a zero tick changes nothing")

	# --- temperature ---
	stats = _fresh()
	stats["temperature"] = 50.0
	Survival.tick(stats, 1.0, {"near_fire": true})
	T.approx(stats["temperature"], 50.0 + Config.CAMPFIRE_WARM_RATE, "a fire warms the player", 0.001)

	stats = _fresh()
	stats["temperature"] = 50.0
	Survival.tick(stats, 1.0, {"is_raining": true})
	T.approx(stats["temperature"], 50.0 - Config.TEMP_RAIN_DRAIN, "the rain cools the player", 0.001)

	stats = _fresh()
	stats["temperature"] = 50.0
	Survival.tick(stats, 1.0, {"is_night": true})
	T.approx(stats["temperature"], 50.0 - Config.TEMP_NIGHT_DRAIN, "the night cools the player", 0.001)

	stats = _fresh()
	stats["temperature"] = 50.0
	Survival.tick(stats, 1.0, {})
	T.approx(stats["temperature"], minf(Config.MAX_TEMPERATURE, 50.0 + Config.TEMP_DAY_RATE), "the day warms the player", 0.001)

	# --- radiation ---
	stats = _fresh()
	Survival.tick(stats, 1.0, {"in_radiation": true})
	T.approx(stats["radiation"], Config.RAD_GAIN_IN_ZONE, "radiation builds in a zone", 0.001)

	stats = _fresh()
	stats["radiation"] = 50.0
	Survival.tick(stats, 1.0, {})
	T.approx(stats["radiation"], 50.0 - Config.RAD_DECAY, "radiation decays outside a zone", 0.001)

	# --- starvation and dehydration damage ---
	stats = _fresh()
	stats["hunger"] = 0.0
	stats["thirst"] = 0.0
	Survival.tick(stats, 1.0, {})
	T.approx(stats["health"], 100.0 - (Config.STARVATION_DAMAGE + Config.DEHYDRATION_DAMAGE),
			"starving and dehydration both hurt", 0.001)

	# --- natural regen needs a fed player ---
	stats = _fresh()
	stats["health"] = 50.0
	stats["hunger"] = 100.0
	stats["thirst"] = 100.0
	Survival.tick(stats, 1.0, {})
	T.approx(stats["health"], 50.0 + Config.NATURAL_REGEN, "a fed player regenerates", 0.001)

	stats = _fresh()
	stats["health"] = 50.0
	stats["hunger"] = 10.0
	stats["thirst"] = 100.0
	Survival.tick(stats, 1.0, {})
	T.eq(stats["health"], 50.0, "a starving player does not regenerate")

	# --- the freezing flag ---
	stats = _fresh()
	stats["temperature"] = 10.0
	var result := Survival.tick(stats, 0.1, {})
	T.ok(result["freezing"], "the player is freezing below the threshold")
	T.ok(result["hunger_state"] == "normal", "the tick reports the hunger state")

	# --- state change events ---
	stats = _fresh()
	stats["hunger"] = 60.0
	result = Survival.tick(stats, 0.0, {})
	T.eq(result["events"].size(), 1, "a state change raises one event")
	T.eq(result["events"][0]["type"], "hunger", "the event names the stat")
	T.eq(result["events"][0]["from"], "normal", "the event carries the old state")
	T.eq(result["events"][0]["to"], "hungry", "the event carries the new state")
