import { generateRecipesWithClaude, type RecipeSuggestionResult } from './aiService';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';
import { trackEvent } from './analyticsService';

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
      return { success: true, data: [] };
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('dietary_restrictions')
      .eq('id', params.userId)
      .single<UserRow>();

    const { data: inventoryRows } = await supabase
      .from('fridge_items')
      .select('name, category, quantity, unit')
      .eq('household_id', params.householdId)
      .eq('status', 'fresh')
      .returns<{ name: string; category: string | null; quantity: number | null; unit: string | null }[]>();

    // What the household kept from previous generations. Cooked is the
    // stronger signal; both are sent and labelled. Capped at 20 so a long
    // history does not crowd out the inventory in the prompt.
    const { data: historyRows } = await supabase
      .from('recipe_suggestions')
      .select('name, cuisine, difficulty, saved, cooked')
      .eq('household_id', params.householdId)
      .or('saved.eq.true,cooked.eq.true')
      .order('created_at', { ascending: false })
      .limit(20)
      .returns<{ name: string; cuisine: string; difficulty: string; saved: boolean; cooked: boolean }[]>();

    let recipes: RecipeSuggestionResult[];

    try {
      recipes = await generateRecipesWithClaude({
        atRiskItems: atRiskItems.map((item) => ({
          item_name: item.name,
          category: item.category,
          risk_level: item.risk_level,
        })),
        inventory: (inventoryRows ?? []).map((item) => ({
          item_name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
        })),
        history: (historyRows ?? []).map((row) => ({
          name: row.name,
          cuisine: row.cuisine,
          difficulty: row.difficulty,
          cooked: row.cooked,
        })),
        dietaryRestrictions: userRow?.dietary_restrictions ?? [],
      });
    } catch (error) {
      console.error('generateRecipesWithClaude failed', error);
      // No fabricated fallback: a made-up recipe reads as real and is worse
      // than an honest failure. Same reasoning as barcode identification.

      // TEMPORARY DIAGNOSTIC: the fixed message above reported every failure
      // as a timeout, including ones that failed in 38s. Surface the real
      // error so the job row says what actually threw. Revert after.
      const err = error as {
        message?: string;
        code?: string;
        response?: { status?: number; data?: unknown };
      };

      const parts = [
        `message=${err?.message ?? 'none'}`,
        `code=${err?.code ?? 'none'}`,
        `httpStatus=${err?.response?.status ?? 'none'}`,
        `body=${err?.response?.data ? JSON.stringify(err.response.data).slice(0, 300) : 'none'}`,
      ];

      return {
        success: false,
        status: 503,
        error: `DIAGNOSTIC: ${parts.join(' | ')}`,
      };
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
        ingredient_details: recipe.ingredient_details,
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
      .select('id, name, description, cuisine, dietary_tags, ingredients, ingredient_details, instructions, difficulty, prep_time_minutes, reasoning, saved, cooked, created_at')
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
      .select('id, name, description, cuisine, dietary_tags, ingredients, ingredient_details, instructions, difficulty, prep_time_minutes, reasoning, saved, cooked, created_at')
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

// --- Async generation jobs ---
//
// Claude calls run close to the platform function limit, so generation moved
// off the request path. The route creates a job and returns; this runs it.

const STALE_JOB_MINUTES = 5;

export type RecipeJob = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  error: string | null;
  recipe_count: number | null;
  created_at: string;
};

const JOB_COLUMNS = 'id, status, error, recipe_count, created_at';

/**
 * Returns the household's in-flight job if one exists, otherwise creates one.
 * A job left pending or running past STALE_JOB_MINUTES is treated as dead --
 * a crashed run must not block every future generation.
 */
export async function createOrReturnRecipeJob(params: {
  userId: string;
  householdId: string;
}): Promise<{ success: true; data: RecipeJob; created: boolean } | { success: false; status: number; error: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const cutoff = new Date(Date.now() - STALE_JOB_MINUTES * 60 * 1000).toISOString();

    const { data: existing, error: existingError } = await supabase
      .from('recipe_generation_jobs')
      .select(JOB_COLUMNS)
      .eq('household_id', params.householdId)
      .in('status', ['pending', 'running'])
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<RecipeJob[]>();

    if (existingError) {
      return { success: false, status: 500, error: 'Unable to check for running generation' };
    }

    const [inFlight] = existing ?? [];

    if (inFlight) {
      return { success: true, data: inFlight, created: false };
    }

    const { data: created, error: insertError } = await supabase
      .from('recipe_generation_jobs')
      .insert({ household_id: params.householdId, user_id: params.userId, status: 'pending' })
      .select(JOB_COLUMNS)
      .single<RecipeJob>();

    if (insertError || !created) {
      return { success: false, status: 500, error: 'Unable to start recipe generation' };
    }

    return { success: true, data: created, created: true };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to start recipe generation',
    };
  }
}

export async function getRecipeJob(params: {
  jobId: string;
  householdId: string;
}): Promise<{ success: true; data: RecipeJob } | { success: false; status: number; error: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('recipe_generation_jobs')
      .select(JOB_COLUMNS)
      .eq('id', params.jobId)
      .eq('household_id', params.householdId)
      .single<RecipeJob>();

    if (error || !data) {
      return { success: false, status: 404, error: 'Job not found' };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to fetch job',
    };
  }
}

/**
 * Runs a job to completion. Deliberately never throws: it is called without
 * await from the route, so an unhandled rejection would have nowhere to go.
 * Every outcome is written to the job row instead.
 */
export async function runRecipeJob(params: {
  jobId: string;
  userId: string;
  householdId: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();

  async function setStatus(fields: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .from('recipe_generation_jobs')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', params.jobId);

    if (error) {
      console.error('recipe job status update failed', { jobId: params.jobId, error });
    }
  }

  await setStatus({ status: 'running' });

  try {
    const result = await generateRecipesForUser({
      userId: params.userId,
      householdId: params.householdId,
    });

    void trackEvent({
      eventName: 'recipes_generated',
      userId: params.userId,
      householdId: params.householdId,
      properties: {
        success: result.success,
        count: result.success ? result.data.length : 0,
      },
    });

    if (!result.success) {
      await setStatus({ status: 'failed', error: result.error });
      return;
    }

    await setStatus({ status: 'done', recipe_count: result.data.length });
  } catch (error) {
    await setStatus({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Recipe generation failed',
    });
  }
}
