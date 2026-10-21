class_name SurvivalConfig
extends RefCounted
## The survival balance numbers — a direct port of js/core/config.ts
## (SURVIVAL_CONFIG). These MUST stay identical to the JS game: the same
## numbers are the game's contract with the player.
##
## Pure data: no Node, no scene, no side effects.

# ---- Vitals ----
const MAX_HEALTH := 100.0
const MAX_HUNGER := 100.0
const MAX_THIRST := 100.0
const MAX_STAMINA := 100.0
const MAX_TEMPERATURE := 100.0
const MAX_RADIATION := 100.0

# ---- Hunger ----
const HUNGER_START := 100.0
const HUNGER_DRAIN := 0.05
const HUNGER_DRAIN_SPRINT := 0.09
const HUNGER_DRAIN_COLD := 0.08
const HUNGER_NORMAL := 60.0
const HUNGER_HUNGRY := 30.0
const STARVATION_DAMAGE := 2.0

# ---- Thirst ----
const THIRST_START := 100.0
const THIRST_DRAIN := 0.08
const THIRST_DRAIN_SPRINT := 0.13
const THIRST_NORMAL := 60.0
const THIRST_THIRSTY := 30.0
const DEHYDRATION_DAMAGE := 2.5

# ---- Stamina ----
const STAMINA_START := 100.0
const SPRINT_DRAIN := 12.0
const JUMP_DRAIN := 10.0
const GATHER_DRAIN := 4.0
const REGEN_RATE := 9.0
const REGEN_RATE_COLD := 4.0
const MINIMUM_SPRINT_STAMINA := 15.0

# ---- Temperature (0 = freezing, 100 = ideal) ----
const TEMP_START := 100.0
const TEMP_DAY_RATE := 1.2
const TEMP_NIGHT_DRAIN := 0.9
const TEMP_RAIN_DRAIN := 1.6
const TEMP_COLD_WATER_DRAIN := 2.0
const FREEZING_THRESHOLD := 25.0
const CRITICAL_THRESHOLD := 10.0
const FREEZING_DAMAGE := 1.5
const CAMPFIRE_WARM_RATE := 6.0

# ---- Radiation ----
const RAD_GAIN_IN_ZONE := 2.0
const RAD_DECAY := 1.0
const RAD_LETHAL_AT := 100.0
const RAD_DAMAGE := 2.0

# ---- Bleeding ----
const BLEED_DAMAGE := 1.0
const BANDAGE_STOPS_BLEEDING := true

# ---- Healing / regen ----
const REGEN_HUNGER_MIN := 60.0
const REGEN_THIRST_MIN := 50.0
const NATURAL_REGEN := 1.0

# ---- Day / night ----
const DAY_LENGTH := 800.0
const DAY_START_TIME := 300.0

# ---- Save ----
const AUTOSAVE_INTERVAL := 60.0
const SAVE_VERSION := 5
const SAVE_KEY := "rust_survival_save"
