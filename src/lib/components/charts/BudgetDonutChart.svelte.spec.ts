import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BudgetDonutChart from './BudgetDonutChart.svelte';

describe('BudgetDonutChart.svelte (AC-18 Visual Budget Donut)', () => {
	it('renders budget utilization with correct ZAR figures and percentage', async () => {
		render(BudgetDonutChart, {
			spentCents: 350000,
			targetCents: 500000,
			remainingCents: 150000,
			percentage: 70,
			status: 'normal'
		});

		await expect.element(page.getByText('Budget Utilization')).toBeInTheDocument();
		await expect.element(page.getByText('70%', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('R 3 500.00')).toBeInTheDocument();
		await expect.element(page.getByText('R 5 000.00')).toBeInTheDocument();
		await expect.element(page.getByText('R 1 500.00')).toBeInTheDocument();
	});

	it('renders alert styling and "Over budget" status when over budget', async () => {
		render(BudgetDonutChart, {
			spentCents: 600000,
			targetCents: 500000,
			remainingCents: -100000,
			percentage: 120,
			status: 'exceeded'
		});

		await expect.element(page.getByText('120%', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('Over budget')).toBeInTheDocument();
		await expect.element(page.getByText('R 1 000.00')).toBeInTheDocument();
	});

	it('renders category view toggle when categoryBreakdown is provided with spend', async () => {
		render(BudgetDonutChart, {
			spentCents: 300000,
			targetCents: 500000,
			remainingCents: 200000,
			percentage: 60,
			categoryBreakdown: [
				{ id: 'cat-1', name: 'Groceries', spentCents: 200000, colorHex: '#10B981' },
				{ id: 'cat-2', name: 'Fuel', spentCents: 100000, colorHex: '#3B82F6' }
			]
		});

		const categoryBtn = page.getByRole('button', { name: 'By Category' });
		await expect.element(categoryBtn).toBeInTheDocument();
		await categoryBtn.click();

		await expect.element(page.getByText('Category Distribution')).toBeInTheDocument();
		await expect.element(page.getByText('Groceries')).toBeInTheDocument();
		await expect.element(page.getByText('Fuel')).toBeInTheDocument();
	});
});
