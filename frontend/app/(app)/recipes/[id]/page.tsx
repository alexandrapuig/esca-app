'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getRecipes, updateRecipe, type RecipeSuggestion } from '@/lib/api';

function difficultyStyles(level: RecipeSuggestion['difficulty']): string {
	if (level === 'hard') {
		return 'bg-red-100 text-red-800';
	}

	if (level === 'medium') {
		return 'bg-amber-100 text-amber-900';
	}

	return 'bg-emerald-100 text-emerald-800';
}

function statusStyles(status: string): string {
	if (status === 'owned') {
		return 'bg-emerald-100 text-emerald-800';
	}

	if (status === 'partial') {
		return 'bg-amber-100 text-amber-900';
	}

	if (status === 'staple') {
		return 'bg-stone-100 text-stone-700';
	}

	return 'bg-gray-100 text-gray-700';
}

function statusLabel(status: string): string {
	if (status === 'owned') {
		return 'Have it';
	}

	if (status === 'partial') {
		return 'Need more';
	}

	if (status === 'staple') {
		return 'Staple';
	}

	return 'Need to buy';
}

export default function RecipeDetailPage() {
	const params = useParams<{ id: string }>();
	const recipeId = params.id;

	const [recipe, setRecipe] = useState<RecipeSuggestion | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	useEffect(() => {
		async function loadRecipe() {
			setIsLoading(true);
			const result = await getRecipes();

			if (!result.success) {
				setErrorMessage(result.error);
				setIsLoading(false);
				return;
			}

			const match = result.data.find((candidate) => candidate.id === recipeId);

			if (!match) {
				setNotFound(true);
				setIsLoading(false);
				return;
			}

			setRecipe(match);
			setIsLoading(false);
		}

		void loadRecipe();
	}, [recipeId]);

	async function handleFlagUpdate(payload: { saved?: boolean; cooked?: boolean }) {
		if (!recipe) {
			return;
		}

		const result = await updateRecipe(recipe.id, payload);

		if (!result.success) {
			setErrorMessage(result.error);
			return;
		}

		setRecipe(result.data);
	}

	if (isLoading) {
		return (
			<main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
				<div className="mx-auto w-full max-w-3xl">
					<div className="h-8 w-2/3 animate-pulse rounded-full bg-gray-200" />
					<div className="mt-6 h-4 w-full animate-pulse rounded-full bg-gray-100" />
					<div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-gray-100" />
				</div>
			</main>
		);
	}

	if (notFound || !recipe) {
		return (
			<main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
				<div className="mx-auto w-full max-w-3xl text-center">
					<p className="font-serif text-2xl leading-snug">Recipe not found</p>
					<p className="mt-2 text-sm font-light text-gray-600">
						It may have been replaced when new suggestions were generated. Saved recipes are kept.
					</p>
					<Link
						href="/recipes"
						className="mt-5 inline-flex rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
					>
						Back to recipes
					</Link>
				</div>
			</main>
		);
	}

	// Recipes generated before ingredient tagging have an empty details array.
	// Fall back to the plain ingredients list so older recipes still render.
	const details =
		recipe.ingredient_details && recipe.ingredient_details.length > 0
			? recipe.ingredient_details
			: recipe.ingredients.map((text) => ({ text, status: 'unknown' as const }));

	const hasTags = recipe.ingredient_details && recipe.ingredient_details.length > 0;
	const ownedCount = details.filter(
		(detail) => detail.status === 'owned' || detail.status === 'staple',
	).length;

	return (
		<main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Recipe</p>
						<h1 className="mt-3 font-serif text-4xl leading-tight">{recipe.name}</h1>
					</div>
					<Link
						href="/recipes"
						className="inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-400"
					>
						Back to recipes
					</Link>
				</div>

				{errorMessage ? (
					<div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div>
				) : null}

				<p className="text-base font-light leading-relaxed text-gray-700">{recipe.description}</p>

				<div className="flex flex-wrap items-center gap-3">
					<span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${difficultyStyles(recipe.difficulty)}`}>
						{recipe.difficulty}
					</span>
					<span className="text-xs font-medium uppercase tracking-wide text-gray-500">
						⏱ {recipe.prep_time_minutes} min
					</span>
					{recipe.dietary_tags.map((tag) => (
						<span
							key={tag}
							className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
						>
							{tag}
						</span>
					))}
				</div>

				<section className="rounded-2xl border border-gray-200 p-6 md:p-8">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<h2 className="font-serif text-2xl leading-snug">Ingredients</h2>
						{hasTags ? (
							<p className="text-sm font-light text-gray-600">
								You have {ownedCount} of {details.length}
							</p>
						) : null}
					</div>

					<ul className="mt-5 space-y-3">
						{details.map((detail, index) => (
							<li key={`${recipe.id}-ingredient-${index}`} className="flex flex-wrap items-baseline gap-3">
								<span className="text-sm text-gray-900">{detail.text}</span>
								{detail.status !== 'unknown' ? (
									<span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles(detail.status)}`}>
										{statusLabel(detail.status)}
									</span>
								) : null}
								{'note' in detail && detail.note ? (
									<span className="text-xs font-light text-gray-600">{detail.note}</span>
								) : null}
							</li>
						))}
					</ul>
				</section>

				<section className="rounded-2xl border border-gray-200 p-6 md:p-8">
					<h2 className="font-serif text-2xl leading-snug">Instructions</h2>
					<ol className="mt-5 space-y-4">
						{recipe.instructions.map((step, index) => (
							<li key={`${recipe.id}-step-${index}`} className="flex gap-4">
								<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-xs font-medium text-white">
									{index + 1}
								</span>
								<span className="text-sm font-light leading-relaxed text-gray-700">{step}</span>
							</li>
						))}
					</ol>
				</section>

				<section className="rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
					<h2 className="text-sm font-medium text-gray-900">Why this helps</h2>
					<p className="mt-2 text-sm font-light leading-relaxed text-gray-600">{recipe.reasoning}</p>
				</section>

				<div className="flex flex-wrap gap-3">
					<button
						type="button"
						onClick={() => handleFlagUpdate({ saved: !recipe.saved })}
						className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400"
					>
						{recipe.saved ? '♥ Saved' : '♡ Save'}
					</button>
					<button
						type="button"
						onClick={() => handleFlagUpdate({ cooked: !recipe.cooked })}
						className="rounded-full border border-emerald-300 px-5 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
					>
						{recipe.cooked ? '✓ Cooked' : 'Made It'}
					</button>
				</div>
			</div>
		</main>
	);
}
