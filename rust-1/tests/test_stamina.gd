extends RefCounted
## Tests for the stamina system (port of js/player/stamina.ts).

const T := preload("res://tests/test_framework.gd")
const Config := preload("res://scripts/core/config.gd")
const Stamina := preload("res://scripts/core/stamina.gd")


static func run_all() -> void:
	T.suite("stamina")

	var stats := {"stamina": 100.0}

	# --- can_sprint ---
	T.ok(Stamina.can_sprint(stats), "full stamina can sprint")
	stats["stamina"] = Config.MINIMUM_SPRINT_STAMINA
	T.ok(Stamina.can_sprint(stats), "the sprint minimum still allows sprinting")
	stats["stamina"] = Config.MINIMUM_SPRINT_STAMINA - 0.1
	T.ok(not Stamina.can_sprint(stats), "below the minimum the sprint is blocked")

	# --- drains ---
	stats = {"stamina": 100.0}
	Stamina.drain_sprint(stats, 1.0)
	T.approx(stats["stamina"], 100.0 - Config.SPRINT_DRAIN, "sprinting drains per second", 0.001)

	stats = {"stamina": 100.0}
	Stamina.drain_jump(stats)
	T.approx(stats["stamina"], 100.0 - Config.JUMP_DRAIN, "a jump costs a flat amount", 0.001)

	stats = {"stamina": 100.0}
	Stamina.drain_gather(stats)
	T.approx(stats["stamina"], 100.0 - Config.GATHER_DRAIN, "a gather costs a flat amount", 0.001)

	# Never below zero.
	stats = {"stamina": 3.0}
	Stamina.drain_jump(stats)
	T.eq(stats["stamina"], 0.0, "the stamina never goes below zero")

	# --- regen ---
	stats = {"stamina": 50.0}
	Stamina.regen(stats, 1.0)
	T.approx(stats["stamina"], 50.0 + Config.REGEN_RATE, "the stamina regenerates", 0.001)

	stats = {"stamina": 50.0}
	Stamina.regen(stats, 1.0, true)
	T.approx(stats["stamina"], 50.0 + Config.REGEN_RATE_COLD, "the cold slows the regeneration", 0.001)

	stats = {"stamina": 99.0}
	Stamina.regen(stats, 10.0)
	T.eq(stats["stamina"], Config.MAX_STAMINA, "the stamina never exceeds the maximum")

	# --- the full update ---
	stats = {"stamina": 100.0}
	var result := Stamina.update(stats, 1.0, {"want_sprint": true})
	T.ok(result["sprinting"], "the sprint runs when it is asked for and possible")
	T.approx(stats["stamina"], 100.0 - Config.SPRINT_DRAIN, "the sprint drained the stamina", 0.001)

	stats = {"stamina": 100.0}
	result = Stamina.update(stats, 1.0, {"want_sprint": false})
	T.ok(not result["sprinting"], "no sprint is requested")
	T.approx(stats["stamina"], minf(Config.MAX_STAMINA, 100.0 + Config.REGEN_RATE), "the stamina regenerated instead", 0.001)

	# A jump and a gather in the same frame.
	stats = {"stamina": 100.0}
	Stamina.update(stats, 0.0, {"did_jump": true, "did_gather": true})
	T.approx(stats["stamina"], 100.0 - Config.JUMP_DRAIN - Config.GATHER_DRAIN, "a jump and a gather both cost stamina", 0.001)

	# Running out of stamina stops the sprint.
	stats = {"stamina": 1.0}
	result = Stamina.update(stats, 1.0, {"want_sprint": true})
	T.ok(not result["sprinting"], "the sprint is locked out when the stamina is gone")
