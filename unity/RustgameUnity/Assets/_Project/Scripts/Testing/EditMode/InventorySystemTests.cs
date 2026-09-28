using NUnit.Framework;
using Rustgame.Inventory;

namespace Rustgame.Tests.EditMode
{
    /// <summary>Mirrors tests/phase1.test.mjs's storage suite, including the
    /// maxSlots behavior added after the JS audit found the box's advertised
    /// 12-stack limit was never actually enforced.</summary>
    public class InventorySystemTests
    {
        static int StackLimit(string id) => id == "berry" ? 20 : 999;
        static bool Known(string id) => id != "nuke";

        [Test]
        public void Add_Has_Consume_NoNegatives()
        {
            var inv = new InventorySystem(StackLimit, Known);
            Assert.AreEqual(5, inv.Add("wood", 5));
            Assert.IsTrue(inv.Has("wood", 5));
            Assert.IsFalse(inv.Consume("wood", 10));
            Assert.AreEqual(5, inv.Count("wood"));
            Assert.IsTrue(inv.Consume("wood", 3));
            Assert.AreEqual(2, inv.Count("wood"));
        }

        [Test]
        public void Add_RejectsUnknown_RespectsStackLimit()
        {
            var inv = new InventorySystem(StackLimit, Known);
            Assert.AreEqual(0, inv.Add("nuke", 5));
            Assert.AreEqual(20, inv.Add("berry", 999));
        }

        [Test]
        public void TransferTo_ReturnsLeftoverInsteadOfLosingIt()
        {
            var a = new InventorySystem(StackLimit, Known);
            var b = new InventorySystem(StackLimit, Known);
            a.Add("wood", 10);

            Assert.AreEqual(4, a.TransferTo(b, "wood", 4));
            Assert.AreEqual(6, a.Count("wood"));
            Assert.AreEqual(4, b.Count("wood"));
        }

        [Test]
        public void MaxSlots_CapsDistinctStacks_NotRestocks()
        {
            var inv = new InventorySystem(StackLimit, Known, maxSlots: 2);
            Assert.AreEqual(5, inv.Add("wood", 5));
            Assert.AreEqual(5, inv.Add("stone", 5));
            Assert.AreEqual(0, inv.Add("cloth", 5)); // both slots taken

            Assert.AreEqual(5, inv.Add("wood", 5)); // restocking an existing slot is never blocked
            Assert.AreEqual(10, inv.Count("wood"));

            inv.Remove("stone", 5);
            Assert.AreEqual(3, inv.Add("cloth", 3)); // slot freed up
        }
    }
}
