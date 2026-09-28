using UnityEngine;
using UnityEngine.UI;
using Rustgame.Interaction;

namespace Rustgame.UI
{
    /// <summary>Floating "[E] Open storage box" text, matches the original's
    /// setPrompt()/E-context UI. Polls InteractionController each frame rather
    /// than subscribing to an event, since the current interactable target
    /// changes continuously as the player looks around — an event per look
    /// change would fire far more often than a per-frame read costs.</summary>
    public class InteractionPromptView : MonoBehaviour
    {
        [SerializeField] InteractionController controller;
        [SerializeField] Text promptLabel;
        [SerializeField] GameObject root;

        void Update()
        {
            var text = controller != null ? controller.CurrentPrompt : null;
            var visible = !string.IsNullOrEmpty(text);
            if (root != null) root.SetActive(visible);
            if (visible && promptLabel != null) promptLabel.text = text;
        }
    }
}
