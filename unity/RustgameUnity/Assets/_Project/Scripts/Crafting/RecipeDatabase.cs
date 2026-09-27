using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Rustgame.Crafting
{
    [CreateAssetMenu(menuName = "Rustgame/Recipe Database", fileName = "RecipeDatabase")]
    public class RecipeDatabase : ScriptableObject
    {
        public List<RecipeDefinition> recipes = new();

        Dictionary<string, RecipeDefinition> lookup;

        public RecipeDefinition GetRecipe(string id)
        {
            lookup ??= recipes.Where(r => r != null).ToDictionary(r => r.id, r => r);
            return lookup.TryGetValue(id, out var recipe) ? recipe : null;
        }

        void OnValidate() => lookup = null;
    }
}
