using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using Rustgame.Core;
using Rustgame.Player;
using Rustgame.Interaction;
using Rustgame.Save;
using Rustgame.Input;
using Rustgame.UI;

namespace Rustgame.EditorTools
{
    /// <summary>
    /// Builds a minimal but real, working scene + Player prefab entirely
    /// through Editor APIs — never by hand-authoring .unity/.prefab YAML,
    /// which would need GUIDs Unity hasn't assigned yet (this project's
    /// scripts have never been imported by a real Editor). Run this AFTER
    /// "Rustgame > Import Seed Data" so SurvivalConfigSO and the databases
    /// already exist to be wired in.
    ///
    /// Menu: Rustgame > Build Bootstrap Scene
    ///
    /// What you still have to do by hand afterward (genuinely interactive
    /// Editor steps this script cannot automate):
    ///   - Window > AI > Navigation > Bake, once you've placed real level
    ///     geometry, so EnemyAI's NavMeshAgent has something to path on.
    ///   - If your project's Active Input Handling is set to "Input System
    ///     Package (New)" only, replace the generated EventSystem's
    ///     StandaloneInputModule with InputSystemUIInputModule (Component
    ///     menu), since this script adds the classic one for broadest
    ///     compatibility with a project it can't inspect the settings of.
    /// </summary>
    public static class SceneBootstrapper
    {
        const string ScenesDir = "Assets/_Project/Scenes";
        const string PrefabsDir = "Assets/_Project/Prefabs";
        const string ScenePath = ScenesDir + "/World.unity";
        const string PlayerPrefabPath = PrefabsDir + "/Player.prefab";

        [MenuItem("Rustgame/Build Bootstrap Scene")]
        public static void Build()
        {
            EnsureFolders();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            BuildLightingAndGround();
            var player = BuildPlayer();
            BuildHudCanvas(player);
            BuildEventSystem();
            BuildGameManager(player);

            // Save the Player as a real, GUID-backed prefab, then keep the
            // scene instance connected to it (matches the normal Editor
            // workflow: drag into Assets to create a prefab).
            PrefabUtility.SaveAsPrefabAssetAndConnect(player, PlayerPrefabPath, InteractionMode.AutomatedAction);

            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[SceneBootstrapper] Built {ScenePath} and {PlayerPrefabPath}. " +
                      "Remember: NavMesh still needs a manual bake (Window > AI > Navigation) once you add real level geometry.");
        }

        static void EnsureFolders()
        {
            foreach (var dir in new[] { ScenesDir, PrefabsDir })
                if (!AssetDatabase.IsValidFolder(dir))
                    Directory.CreateDirectory(dir);
            AssetDatabase.Refresh();
        }

        static void BuildLightingAndGround()
        {
            var lightGO = new GameObject("Directional Light");
            var light = lightGO.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            lightGO.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.localScale = new Vector3(20f, 1f, 20f); // 200x200 units, matches CONFIG.WORLD_SIZE order of magnitude
        }

        static GameObject BuildPlayer()
        {
            var player = new GameObject("Player",
                typeof(CharacterController),
                typeof(SurvivalStats),
                typeof(PlayerController),
                typeof(InteractionController),
                typeof(PlayerInputReader));
            player.transform.position = Vector3.zero; // matches the verified revive/spawn point

            var cc = player.GetComponent<CharacterController>();
            cc.height = 1.8f;
            cc.center = new Vector3(0, 0.9f, 0);
            cc.radius = 0.4f;

            var cameraGO = new GameObject("PlayerCamera", typeof(Camera), typeof(AudioListener));
            cameraGO.transform.SetParent(player.transform, false);
            cameraGO.transform.localPosition = new Vector3(0, 1.6f, 0); // eye height — first-person by default, verified

            var actionsGuid = AssetDatabase.FindAssets("RustgameControls t:InputActionAsset");
            InputActionAsset actions = actionsGuid.Length > 0
                ? AssetDatabase.LoadAssetAtPath<InputActionAsset>(AssetDatabase.GUIDToAssetPath(actionsGuid[0]))
                : null;

            var inputReaderSO = new SerializedObject(player.GetComponent<PlayerInputReader>());
            inputReaderSO.FindProperty("actions").objectReferenceValue = actions;
            inputReaderSO.ApplyModifiedPropertiesWithoutUndo();

            var interactionSO = new SerializedObject(player.GetComponent<InteractionController>());
            interactionSO.FindProperty("raycastCamera").objectReferenceValue = cameraGO.GetComponent<Camera>();
            interactionSO.ApplyModifiedPropertiesWithoutUndo();

            var configGuid = AssetDatabase.FindAssets("t:SurvivalConfigSO");
            if (configGuid.Length > 0)
            {
                var config = AssetDatabase.LoadAssetAtPath<SurvivalConfigSO>(AssetDatabase.GUIDToAssetPath(configGuid[0]));
                var statsSO = new SerializedObject(player.GetComponent<SurvivalStats>());
                statsSO.FindProperty("config").objectReferenceValue = config;
                statsSO.ApplyModifiedPropertiesWithoutUndo();
            }
            else
            {
                Debug.LogWarning("[SceneBootstrapper] No SurvivalConfigSO asset found — create one " +
                                  "(Assets > Create > Rustgame > Survival Config) and assign it to the " +
                                  "Player's SurvivalStats component manually.");
            }

            return player;
        }

