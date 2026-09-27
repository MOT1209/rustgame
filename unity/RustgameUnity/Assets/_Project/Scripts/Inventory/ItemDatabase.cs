using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Rustgame.Inventory
{
    [CreateAssetMenu(menuName = "Rustgame/Item Database", fileName = "ItemDatabase")]
    public class ItemDatabase : ScriptableObject
    {
        public List<ItemDefinition> items = new();
        public List<ConsumableEffect> consumableEffects = new();

        Dictionary<string, ItemDefinition> lookup;
        Dictionary<string, ConsumableEffect> effectLookup;

        void BuildLookupIfNeeded()
        {
            if (lookup != null) return;
            lookup = items.Where(i => i != null).ToDictionary(i => i.id, i => i);
            effectLookup = consumableEffects.Where(e => e != null && e.item != null).ToDictionary(e => e.item.id, e => e);
        }

        public ItemDefinition GetItem(string id)
        {
            BuildLookupIfNeeded();
            return lookup.TryGetValue(id, out var item) ? item : null;
        }

        public int GetStackLimit(string id) => GetItem(id)?.stackLimit ?? 999;

        public bool IsKnownItem(string id) => !string.IsNullOrEmpty(id) && GetItem(id) != null;

        public ConsumableEffect GetConsumableEffect(string id)
        {
            BuildLookupIfNeeded();
            return effectLookup.TryGetValue(id, out var fx) ? fx : null;
        }

        void OnValidate() => lookup = null; // rebuild after editor changes
    }
}
