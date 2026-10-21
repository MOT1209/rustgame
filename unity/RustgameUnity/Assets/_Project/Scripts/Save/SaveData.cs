using System;
using System.Collections.Generic;

namespace Rustgame.Save
{
    /// <summary>
    /// Shape verified against game.js saveGame()/loadGame() (SAVE_VERSION 5):
    /// { saveVersion, timestamp, player, inventory, world, buildings, time,
    ///   spoiledAt }.
    /// v4 added the food spoilage clock, v5 the placed furnaces.
    /// Kept as plain [Serializable] classes (JsonUtility-compatible — no
    /// Dictionary fields) so this can round-trip through Unity's built-in JSON
    /// without a third-party library.
    /// </summary>
    [Serializable]
    public class SaveData
    {
        public const int CurrentVersion = 5;

        public int saveVersion = CurrentVersion;
        public long timestampUnixMs;
        public PlayerSave player = new PlayerSave();
        public List<InventoryEntry> inventory = new List<InventoryEntry>();
        public WorldSave world = new WorldSave();
        public BuildingsSave buildings = new BuildingsSave();
        public TimeSave time = new TimeSave();
        /// <summary>v4: item id → epoch ms when it started rotting.</summary>
        public List<SpoiledEntry> spoiledAt = new List<SpoiledEntry>();

        public static SaveData Blank() => new SaveData();
    }

    [Serializable]
    public class SpoiledEntry
    {
        public string id;
        public long at;
    }

    [Serializable]
    public class PlayerSave
    {
        public float posX, posY, posZ;
        public float rotationY;
        public PlayerStatsSave stats = new PlayerStatsSave();
        public string[] belt = new string[6];
        public bool dead;
    }

    [Serializable]
    public class PlayerStatsSave
    {
        public float health = 100, hunger = 100, thirst = 100, stamina = 100, temperature = 100, radiation, bleeding;
    }

    [Serializable]
    public class InventoryEntry
    {
        public string id;
        public int count;
    }

    [Serializable]
    public class WorldSave
    {
        public int day = 1;
        public string weatherId = "clear";
        public float weatherTimeLeft;
        public List<CampfireSave> campfires = new List<CampfireSave>();
        /// <summary>v5: the placed furnaces (the smelters).</summary>
        public List<FurnaceSave> furnaces = new List<FurnaceSave>();
        public List<StorageBoxSave> storages = new List<StorageBoxSave>();
        public List<RespawnEntry> respawns = new List<RespawnEntry>();
    }

    [Serializable]
    public class CampfireSave { public float x, z; }

    [Serializable]
    public class FurnaceSave { public float x, z; }

    [Serializable]
    public class StorageBoxSave
    {
        public string id;
        public float x, y, z;
        public List<InventoryEntry> items = new List<InventoryEntry>();
    }

    [Serializable]
    public class RespawnEntry
    {
        public string nodeType;
        public float x, y, z;
        public float remainingSeconds;
    }

    [Serializable]
    public class BuildingsSave
    {
        public List<StructureSave> structures = new List<StructureSave>();
        public List<ToolCupboardSave> toolCupboards = new List<ToolCupboardSave>();
    }

    [Serializable]
    public class StructureSave
    {
        public string buildType; // foundation/wall/doorway/ceiling/tool_cupboard/wooden_door
        public float x, y, z;
        public float rotationY;
        public string tier; // Twig/Wood/Stone/SheetMetal/Armored
        public float health, maxHealth;
        public bool isTC, isDoor, isOpen;
    }

    [Serializable]
    public class ToolCupboardSave { public float x, z; public float radius = 25f; }

    [Serializable]
    public class TimeSave
    {
        public float timeOfDaySeconds;
    }
}
