import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CategoryBudgetCard from './CategoryBudgetCard.svelte';

describe('CategoryBudgetCard.svelte', () => {
	it('renders category name and spent/target currency values', async () => {
		render(CategoryBudgetCard, {
			name: 'Groceries',
			spentCents: 350000,
			targetCents: 500000
		});

		await expect.element(page.getByText('Groceries')).toBeInTheDocument();
		await expect.element(page.getByText('Safe (70%)')).toBeInTheDocument();
		await expect.element(page.getByText('R 3 500.00')).toBeInTheDocument();
	});

	it('renders warning status when spend is between 80% and 99%', async () => {
		render(CategoryBudgetCard, {
			name: 'Fuel',
			spentCents: 450000,
			targetCents: 500000
		});

		await expect.element(page.getByText('Warning (90%)')).toBeInTheDocument();
		await expect.element(page.getByText('Remaining:')).toBeInTheDocument();
	});

	it('renders over budget status when spend exceeds target', async () => {
		render(CategoryBudgetCard, {
			name: 'Dining',
			spentCents: 600000,
			targetCents: 500000
		});

		await expect.element(page.getByText('Over Budget (120%)')).toBeInTheDocument();
		await expect.element(page.getByText('Exceeded by R 1 000.00')).toBeInTheDocument();
	});
});
