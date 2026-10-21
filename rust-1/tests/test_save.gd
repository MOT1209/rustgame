extends RefCounted
## Tests for the save system (port of js/save/save-system.ts, v5).

const T := preload("res://tests/test_framework.gd")
const Save := preload("res://scripts/core/save_system.gd")
const Config := preload("res://scripts/core/config.gd")


static func run_all() -> void:
	T.suite("save system")

	var key := "rustgame_test_save"
	Save.erase(key)

	# --- blank ---
	var blank := Save.blank()
	T.eq(blank["saveVersion"], Config.SAVE_VERSION, "a blank save carries the current version")
	T.eq(blank["player"]["stats"]["health"], Config.MAX_HEALTH, "a blank save starts at full health")
	T.eq(blank["world"]["furnaces"].size(), 0, "a blank save has no furnaces")
	T.eq(blank["spoiledAt"].size(), 0, "a blank save has no spoilage clock")

	# --- a round trip ---
	var save := Save.blank()
	save["player"]["position"] = {"x": 12.5, "y": 1.0, "z": -7.25}
	save["player"]["stats"]["health"] = 42.0
	save["inventory"] = [{"id": "wood", "count": 30}]
	save["world"]["furnaces"] = [{"x": 3.0, "z": 4.0}]
	save["spoiledAt"] = {"raw_meat": 1700000000}

	T.ok(Save.write(save, key), "the save writes")
	T.eq(SaveSystem.last_write_error, null, "no write error")

	var loaded := Save.read(key)
	T.eq(SaveSystem.last_read_status, "ok", "the save reads back")
	T.eq(loaded["player"]["position"]["x"], 12.5, "the position survives")
	T.eq(loaded["player"]["position"]["z"], -7.25, "the position survives (z)")
	T.eq(loaded["player"]["stats"]["health"], 42.0, "the health survives")
	T.eq(loaded["inventory"].size(), 1, "the inventory survives")
	T.eq(loaded["inventory"][0]["id"], "wood", "the item id survives")
	T.eq(loaded["world"]["furnaces"].size(), 1, "the furnaces survive (v5)")
	T.eq(loaded["spoiledAt"].get("raw_meat", 0), 1700000000, "the spoilage clock survives (v4)")

	# --- the A/B slots alternate ---
	var second := Save.blank()
	second["player"]["stats"]["health"] = 77.0
	Save.write(second, key)
	var after := Save.read(key)
	T.eq(after["player"]["stats"]["health"], 77.0, "the newer save wins")
	T.eq(SaveSystem.last_read_status, "ok", "the read is still ok")

	# --- a corrupt slot falls back to the other one ---
	Save.write(save, key)          # the good one is now the inactive slot
	var file := FileAccess.open(SaveSystem._slot_path(key, "b"), FileAccess.WRITE)
	if file != null:
		file.store_string("{not json at all")
		file.close()
	var recovered := Save.read(key)
	T.eq(recovered.get("player", {}).get("stats", {}).get("health", -1), 42.0,
			"the good slot is used when the other one is corrupt")

	# --- a future version is refused, never overwritten ---
	var future := Save.blank()
	future["saveVersion"] = Config.SAVE_VERSION + 1
	var future_file := FileAccess.open(SaveSystem._slot_path(key, "a"), FileAccess.WRITE)
	if future_file != null:
		future_file.store_string(JSON.stringify(future))
		future_file.close()
	Save.read(key)
	T.ok(SaveSystem.is_future_version, "a future save is detected")
	T.eq(SaveSystem.last_read_status, "future-version", "the status says future-version")
	T.ok(not Save.write(Save.blank(), key), "a future save is not overwritten")

	# --- a missing save ---
	Save.erase(key)
	Save.read(key)
	T.eq(SaveSystem.last_read_status, "missing", "no save reads as missing")
	T.eq(Save.read(key).size(), 0, "a missing save returns nothing")

	# --- migration: a v3 save has no furnaces and no spoilage clock ---
	var legacy := {
		"saveVersion": 3,
		"timestamp": 1700000000000,
		"player": {"position": {"x": 1.0, "y": 0.0, "z": 2.0}, "stats": {"health": 60.0}},
		"inventory": [],
		"world": {"day": 2, "campfires": [{"x": 1.0, "z": 2.0}]},
		"buildings": {"structures": [], "toolCupboards": []},
		"time": 100.0,
	}
	var migrated := Save.migrate(legacy)
	T.eq(migrated["saveVersion"], Config.SAVE_VERSION, "an old save is migrated to the current version")
	T.eq(migrated["world"]["furnaces"].size(), 0, "a v3 save has no furnaces")
	T.eq(migrated["spoiledAt"].size(), 0, "a v3 save has no spoilage clock")
	T.eq(migrated["player"]["stats"]["health"], 60.0, "the old health is kept")
	T.eq(migrated["world"]["day"], 2, "the old day is kept")
	T.eq(migrated["world"]["campfires"].size(), 1, "the old campfires are kept")
