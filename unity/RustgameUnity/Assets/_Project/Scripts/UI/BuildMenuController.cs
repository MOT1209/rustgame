using UnityEngine;

namespace Rustgame.UI
{
    /// <summary>Blueprint selector shown on Q (matches BUILDING_SYSTEM.md's
    /// radial menu: Foundation/Wall/Doorway/Ceiling/Tool Cupboard/Wooden Door).
    /// Pure selection state — actual placement logic belongs to a
    /// BuildingPlacer (not yet built; this controller only needs to exist so
    /// the placer has something to read the current selection from).</summary>
    public class BuildMenuController : MonoBehaviour
    {
        public enum BlueprintPiece { None, Foundation, Wall, Doorway, Ceiling, ToolCupboard, WoodenDoor }

        public BlueprintPiece Selected { get; private set; } = BlueprintPiece.None;
        public bool IsOpen { get; private set; }

        public void Toggle() => IsOpen = !IsOpen;
        public void Close() => IsOpen = false;

        public void Select(BlueprintPiece piece)
        {
            Selected = piece;
            IsOpen = false;
        }

        public void Cancel() => Selected = BlueprintPiece.None;
    }
}
