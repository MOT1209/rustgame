using System;
using System.Collections.Generic;

namespace Rustgame.Save
{
    /// <summary>
    /// Shape verified against game.js saveGame()/loadGame() (SAVE_VERSION 3):
    /// { saveVersion, timestamp, player, inventory, world, buildings, time }.
    /// Kept as plain [Serializable] classes (JsonUtility-compatible — no
    /// Dictionary fields) so this can round-trip through Unity's built-in JSON
    /// without a third-party library.
    /// </summary>
    [Serializable]
    public class SaveData
    {
        public const int CurrentVersion = 3;

        public int saveVersion = CurrentVersion;
        public long timestampUnixMs;
        public PlayerSave player = new();
        public List<InventoryEntry> inventory = new();
        public WorldSave world = new();
        public BuildingsSave buildings = new();
        public TimeSave time = new();

        public static SaveData Blank() => new SaveData();
    }

    [Serializable]
    public class PlayerSave
    {
        public float posX, posY, posZ;
        public float rotationY;
        public PlayerStatsSave stats = new();
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
        public List<CampfireSave> campfires = new();
        public List<StorageBoxSave> storages = new();
        public List<RespawnEntry> respawns = new();
    }

    [Serializable]
    public class CampfireSave { public float x, z; }

    [Serializable]
    public class StorageBoxSave
    {
        public string id;
        public float x, y, z;
        public List<InventoryEntry> items = new();
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
        public List<StructureSave> structures = new();
        public List<ToolCupboardSave> toolCupboards = new();
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
