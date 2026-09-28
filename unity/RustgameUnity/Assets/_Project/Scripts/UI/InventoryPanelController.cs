using UnityEngine;
using Rustgame.Inventory;

namespace Rustgame.UI
{
    /// <summary>
    /// Presenter for the T-key bag panel. Reads InventorySystem.Items and asks
    /// ItemDatabase for display metadata — never mutates inventory state
    /// itself (clicks/drags call back into InventorySystem, this class only
    /// renders). Slot prefab instantiation is left to SceneBootstrapper's
    /// generated hierarchy; this controller just needs a container transform.
    /// </summary>
    public class InventoryPanelController : MonoBehaviour
    {
        [SerializeField] Transform slotContainer;
        [SerializeField] GameObject slotPrefab;
        [SerializeField] ItemDatabase itemDatabase;

        InventorySystem inventory;

        public void Bind(InventorySystem inv)
        {
            inventory = inv;
            Refresh();
        }

        public void Refresh()
        {
            if (slotContainer == null || inventory == null) return;
            for (int i = slotContainer.childCount - 1; i >= 0; i--)
                Destroy(slotContainer.GetChild(i).gameObject);

            foreach (var stack in inventory.Items)
            {
                if (stack.IsEmpty) continue;
                var def = itemDatabase != null ? itemDatabase.GetItem(stack.itemId) : null;
                var slotGO = slotPrefab != null ? Instantiate(slotPrefab, slotContainer) : new GameObject($"Slot_{stack.itemId}");
                if (slotPrefab == null) slotGO.transform.SetParent(slotContainer, false);
                var slotUI = slotGO.GetComponent<InventorySlotView>();
                if (slotUI == null) slotUI = slotGO.AddComponent<InventorySlotView>();
                slotUI.SetData(def, stack.count);
            }
        }
    }
}
