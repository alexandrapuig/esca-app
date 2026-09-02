import { generateRecipesWithClaude, type RecipeSuggestionResult } from './aiService';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

type AtRiskItem = {
  id: string;
  name: string;
  category: string | null;
  risk_level: 'medium' | 'high';
};

type UserRow = {
  dietary_restrictions: string[] | null;
};

export type StoredRecipeSuggestion = RecipeSuggestionResult & {
  id: string;
  saved: boolean;
  cooked: boolean;
  created_at: string;
};

function fallbackRecipes(atRiskItems: AtRiskItem[]): RecipeSuggestionResult[] {
  const ingredientNames = atRiskItems.map((item) => item.name);

  if (ingredientNames.length === 0) {
    return [];
  }

  return [
    {
      name: 'Quick Zero-Waste Stir Fry',
      description: 'A fast stir fry using your highest-risk ingredients first.',
      cuisine: 'other',
      dietary_tags: [],
      ingredients: ingredientNames,
      instructions: ['Prep ingredients', 'Saute aromatics', 'Cook ingredients by firmness', 'Season and serve'],
      difficulty: 'easy',
      prep_time_minutes: 20,
      reasoning: 'This recipe consumes ingredients that are closest to spoiling.',
    },
  ];
}

export async function generateRecipesForUser(params: {
  userId: string;
  householdId: string;
}): Promise<{ success: true; data: RecipeSuggestionResult[] } | { success: false; status: number; error: string }> {
  try {
    const supabase = getSupabaseAdminClient();

    const { data: atRiskRows, error: atRiskError } = await supabase
      .from('latest_spoilage_predictions')
      .select('fridge_item_id, risk_level, fridge_items!inner(id, name, category, status)')
      .eq('household_id', params.householdId)
      .eq('fridge_items.status', 'fresh')
      .in('risk_level', ['medium', 'high']);

    if (atRiskError) {
      return {
        success: false,
        status: 500,
        error: 'Unable to load at-risk items',
      };
    }

    const atRiskItems: AtRiskItem[] = (atRiskRows ?? [])
      .map((row) => {
        const joined = row.fridge_items as
          | { id: string; name: string; category: string | null }
          | Array<{ id: string; name: string; category: string | null }>
          | null;

        const item = Array.isArray(joined) ? joined[0] : joined;

        if (!item || (row.risk_level !== 'medium' && row.risk_level !== 'high')) {
          return null;
        }

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          risk_level: row.risk_level,
        } satisfies AtRiskItem;
      })
      .filter((item): item is AtRiskItem => Boolean(item));

    if (atRiskItems.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('dietary_restrictions')
      .eq('id', params.userId)
      .single<UserRow>();

    let recipes: RecipeSuggestionResult[];

    try {
      recipes = await generateRecipesWithClaude({
        atRiskItems: atRiskItems.map((item) => ({
          item_name: item.name,
          category: item.category,
          risk_level: item.risk_level,
        })),
        dietaryRestrictions: userRow?.dietary_restrictions ?? [],
      });
    } catch (error) {
      console.error('generateRecipesWithClaude failed', error);
      recipes = fallbackRecipes(atRiskItems);
    }

    if (recipes.length > 0) {
      // Every generation previously appended, so unsaved suggestions piled up
      // indefinitely. Clear the household's untouched ones first. Saved or
      // cooked recipes survive.
      const { error: dedupeError } = await supabase
        .from('recipe_suggestions')
        .delete()
        .eq('household_id', params.householdId)
        .eq('saved', false)
        .eq('cooked', false);

      // Not fatal: the recipes below are still valid, they will just sit
      // alongside the stale ones. Logged rather than raised.
      if (dedupeError) {
        console.error('recipe dedupe delete failed', {
          householdId: params.householdId,
          error: dedupeError,
        });
      }

      const rows = recipes.map((recipe) => ({
        user_id: params.userId,
        household_id: params.householdId,
        name: recipe.name,
        description: recipe.description,
        cuisine: recipe.cuisine,
        dietary_tags: recipe.dietary_tags,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        difficulty: recipe.difficulty,
        prep_time_minutes: recipe.prep_time_minutes,
        reasoning: recipe.reasoning,
      }));

      const { error: insertError } = await supabase.from('recipe_suggestions').insert(rows);

      // Fatal: returning these recipes without persisting them shows the user
      // suggestions that vanish on reload.
      if (insertError) {
        console.error('recipe insert failed', {
          householdId: params.householdId,
          rowCount: rows.length,
          error: insertError,
        });
        return {
          success: false,
          status: 500,
          error: 'Unable to save recipe suggestions',
        };
      }
    }

    return {
      success: true,
      data: recipes,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to generate recipes',
    };
  }
}

export async function listRecipesForUser(params: { householdId: string }): Promise<{
  success: true;
  data: StoredRecipeSuggestion[];
} | {
  success: false;
  status: number;
  error: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('recipe_suggestions')
      .select('id, name, description, cuisine, dietary_tags, ingredients, instructions, difficulty, prep_time_minutes, reasoning, saved, cooked, created_at')
      .eq('household_id', params.householdId)
      .order('created_at', { ascending: false })
      .returns<StoredRecipeSuggestion[]>();

    if (error) {
      return {
        success: false,
        status: 500,
        error: 'Unable to fetch recipes',
      };
    }

    return {
      success: true,
      data: data ?? [],
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to fetch recipes',
    };
  }
}

export async function updateRecipeSuggestionFlags(params: {
  householdId: string;
  recipeId: string;
  saved?: boolean;
  cooked?: boolean;
}): Promise<{ success: true; data: StoredRecipeSuggestion } | { success: false; status: number; error: string }> {
  try {
    const supabase = getSupabaseAdminClient();

    const updatePayload: {
      saved?: boolean;
      cooked?: boolean;
    } = {};

    if (typeof params.saved === 'boolean') {
      updatePayload.saved = params.saved;
    }

    if (typeof params.cooked === 'boolean') {
      updatePayload.cooked = params.cooked;
    }

    const { data, error } = await supabase
      .from('recipe_suggestions')
      .update(updatePayload)
      .eq('id', params.recipeId)
      .eq('household_id', params.householdId)
      .select('id, name, description, cuisine, dietary_tags, ingredients, instructions, difficulty, prep_time_minutes, reasoning, saved, cooked, created_at')
      .single<StoredRecipeSuggestion>();

    if (error || !data) {
      return {
        success: false,
        status: 500,
        error: 'Unable to update recipe suggestion',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to update recipe suggestion',
    };
  }
}
