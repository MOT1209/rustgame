using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using Rustgame.Core;

namespace Rustgame.UI
{
    /// <summary>"Game Saved" / "Save corrupted — started fresh" toasts, matching
    /// the original's showNotification() calls around SaveSystem events.</summary>
    public class SaveNotificationView : MonoBehaviour
    {
        [SerializeField] Text label;
        [SerializeField] GameObject root;
        [SerializeField] float visibleSeconds = 2f;

        Coroutine hideRoutine;

        void OnEnable()
        {
            GameEvents.SaveCompleted += OnSaveCompleted;
            GameEvents.SaveCorrupted += OnSaveCorrupted;
        }

        void OnDisable()
        {
            GameEvents.SaveCompleted -= OnSaveCompleted;
            GameEvents.SaveCorrupted -= OnSaveCorrupted;
        }

        void OnSaveCompleted() => Show("Game Saved");
        void OnSaveCorrupted() => Show("Save corrupted — started fresh");

        void Show(string text)
        {
            if (label != null) label.text = text;
            if (root != null) root.SetActive(true);
            if (hideRoutine != null) StopCoroutine(hideRoutine);
            hideRoutine = StartCoroutine(HideAfterDelay());
        }

        IEnumerator HideAfterDelay()
        {
            yield return new WaitForSeconds(visibleSeconds);
            if (root != null) root.SetActive(false);
        }
    }
}
