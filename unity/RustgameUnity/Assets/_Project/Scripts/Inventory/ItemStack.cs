using System;

namespace Rustgame.Inventory
{
    [Serializable]
    public struct ItemStack
    {
        public string itemId;
        public int count;

        public ItemStack(string itemId, int count)
        {
            this.itemId = itemId;
            this.count = count;
        }

        public bool IsEmpty => count <= 0 || string.IsNullOrEmpty(itemId);

        public static readonly ItemStack Empty = new ItemStack(null, 0);
    }
}