        static GameObject BuildHudCanvas(GameObject player)
        {
            var canvasGO = new GameObject("HUD Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster), typeof(HUDController));
            var canvas = canvasGO.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGO.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);

            var barContainer = new GameObject("SurvivalBars", typeof(RectTransform));
            barContainer.transform.SetParent(canvasGO.transform, false);
            var containerRt = barContainer.GetComponent<RectTransform>();
            containerRt.anchorMin = new Vector2(0, 0);
            containerRt.anchorMax = new Vector2(0, 0);
            containerRt.pivot = new Vector2(0, 0);
            containerRt.anchoredPosition = new Vector2(24, 24);
            containerRt.sizeDelta = new Vector2(260, 130);
            var layout = barContainer.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 6f;
            layout.childControlHeight = false;
            layout.childControlWidth = true;

            var health = MakeBarSlider(barContainer.transform, "Health", new Color(0.85f, 0.2f, 0.2f));
            var hunger = MakeBarSlider(barContainer.transform, "Hunger", new Color(0.85f, 0.6f, 0.2f));
            var thirst = MakeBarSlider(barContainer.transform, "Thirst", new Color(0.2f, 0.55f, 0.85f));
            var stamina = MakeBarSlider(barContainer.transform, "Stamina", new Color(0.3f, 0.75f, 0.3f));
            var temperature = MakeBarSlider(barContainer.transform, "Temperature", new Color(0.7f, 0.5f, 0.9f));

            var hudSO = new SerializedObject(canvasGO.GetComponent<HUDController>());
            hudSO.FindProperty("healthBar").objectReferenceValue = health;
            hudSO.FindProperty("hungerBar").objectReferenceValue = hunger;
            hudSO.FindProperty("thirstBar").objectReferenceValue = thirst;
            hudSO.FindProperty("staminaBar").objectReferenceValue = stamina;
            hudSO.FindProperty("temperatureBar").objectReferenceValue = temperature;
            hudSO.ApplyModifiedPropertiesWithoutUndo();

            // Interaction prompt (top-center-ish, matches the original's floating E-prompt)
            var promptGO = new GameObject("InteractionPrompt", typeof(RectTransform), typeof(InteractionPromptView));
            promptGO.transform.SetParent(canvasGO.transform, false);
            var promptRt = promptGO.GetComponent<RectTransform>();
            promptRt.anchorMin = promptRt.anchorMax = new Vector2(0.5f, 0.3f);
            promptRt.anchoredPosition = Vector2.zero;
            promptRt.sizeDelta = new Vector2(400, 40);
            var promptTextGO = new GameObject("Label", typeof(Text));
            promptTextGO.transform.SetParent(promptGO.transform, false);
            var promptText = promptTextGO.GetComponent<Text>();
            promptText.alignment = TextAnchor.MiddleCenter;
            promptText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            var promptSO = new SerializedObject(promptGO.GetComponent<InteractionPromptView>());
            promptSO.FindProperty("controller").objectReferenceValue = player.GetComponent<InteractionController>();
            promptSO.FindProperty("promptLabel").objectReferenceValue = promptText;
            promptSO.FindProperty("root").objectReferenceValue = promptGO;
            promptSO.ApplyModifiedPropertiesWithoutUndo();
            promptGO.SetActive(false);

            // Save notification toast (top-right)
            var saveGO = new GameObject("SaveNotification", typeof(RectTransform), typeof(SaveNotificationView));
            saveGO.transform.SetParent(canvasGO.transform, false);
            var saveRt = saveGO.GetComponent<RectTransform>();
            saveRt.anchorMin = saveRt.anchorMax = new Vector2(1f, 1f);
            saveRt.pivot = new Vector2(1f, 1f);
            saveRt.anchoredPosition = new Vector2(-20, -20);
            saveRt.sizeDelta = new Vector2(260, 32);
            var saveTextGO = new GameObject("Label", typeof(Text));
            saveTextGO.transform.SetParent(saveGO.transform, false);
            var saveText = saveTextGO.GetComponent<Text>();
            saveText.alignment = TextAnchor.MiddleRight;
            saveText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            var saveSO = new SerializedObject(saveGO.GetComponent<SaveNotificationView>());
            saveSO.FindProperty("label").objectReferenceValue = saveText;
            saveSO.FindProperty("root").objectReferenceValue = saveGO;
            saveSO.ApplyModifiedPropertiesWithoutUndo();
            saveGO.SetActive(false);

            return canvasGO;
        }

