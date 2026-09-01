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
    <main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">AI recipes</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight">Cook what is closest to expiring</h1>
            <p className="mt-3 max-w-2xl text-base font-light leading-relaxed text-gray-600">
              Recipe suggestions prioritize your medium and high-risk items to reduce food waste.
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/inventory"
              className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:border-gray-400"
            >
              Back to inventory
            </Link>
            <button
              type="button"
              onClick={handleGenerateRecipes}
              disabled={isGenerating}
              className="inline-flex items-center rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? 'Generating...' : 'Generate recipes'}
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        {isLoading ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="h-44 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-44 animate-pulse rounded-2xl bg-gray-100" />
          </section>
        ) : null}

        {!isLoading && recipes.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
            <h2 className="font-serif text-2xl leading-snug text-gray-900">No recipes yet</h2>
            <p className="mt-2 text-sm font-light text-gray-600">Generate suggestions to use ingredients that are at risk of spoiling.</p>
          </section>
        ) : null}

        {!isLoading && recipes.length > 0 ? (
          <section className="grid gap-6 md:gap-8">
            {recipes.map((recipe) => (
              <article key={recipe.id} className="overflow-hidden rounded-2xl border border-gray-200 transition hover:shadow-lg md:grid md:grid-cols-[320px_1fr]">
                <div
                  className="h-64 bg-cover bg-center md:h-full"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1495511321334-e7b0541e3a00?w=500&h=400&fit=crop')" }}
                />
                <div className="flex flex-col p-6 md:p-8">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-serif text-2xl leading-snug text-gray-900">{recipe.name}</h2>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${difficultyStyles(recipe.difficulty)}`}>
                      {recipe.difficulty}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-light leading-relaxed text-gray-700">{recipe.description}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">⏱ {recipe.prep_time_minutes} min</p>

                  {recipe.dietary_tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.dietary_tags.map((tag) => (
                        <span
                          key={`${recipe.id}-${tag}`}
                          className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900">Ingredients</p>
                    <ul className="mt-2 space-y-1 text-sm font-light text-gray-700">
                      {recipe.ingredients.slice(0, 5).map((ingredient) => (
                        <li key={`${recipe.id}-${ingredient}`}>• {ingredient}</li>
                      ))}
                      {recipe.ingredients.length > 5 ? (
                        <li className="text-gray-500">+ {recipe.ingredients.length - 5} more</li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900">Why this helps</p>
                    <p className="mt-1 text-sm font-light text-gray-600">{recipe.reasoning}</p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => handleFlagUpdate(recipe.id, { saved: !recipe.saved })}
                      className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-400"
                    >
                      {recipe.saved ? '♥ Saved' : '♡ Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFlagUpdate(recipe.id, { cooked: !recipe.cooked })}
                      className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50"
                    >
                      {recipe.cooked ? '✓ Cooked' : 'Made It'}
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
