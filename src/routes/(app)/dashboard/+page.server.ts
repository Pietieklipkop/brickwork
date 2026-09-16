import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { expense as expenseTable, category as categoryTable } from '$lib/server/db/schema';
import { calculateCycleWindow } from '$lib/domain/billing';
import { calculateBudgetStatus } from '$lib/domain/currency';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { activeCompany, user, categories } = await parent();

	const startDay = user.monthStartDay ?? 1;
	const cycleWindow = calculateCycleWindow(startDay);

	if (!platform?.env?.DB) {
		return {
			cycleWindow,
			metrics: {
				totalSpentCents: 0,
				totalTargetCents: 0,
				remainingCents: 0,
				percentage: 0
			},
			categoryBudgets: [],
			recentExpenses: []
		};
	}

	const db = getDb(platform.env.DB);

	// Fetch all expenses in the current billing cycle for active company
	const cycleExpenses = await db
		.select()
		.from(expenseTable)
		.where(
			and(
				eq(expenseTable.companyId, activeCompany.id),
				gte(expenseTable.transactionDate, cycleWindow.startDate),
				lte(expenseTable.transactionDate, cycleWindow.endDate)
			)
		);

	// Compute category budgets
	const categoryBudgets = categories.map((cat) => {
		const catExpenses = cycleExpenses.filter((e) => e.categoryId === cat.id);
		const spentCents = catExpenses.reduce((acc, curr) => acc + curr.amountCents, 0);
		const targetCents = cat.monthlyTargetCents;
		const budgetStatus = calculateBudgetStatus(spentCents, targetCents);

		return {
			id: cat.id,
			name: cat.name,
			colorHex: cat.colorHex,
			spentCents,
			targetCents,
			percentage: budgetStatus.percentage,
			status: budgetStatus.status
		};
	});

	// Totals
	const totalSpentCents = cycleExpenses.reduce((acc, curr) => acc + curr.amountCents, 0);
	const totalTargetCents = categories.reduce((acc, curr) => acc + curr.monthlyTargetCents, 0);
	const remainingCents = totalTargetCents - totalSpentCents;
	const overallStatus = calculateBudgetStatus(totalSpentCents, totalTargetCents);

	// 5 most recent expenses for this company
	const recentExpenses = await db
		.select({
			id: expenseTable.id,
			vendorName: expenseTable.vendorName,
			amountCents: expenseTable.amountCents,
			transactionDate: expenseTable.transactionDate,
			receiptImageKey: expenseTable.receiptImageKey,
			notes: expenseTable.notes,
			categoryId: expenseTable.categoryId,
			categoryName: categoryTable.name,
			categoryColor: categoryTable.colorHex
		})
		.from(expenseTable)
		.leftJoin(categoryTable, eq(expenseTable.categoryId, categoryTable.id))
		.where(eq(expenseTable.companyId, activeCompany.id))
		.orderBy(desc(expenseTable.transactionDate), desc(expenseTable.createdAt))
		.limit(5);

	return {
		cycleWindow,
		metrics: {
			totalSpentCents,
			totalTargetCents,
			remainingCents,
			percentage: overallStatus.percentage,
			status: overallStatus.status
		},
		categoryBudgets,
		recentExpenses
	};
};
