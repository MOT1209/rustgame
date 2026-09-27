using System;
using System.Collections.Generic;
using System.Linq;

namespace Rustgame.Inventory
{
    /// <summary>
    /// Pure C# port of js/inventory/storage.js StorageInventory — same invariants:
    /// no negative counts, no unknown items (when a registry is supplied), stack
    /// limits respected, and an optional maxSlots cap on distinct item types
    /// (added to the JS version after an audit found the box's advertised
    /// "12 stacks" limit was never actually enforced — see docs/UNITY_PORT_PLAN.md).
    /// No MonoBehaviour dependency: fully unit-testable in isolation.
    /// </summary>
    public class InventorySystem
    {
        readonly List<ItemStack> items = new();
        readonly Func<string, int> stackLimitLookup;
        readonly Func<string, bool> isKnownItem;

        /// <summary>Max number of distinct item stacks. 0 = unlimited. Restocking an
        /// item already present never counts against this limit.</summary>
        public int MaxSlots { get; }

        public IReadOnlyList<ItemStack> Items => items;

        public InventorySystem(Func<string, int> stackLimitLookup, Func<string, bool> isKnownItem = null, int maxSlots = 0)
        {
            this.stackLimitLookup = stackLimitLookup ?? (_ => int.MaxValue);
            this.isKnownItem = isKnownItem ?? (_ => true);
            MaxSlots = Math.Max(0, maxSlots);
        }

        public int Count(string itemId)
        {
            var idx = items.FindIndex(i => i.itemId == itemId);
            return idx >= 0 ? items[idx].count : 0;
        }

        public bool Has(string itemId, int amount = 1) => amount > 0 && Count(itemId) >= amount;

        /// <summary>Add items. Returns amount actually added (0 if unknown item,
        /// stack cap reached, or all slots taken by a different item type).</summary>
        public int Add(string itemId, int amount = 1)
        {
            if (string.IsNullOrEmpty(itemId) || !isKnownItem(itemId)) return 0;
            if (amount <= 0) return 0;

            var idx = items.FindIndex(i => i.itemId == itemId);
            if (idx < 0 && MaxSlots > 0 && items.Count >= MaxSlots) return 0;

            var limit = stackLimitLookup(itemId);
            var current = idx >= 0 ? items[idx].count : 0;
            var room = Math.Max(0, limit - current);
            var actual = Math.Min(room, amount);
            if (actual <= 0) return 0;

            if (idx >= 0) items[idx] = new ItemStack(itemId, current + actual);
            else items.Add(new ItemStack(itemId, actual));
            return actual;
        }

        /// <summary>Remove items. Returns amount actually removed. Never negative.</summary>
        public int Remove(string itemId, int amount = 1)
        {
            if (amount <= 0) return 0;
            var idx = items.FindIndex(i => i.itemId == itemId);
            if (idx < 0) return 0;
            var stack = items[idx];
            var actual = Math.Min(stack.count, amount);
            var remaining = stack.count - actual;
            if (remaining <= 0) items.RemoveAt(idx);
            else items[idx] = new ItemStack(itemId, remaining);
            return actual;
        }

        /// <summary>All-or-nothing removal. Returns true only if the full amount was consumed.</summary>
        public bool Consume(string itemId, int amount = 1)
        {
            if (!Has(itemId, amount)) return false;
            Remove(itemId, amount);
            return true;
        }

        /// <summary>Move items to another inventory. Any leftover the destination
        /// couldn't accept is returned to this inventory — never silently lost
        /// (matches StorageInventory.transferTo).</summary>
        public int TransferTo(InventorySystem other, string itemId, int amount = 1)
        {
            if (other == null) return 0;
            var removed = Remove(itemId, amount);
            if (removed <= 0) return 0;
            var added = other.Add(itemId, removed);
            if (added < removed) Add(itemId, removed - added);
            return added;
        }

        public int Total() => items.Sum(i => i.count);
    }
}
