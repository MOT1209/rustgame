using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Rustgame.Core;
using Rustgame.Player;
using Rustgame.Interaction;
using Rustgame.Inventory;
using Rustgame.World;
using Rustgame.Save;

namespace Rustgame.EditorTools
{
    /// <summary>
    /// One-click bootstrap scene builder: seeds data (DataSeeder), then wires a
    /// minimal but fully playable Main scene — Player rig, GameManager, a couple
    /// of gatherable resource nodes — entirely through the Editor API, so every
    /// GUID/fileID is assigned correctly by Unity itself. Re-running it replaces
    /// Main.unity from scratch; nothing here is meant to be hand-edited in YAML.
    ///
    /// Menu: Rustgame/Build Bootstrap Scene. Also runnable headless via
    /// -executeMethod Rustgame.EditorTools.SceneBuilder.Build — in that case the
    /// editor exits with a status code, but the menu item never closes the
    /// editor.
    /// </summary>
    public static class SceneBuilder
    {
        const string ScenesDir = "Assets/_Project/Scenes";
        const string ScenePath = ScenesDir + "/Main.unity";
        const string SurvivalConfigPath = "Assets/_Project/Data/Survival/SurvivalConfig.asset";
        const string ItemDatabasePath = "Assets/_Project/Data/Items/ItemDatabase.asset";

        [MenuItem("Rustgame/Build Bootstrap Scene")]
        public static void Build()
        {
            var exitCode = 0;
            try
            {
                Run();
            }
            catch (Exception e)
            {
                Debug.LogError($"[SceneBuilder] Build failed: {e}");
                exitCode = 1;
            }

            // Only a headless run may terminate the editor — the menu item must
            // not close Unity under the user's hands.
            if (Application.isBatchMode) EditorApplication.Exit(exitCode);
        }

        static void Run()
        {
            DataSeeder.ImportAll();

            var config = LoadOrCreate<SurvivalConfigSO>(SurvivalConfigPath);
            var itemDb = AssetDatabase.LoadAssetAtPath<ItemDatabase>(ItemDatabasePath);
            if (itemDb == null)
                Debug.LogWarning($"[SceneBuilder] No ItemDatabase at {ItemDatabasePath} — items will be accepted without validation.");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            BuildLighting();
            BuildGround();
            var player = BuildPlayer(config);
            BuildGameManager(config, player.Stats, itemDb);
            BuildResourceRespawnService();
            BuildResourceNode("tree", "Assets/_Project/Data/World/Node_tree.asset", new Vector3(3, 1f, 2), new Vector3(0.5f, 2f, 0.5f), PrimitiveType.Cylinder);
            BuildResourceNode("rock", "Assets/_Project/Data/World/Node_rock.asset", new Vector3(-3, 0.5f, 2), Vector3.one, PrimitiveType.Sphere);

            EnsureFolder(ScenesDir);

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[SceneBuilder] Built {ScenePath} — Player, GameManager, respawn service, tree + rock resource nodes wired and ready to Play.");
        }

        static void BuildLighting()
        {
            var lightGO = new GameObject("Directional Light");
            var light = lightGO.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            lightGO.transform.rotation = Quaternion.Euler(50, -30, 0);
        }

        static void BuildGround()
        {
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.position = Vector3.zero;
            ground.transform.localScale = new Vector3(10, 1, 10);
        }

        class PlayerRefs
        {
            public GameObject Player;
            public Camera Camera;
            public SurvivalStats Stats;
            public PlayerController Controller;
            public InteractionController Interaction;
        }

