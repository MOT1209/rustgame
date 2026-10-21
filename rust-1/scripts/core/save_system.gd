class_name SaveSystem
extends RefCounted
## Save system — a port of js/save/save-system.ts (v5).
##
## A/B alternating slots (`save_a` / `save_b` + a `save_active` pointer) so a
## write that dies half-way never destroys the only copy. Reads NEVER throw:
## every failure becomes a status ('missing' / 'corrupt' / 'future-version' /
## 'error') and a safe empty save.
##
## Storage: user:// (Godot's per-user data dir) — the same A/B idea as
## localStorage in the web build.
##
## Pure: the storage is injectable, so the tests use a fake.

const Config := preload("res://scripts/core/config.gd")

const STATUS_OK := "ok"
const STATUS_MISSING := "missing"
const STATUS_CORRUPT := "corrupt"
const STATUS_FUTURE := "future-version"
const STATUS_ERROR := "error"

## The outcome of the last read.
static var last_read_status: String = STATUS_MISSING
## True when the stored save came from a NEWER build (must not be overwritten).
static var is_future_version := false
## The last write failure label (null on success).
static var last_write_error = null


static func blank() -> Dictionary:
	return {
		"saveVersion": Config.SAVE_VERSION,
		"timestamp": int(Time.get_unix_time_from_system() * 1000),
		"player": {
			"position": {"x": 0.0, "y": 0.0, "z": 0.0},
			"rotation": {"y": 0.0},
			"stats": {
				"health": Config.MAX_HEALTH, "hunger": Config.HUNGER_START,
				"thirst": Config.THIRST_START, "stamina": Config.STAMINA_START,
				"temperature": Config.TEMP_START, "radiation": 0.0, "bleeding": 0.0,
			},
			"belt": [],
			"dead": false,
		},
		"inventory": [],
		"world": {
			"respawns": [], "storages": [], "campfires": [], "furnaces": [],
			"day": 1, "weather": null,
		},
		"buildings": {"structures": [], "toolCupboards": []},
		"time": Config.DAY_START_TIME,
		"spoiledAt": {},
	}


static func _slot_path(key: String, slot: String) -> String:
	return "user://%s_%s.json" % [key, slot]


static func _pointer_path(key: String) -> String:
	return "user://%s_active" % key


static func _read_file(path: String) -> String:
	if not FileAccess.file_exists(path):
		return ""
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return ""
	return file.get_as_text()


static func _write_file(path: String, content: String) -> bool:
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(content)
	file.close()
	return true


## The active slot id ("a" or "b"), or "" when there is none.
static func _active_slot(key: String) -> String:
	var pointer := _read_file(_pointer_path(key)).strip_edges()
	return pointer if pointer == "a" or pointer == "b" else ""


## Parse + migrate + validate a raw JSON string. Returns {} when unusable.
static func load_from_string(json: String) -> Dictionary:
	if json.is_empty():
		last_read_status = STATUS_CORRUPT
		return {}
	var parsed = JSON.parse_string(json)
	if parsed == null or not (parsed is Dictionary):
		last_read_status = STATUS_CORRUPT
		return {}
	return migrate(parsed)


