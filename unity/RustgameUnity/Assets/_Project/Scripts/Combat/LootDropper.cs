using Rustgame.Inventory;

namespace Rustgame.Combat
{
    /// <summary>
    /// Grants an EnemyDefinition's lootTable directly to the player on death —
    /// verified from game.js: `Object.entries(loot).forEach(([id, count]) =>
    /// addItem(id, count))` in NPC.die(), i.e. loot is granted automatically
    /// on kill, NOT looted separately via E. (This resolves an open question
    /// from the original PRD's "الأسئلة المفتوحة" section, which asked whether
    /// animals should drop raw meat directly or via an E-loot interaction —
    /// the shipped code's answer is "directly, automatically", though note it
    /// only grants cloth/leather/scrap/frag, never raw_meat itself, in the
    /// current recipe set.)
    /// </summary>
    public static class LootDropper
    {
        public static void Grant(EnemyDefinition definition, InventorySystem playerInventory)
        {
            if (definition == null || playerInventory == null) return;
            foreach (var stack in definition.lootTable)
                playerInventory.Add(stack.itemId, stack.count);
        }
    }
}