        static PlayerRefs BuildPlayer(SurvivalConfigSO config)
        {
            var refs = new PlayerRefs();

            var player = new GameObject("Player");
            player.transform.position = new Vector3(0, 0, -3);
            refs.Player = player;

            var cc = player.AddComponent<CharacterController>();
            cc.center = new Vector3(0, 1f, 0);
            cc.height = 2f;
            cc.radius = 0.4f;

            var camGO = new GameObject("PlayerCamera");
            camGO.transform.SetParent(player.transform);
            camGO.transform.localPosition = new Vector3(0, 1.6f, 0);
            camGO.transform.localRotation = Quaternion.identity;
            var camera = camGO.AddComponent<Camera>();
            camGO.AddComponent<AudioListener>();
            camGO.tag = "MainCamera";
            refs.Camera = camera;

            var stats = player.AddComponent<SurvivalStats>();
            SetField(stats, "config", config);
            refs.Stats = stats;

            var controller = player.AddComponent<PlayerController>();
            SetField(controller, "stats", stats);
            SetField(controller, "survivalConfig", config);
            refs.Controller = controller;

            var interaction = player.AddComponent<InteractionController>();
            SetField(interaction, "raycastCamera", camera);
            refs.Interaction = interaction;

            var rig = player.AddComponent<PlayerRig>();
            SetField(rig, "controller", controller);
            SetField(rig, "stats", stats);
            SetField(rig, "interaction", interaction);
            SetField(rig, "cameraPivot", camGO.transform);

            return refs;
        }

        static void BuildGameManager(SurvivalConfigSO config, SurvivalStats playerStats, ItemDatabase itemDatabase)
        {
            var gmGO = new GameObject("GameManager");
            var autosave = gmGO.AddComponent<AutoSaveTimer>();
            var gm = gmGO.AddComponent<GameManager>();
            SetField(gm, "survivalConfig", config);
            SetField(gm, "playerStats", playerStats);
            SetField(gm, "autoSaveTimer", autosave);
            SetField(gm, "itemDatabase", itemDatabase);
        }

        static void BuildResourceRespawnService()
        {
            // Without this service a depleted node never comes back — the
            // service is looked up through the ServiceLocator at gather time.
            var go = new GameObject("ResourceRespawnService");
            go.AddComponent<ResourceRespawnService>();
        }

        static void BuildResourceNode(string label, string definitionPath, Vector3 position, Vector3 scale, PrimitiveType shape)
        {
            var definition = AssetDatabase.LoadAssetAtPath<ResourceNodeDefinition>(definitionPath);
            if (definition == null)
            {
                Debug.LogWarning($"[SceneBuilder] Missing resource node definition at {definitionPath}, skipping {label}.");
                return;
            }

            var go = GameObject.CreatePrimitive(shape); // ships with a concrete Collider already, satisfying ResourceNode's RequireComponent
            go.name = char.ToUpperInvariant(label[0]) + label.Substring(1);
            go.transform.position = position;
            go.transform.localScale = scale;

            var node = go.AddComponent<ResourceNode>();
            SetField(node, "definition", definition);
        }

        /// <summary>Assigns a serialized field. Fails LOUDLY: a silently
        /// unwired field used to leave a half-built scene that only misbehaved
        /// at runtime.</summary>
        static void SetField(UnityEngine.Object target, string fieldName, UnityEngine.Object value)
        {
            var so = new SerializedObject(target);
            var prop = so.FindProperty(fieldName);
            if (prop == null)
                throw new InvalidOperationException($"[SceneBuilder] Field '{fieldName}' not found on {target.GetType().Name}");
            prop.objectReferenceValue = value;
            so.ApplyModifiedProperties();
        }

        static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parent = Path.GetDirectoryName(path);
            var leaf = Path.GetFileName(path);
            if (!string.IsNullOrEmpty(parent) && !AssetDatabase.IsValidFolder(parent))
                EnsureFolder(parent.Replace('\\', '/'));
            AssetDatabase.CreateFolder(parent ?? "Assets", leaf);
        }

        static T LoadOrCreate<T>(string path) where T : ScriptableObject
        {
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            if (asset != null) return asset;

            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir)) EnsureFolder(dir.Replace('\\', '/'));

            asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }
    }
}
