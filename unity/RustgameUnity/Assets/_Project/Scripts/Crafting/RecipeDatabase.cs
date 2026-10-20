using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Rustgame.Crafting
{
    [CreateAssetMenu(menuName = "Rustgame/Recipe Database", fileName = "RecipeDatabase")]
    public class RecipeDatabase : ScriptableObject
    {
        public List<RecipeDefinition> recipes = new List<RecipeDefinition>();

        Dictionary<string, RecipeDefinition> lookup;

        public RecipeDefinition GetRecipe(string id)
        {
            if (lookup == null) lookup = recipes.Where(r => r != null).ToDictionary(r => r.id, r => r);
            return lookup.TryGetValue(id, out var recipe) ? recipe : null;
        }

        void OnValidate() => lookup = null;
    }
}