## Migrate any older save to the current shape. Never throws.
static func migrate(data: Dictionary) -> Dictionary:
	if data.is_empty():
		return {}
	var version := int(data.get("saveVersion", data.get("version", Config.SAVE_VERSION)))
	if version > Config.SAVE_VERSION:
		is_future_version = true
		last_read_status = STATUS_FUTURE
		return {}

	var out := blank()
	var player: Dictionary = data.get("player", {}) if data.get("player", {}) is Dictionary else {}
	var stats: Dictionary = player.get("stats", {}) if player.get("stats", {}) is Dictionary else {}
	out["player"] = {
		"position": _vec3(player.get("position", {})),
		"rotation": {"y": float(player.get("rotation", {}).get("y", 0.0)) if player.get("rotation", {}) is Dictionary else 0.0},
		"stats": {
			"health": float(stats.get("health", Config.MAX_HEALTH)),
			"hunger": float(stats.get("hunger", Config.HUNGER_START)),
			"thirst": float(stats.get("thirst", Config.THIRST_START)),
			"stamina": float(stats.get("stamina", Config.STAMINA_START)),
			"temperature": float(stats.get("temperature", Config.TEMP_START)),
			"radiation": float(stats.get("radiation", 0.0)),
			"bleeding": float(stats.get("bleeding", 0.0)),
		},
		"belt": player.get("belt", []) if player.get("belt", []) is Array else [],
		"dead": player.get("dead", false) == true,
	}
	out["inventory"] = data.get("inventory", []) if data.get("inventory", []) is Array else []
	var world: Dictionary = data.get("world", {}) if data.get("world", {}) is Dictionary else {}
	out["world"] = {
		"respawns": world.get("respawns", []) if world.get("respawns", []) is Array else [],
		"storages": world.get("storages", []) if world.get("storages", []) is Array else [],
		"campfires": world.get("campfires", []) if world.get("campfires", []) is Array else [],
		# v5 added the placed furnaces — v4 saves simply have none.
		"furnaces": world.get("furnaces", []) if world.get("furnaces", []) is Array else [],
		"day": maxi(1, int(world.get("day", 1))),
		"weather": world.get("weather", null),
	}
	var buildings: Dictionary = data.get("buildings", {}) if data.get("buildings", {}) is Dictionary else {}
	out["buildings"] = {
		"structures": buildings.get("structures", []) if buildings.get("structures", []) is Array else [],
		"toolCupboards": buildings.get("toolCupboards", []) if buildings.get("toolCupboards", []) is Array else [],
	}
	out["time"] = float(data.get("time", Config.DAY_START_TIME))
	# v4 added the spoilage clock — v3 saves simply have none.
	var spoiled: Dictionary = data.get("spoiledAt", {}) if data.get("spoiledAt", {}) is Dictionary else {}
	out["spoiledAt"] = spoiled
	out["saveVersion"] = Config.SAVE_VERSION
	out["timestamp"] = int(data.get("timestamp", out["timestamp"]))
	return out


static func _vec3(value) -> Dictionary:
	if not (value is Dictionary):
		return {"x": 0.0, "y": 0.0, "z": 0.0}
	return {
		"x": float(value.get("x", 0.0)),
		"y": float(value.get("y", 0.0)),
		"z": float(value.get("z", 0.0)),
	}


## Reads with A/B fallback: the active slot first, then the other one; the
## newest valid save wins. Never throws — returns {} when nothing is usable.
static func read(key: String = Config.SAVE_KEY) -> Dictionary:
	last_read_status = STATUS_MISSING
	is_future_version = false

	var active := _active_slot(key)
	var ordered: Array = []
	if active == "a":
		ordered = ["a", "b"]
	elif active == "b":
		ordered = ["b", "a"]
	else:
		ordered = ["a", "b"]

	var found: Array = []
	var saw_raw := false
	var saw_corrupt := false
	var saw_future := false

	for slot in ordered:
		var raw := _read_file(_slot_path(key, slot))
		if raw.is_empty():
			continue
		saw_raw = true
		var save := load_from_string(raw)
		if not save.is_empty():
			found.append(save)
		elif is_future_version:
			saw_future = true
		else:
			saw_corrupt = true

	is_future_version = saw_future
	if saw_future:
		last_read_status = STATUS_FUTURE
	if found.is_empty():
		if not saw_future and saw_raw and saw_corrupt:
			last_read_status = STATUS_CORRUPT
		return {}
	found.sort_custom(func(a, b): return int(a.get("timestamp", 0)) > int(b.get("timestamp", 0)))
	if not saw_future:
		last_read_status = STATUS_OK
	return found[0]


## Writes to the unused A/B slot, then flips the pointer. Refuses to write
## when the stored save came from a newer build.
static func write(save: Dictionary, key: String = Config.SAVE_KEY) -> bool:
	if is_future_version:
		last_write_error = "future-version-readonly"
		return false
	if save.is_empty():
		last_write_error = "encode-failed"
		return false

	save["saveVersion"] = Config.SAVE_VERSION
	save["timestamp"] = int(Time.get_unix_time_from_system() * 1000)
	var text := JSON.stringify(save)
	if text.is_empty():
		last_write_error = "encode-failed"
		return false

	var active := _active_slot(key)
	var next := "b" if active == "a" else "a"
	if not _write_file(_slot_path(key, next), text):
		last_write_error = "write-failed"
		return false
	if not _write_file(_pointer_path(key), next):
		# The payload is durable; the pointer flip failed — the next read falls
		# back to comparing timestamps.
		last_write_error = "write-failed"
		return false
	last_write_error = null
	return true


## Removes every slot and the pointer (a fresh start).
static func erase(key: String = Config.SAVE_KEY) -> void:
	for slot in ["a", "b"]:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(_slot_path(key, slot)))
	DirAccess.remove_absolute(ProjectSettings.globalize_path(_pointer_path(key)))
	last_read_status = STATUS_MISSING
	is_future_version = false
