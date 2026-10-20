using UnityEngine;
using UnityEngine.UI;
using Rustgame.Inventory;

namespace Rustgame.UI
{
    /// <summary>One rendered slot — icon + count label. Pure view, no logic.</summary>
    public class InventorySlotView : MonoBehaviour
    {
        [SerializeField] Image icon;
        [SerializeField] Text countLabel;

        public void SetData(ItemDefinition def, int count)
        {
            if (icon != null && def != null) icon.sprite = def.icon;
            if (countLabel != null) countLabel.text = count > 1 ? count.ToString() : string.Empty;
        }
    }
}