        static Slider MakeBarSlider(Transform parent, string label, Color fillColor)
        {
            var go = new GameObject(label, typeof(RectTransform), typeof(Slider));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(240, 18);

            var bg = new GameObject("Background", typeof(Image));
            bg.transform.SetParent(go.transform, false);
            var bgRt = bg.GetComponent<RectTransform>();
            bgRt.anchorMin = Vector2.zero; bgRt.anchorMax = Vector2.one; bgRt.offsetMin = bgRt.offsetMax = Vector2.zero;
            bg.GetComponent<Image>().color = new Color(0, 0, 0, 0.5f);

            var fillArea = new GameObject("Fill Area", typeof(RectTransform));
            fillArea.transform.SetParent(go.transform, false);
            var fillAreaRt = fillArea.GetComponent<RectTransform>();
            fillAreaRt.anchorMin = Vector2.zero; fillAreaRt.anchorMax = Vector2.one; fillAreaRt.offsetMin = fillAreaRt.offsetMax = Vector2.zero;

            var fill = new GameObject("Fill", typeof(Image));
            fill.transform.SetParent(fillArea.transform, false);
            var fillRt = fill.GetComponent<RectTransform>();
            fillRt.anchorMin = Vector2.zero; fillRt.anchorMax = Vector2.one; fillRt.offsetMin = fillRt.offsetMax = Vector2.zero;
            fill.GetComponent<Image>().color = fillColor;

            var slider = go.GetComponent<Slider>();
            slider.fillRect = fillRt;
            slider.targetGraphic = fill.GetComponent<Image>();
            slider.minValue = 0f;
            slider.maxValue = 1f;
            slider.value = 1f;
            slider.interactable = false; // display-only, never player-editable
            return slider;
        }

        static void BuildEventSystem()
        {
            var go = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
            // See the class-level doc comment: swap to InputSystemUIInputModule
            // by hand if your project uses the new Input System exclusively.
            _ = go;
        }

        static void BuildGameManager(GameObject player)
        {
            var go = new GameObject("GameManager", typeof(GameManager), typeof(AutoSaveTimer));
            var gmSO = new SerializedObject(go.GetComponent<GameManager>());
            var configGuid = AssetDatabase.FindAssets("t:SurvivalConfigSO");
            if (configGuid.Length > 0)
            {
                var config = AssetDatabase.LoadAssetAtPath<SurvivalConfigSO>(AssetDatabase.GUIDToAssetPath(configGuid[0]));
                gmSO.FindProperty("survivalConfig").objectReferenceValue = config;
            }
            gmSO.FindProperty("playerStats").objectReferenceValue = player.GetComponent<SurvivalStats>();
            gmSO.FindProperty("autoSaveTimer").objectReferenceValue = go.GetComponent<AutoSaveTimer>();
            gmSO.ApplyModifiedPropertiesWithoutUndo();
        }
    }
}
