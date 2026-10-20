using System.Collections.Generic;
using NUnit.Framework;
using Rustgame.Inventory;

namespace Rustgame.Tests
{
    /// <summary>
    /// Port of the storage-inventory invariants the JS test suite covers
    /// (js/inventory/storage.js + tests/phase1.test.mjs): no negative counts,
    /// unknown items rejected, stack limits respected and the 12-slot storage
    /// box cap enforced.
    /// </summary>
    public class InventorySystemTests
    {
        static InventorySystem Make(int maxSlots = 0, int stackLimit = 1000)
        {
            return new InventorySystem(_ => stackLimit, _ => true, maxSlots);
        }

        [Test]
        public void Add_StoresItems_AndReportsCount()
        {
            var inv = Make();
            Assert.AreEqual(0, inv.Count("wood"));
            Assert.AreEqual(12, inv.Add("wood", 12));
            Assert.AreEqual(12, inv.Count("wood"));
        }

        [Test]
        public void Add_NeverGoesNegative_AndIgnoresNonPositiveAmounts()
        {
            var inv = Make();
            Assert.AreEqual(0, inv.Add("wood", 0));
            Assert.AreEqual(0, inv.Add("wood", -5));
            Assert.AreEqual(0, inv.Count("wood"));
        }

        [Test]
        public void Add_RejectsUnknownItems()
        {
            var inv = new InventorySystem(_ => 100, id => id == "wood");
            Assert.AreEqual(0, inv.Add("gold", 1));
            Assert.AreEqual(0, inv.Count("gold"));
        }

        [Test]
        public void Add_RespectsStackLimit()
        {
            var inv = Make(stackLimit: 10);
            Assert.AreEqual(10, inv.Add("wood", 25));
            Assert.AreEqual(10, inv.Count("wood"));
            Assert.AreEqual(0, inv.Add("wood", 1));
        }

        [Test]
        public void MaxSlots_CapsDistinctItemTypes()
        {
            var inv = Make(maxSlots: 2);
            Assert.AreEqual(1, inv.Add("wood", 1));
            Assert.AreEqual(1, inv.Add("stone", 1));
            Assert.AreEqual(0, inv.Add("iron", 1)); // no free slot left
        }

        [Test]
        public void MaxSlots_DoesNotBlockRestockingAnExistingStack()
        {
            var inv = Make(maxSlots: 1);
            Assert.AreEqual(5, inv.Add("wood", 5));
            Assert.AreEqual(5, inv.Add("wood", 5));
            Assert.AreEqual(10, inv.Count("wood"));
        }

        [Test]
        public void Remove_ReturnsAmountActuallyRemoved()
        {
            var inv = Make();
            inv.Add("wood", 10);
            Assert.AreEqual(4, inv.Remove("wood", 4));
            Assert.AreEqual(6, inv.Count("wood"));
            Assert.AreEqual(6, inv.Remove("wood", 99)); // clamped
            Assert.AreEqual(0, inv.Count("wood"));
        }

        [Test]
        public void Consume_IsAllOrNothing()
        {
            var inv = Make();
            inv.Add("wood", 3);
            Assert.IsFalse(inv.Consume("wood", 4));
            Assert.AreEqual(3, inv.Count("wood"));
            Assert.IsTrue(inv.Consume("wood", 3));
            Assert.AreEqual(0, inv.Count("wood"));
        }

        [Test]
        public void TransferTo_ReturnsLeftoversToTheSource()
        {
            var source = Make();
            var target = Make(maxSlots: 1);

            source.Add("wood", 5);
            source.Add("stone", 5);
            target.Add("wood", 1); // the target's only slot is taken

            var moved = source.TransferTo(target, "stone", 5);
            Assert.AreEqual(0, moved);
            Assert.AreEqual(5, source.Count("stone")); // came back to the source
        }

        [Test]
        public void CanAccept_ChecksStackRoomAndFreeSlots()
        {
            var inv = Make(maxSlots: 1, stackLimit: 10);
            Assert.IsTrue(inv.CanAccept("wood", 10));
            Assert.IsFalse(inv.CanAccept("wood", 11));

            inv.Add("wood", 10);
            Assert.IsFalse(inv.CanAccept("wood", 1)); // stack full
            Assert.IsFalse(inv.CanAccept("stone", 1)); // no free slot
        }

        [Test]
        public void Total_SumsEveryStack()
        {
            var inv = Make();
            inv.Add("wood", 3);
            inv.Add("stone", 4);
            Assert.AreEqual(7, inv.Total());
        }
    }
}
