'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { generateRecipes, getRecipes, type RecipeSuggestion, updateRecipe } from '@/lib/api';

function difficultyStyles(level: RecipeSuggestion['difficulty']): string {
  if (level === 'hard') {
    return 'bg-red-100 text-red-800';
  }

  if (level === 'medium') {
    return 'bg-amber-100 text-amber-900';
  }

  return 'bg-emerald-100 text-emerald-800';
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadRecipes() {
      const result = await getRecipes();

      if (!result.success) {
        setErrorMessage(result.error);
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      setRecipes(result.data);
      setIsLoading(false);
    }

    void loadRecipes();
  }, []);

  async function handleGenerateRecipes() {
    setErrorMessage('');
    setIsGenerating(true);

    const result = await generateRecipes();

    if (!result.success) {
      setErrorMessage(result.error);
      setIsGenerating(false);
      return;
    }

    const latest = await getRecipes();

    if (latest.success) {
      setRecipes(latest.data);
    }

    setIsGenerating(false);
  }

  async function handleFlagUpdate(recipeId: string, payload: { saved?: boolean; cooked?: boolean }) {
    const result = await updateRecipe(recipeId, payload);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    setRecipes((current) => current.map((recipe) => (recipe.id === recipeId ? result.data : recipe)));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff4df_0%,_#f3f7ec_46%,_#ffffff_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-[2rem] bg-stone-900 px-8 py-8 text-stone-100 shadow-[0_24px_80px_rgba(38,29,18,0.18)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-300">AI recipes</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">Cook what is closest to expiring</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300">
                Recipe suggestions prioritize your medium and high-risk items to reduce food waste.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/inventory"
                className="inline-flex rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Back to inventory
              </Link>
              <button
                type="button"
                onClick={handleGenerateRecipes}
                disabled={isGenerating}
                className="inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? 'Generating...' : 'Generate recipes'}
              </button>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-[1.3rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        {isLoading ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="h-44 animate-pulse rounded-2xl bg-stone-100" />
            <div className="h-44 animate-pulse rounded-2xl bg-stone-100" />
          </section>
        ) : null}

        {!isLoading && recipes.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-stone-800">No recipes yet</h2>
            <p className="mt-2 text-sm text-stone-600">Generate suggestions to use ingredients that are at risk of spoiling.</p>
          </section>
        ) : null}

        {!isLoading && recipes.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {recipes.map((recipe) => (
              <article key={recipe.id} className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_10px_30px_rgba(69,48,17,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold text-stone-900">{recipe.recipe_name}</h2>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${difficultyStyles(recipe.difficulty)}`}>
                    {recipe.difficulty}
                  </span>
                </div>

                <p className="mt-3 text-sm text-stone-700">{recipe.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">Prep time {recipe.prep_time_minutes} min</p>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-stone-800">Ingredients</p>
                  <ul className="mt-2 space-y-1 text-sm text-stone-700">
                    {recipe.ingredients.map((ingredient) => (
                      <li key={`${recipe.id}-${ingredient}`}>• {ingredient}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-stone-800">Why this helps</p>
                  <p className="mt-1 text-sm text-stone-600">{recipe.reasoning}</p>
                </div>

                <div className="mt-auto pt-5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleFlagUpdate(recipe.id, { saved: !recipe.saved })}
                      className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                    >
                      {recipe.saved ? 'Unsave' : 'Save recipe'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFlagUpdate(recipe.id, { cooked: !recipe.cooked })}
                      className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      {recipe.cooked ? 'Mark uncooked' : 'Mark cooked'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
