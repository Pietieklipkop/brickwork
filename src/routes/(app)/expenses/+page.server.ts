import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { expense as expenseTable, category as categoryTable, company as companyTable } from '$lib/server/db/schema';
import { deleteReceiptFromR2 } from '$lib/server/storage';
import { calculateCycleWindow, formatSastIsoDate } from '$lib/domain/billing';
import { and, eq, gte, lte, like, desc, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent, url, platform }) => {
	const { user, companies, activeCompany } = await parent();

	const cycleWindow = calculateCycleWindow(user.monthStartDay ?? 1);

	// Parse search/filter query parameters (AC-09)
	const selectedCompanyId = url.searchParams.get('company') || activeCompany.id;
	const dateFilter = url.searchParams.get('dateFilter') || 'current_cycle';
	let from = url.searchParams.get('from') || '';
	let to = url.searchParams.get('to') || '';
	const vendor = url.searchParams.get('vendor') || '';
	const categoryId = url.searchParams.get('category') || '';

	if (dateFilter === 'current_cycle') {
		from = cycleWindow.startDate;
		to = cycleWindow.endDate;
	}

	if (!platform?.env?.DB) {
		return {
			expenses: [],
			totalFilteredCents: 0,
			filters: { selectedCompanyId, dateFilter, from, to, vendor, categoryId },
			cycleWindow,
			companyCategories: []
		};
	}

	const db = getDb(platform.env.DB);

	// Load categories for the selected company filter
	const companyCategories = await db
		.select()
		.from(categoryTable)
		.where(
			selectedCompanyId === 'all'
				? inArray(categoryTable.companyId, companies.map((c) => c.id))
				: eq(categoryTable.companyId, selectedCompanyId)
		);

	// Build dynamic SQL query filter conditions
	const conditions = [];

	if (selectedCompanyId === 'all') {
		conditions.push(inArray(expenseTable.companyId, companies.map((c) => c.id)));
	} else {
		conditions.push(eq(expenseTable.companyId, selectedCompanyId));
	}

	if (from) {
		conditions.push(gte(expenseTable.transactionDate, from));
	}
	if (to) {
		conditions.push(lte(expenseTable.transactionDate, to));
	}
	if (vendor.trim()) {
		conditions.push(like(expenseTable.vendorName, `%${vendor.trim()}%`));
	}
	if (categoryId && categoryId !== 'all') {
		conditions.push(eq(expenseTable.categoryId, categoryId));
	}

	const expenses = await db
		.select({
			id: expenseTable.id,
			vendorName: expenseTable.vendorName,
			amountCents: expenseTable.amountCents,
			transactionDate: expenseTable.transactionDate,
			receiptImageKey: expenseTable.receiptImageKey,
			notes: expenseTable.notes,
			categoryId: expenseTable.categoryId,
			categoryName: categoryTable.name,
			categoryColor: categoryTable.colorHex,
			companyId: expenseTable.companyId
		})
		.from(expenseTable)
		.leftJoin(categoryTable, eq(expenseTable.categoryId, categoryTable.id))
		.where(and(...conditions))
		.orderBy(desc(expenseTable.transactionDate), desc(expenseTable.createdAt));

	const totalFilteredCents = expenses.reduce((acc, curr) => acc + curr.amountCents, 0);

	return {
		expenses,
		totalFilteredCents,
		filters: { selectedCompanyId, dateFilter, from, to, vendor, categoryId },
		cycleWindow,
		companyCategories
	};
};

export const actions: Actions = {
	updateExpense: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const expenseId = String(data.get('id') || '');
		const vendorName = String(data.get('vendorName') || '').trim();
		const amountCents = Number(data.get('amountCents') || 0);
		const transactionDate = String(data.get('transactionDate') || '').trim();
		const categoryId = String(data.get('categoryId') || '').trim();
		const notes = String(data.get('notes') || '').trim() || null;

		if (!expenseId || !vendorName) {
			return fail(400, { error: 'Vendor name is required.' });
		}
		if (isNaN(amountCents) || amountCents <= 0) {
			return fail(400, { error: 'Amount must be greater than R 0.00.' });
		}
		if (!transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
			return fail(400, { error: 'Invalid date format (YYYY-MM-DD).' });
		}

		// Prevent future dates in SAST (AC-11)
		const todaySast = formatSastIsoDate(new Date());
		if (transactionDate > todaySast) {
			return fail(400, { error: 'Transaction date cannot be in the future.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable.' });
		}

		const db = getDb(platform.env.DB);

		// Verify expense ownership
		const [existingExpense] = await db
			.select()
			.from(expenseTable)
			.where(eq(expenseTable.id, expenseId))
			.limit(1);

		if (!existingExpense || existingExpense.userId !== locals.user.id) {
			return fail(403, { error: 'Unauthorized to modify this expense.' });
		}

		await db
			.update(expenseTable)
			.set({
				vendorName,
				amountCents: Math.round(amountCents),
				transactionDate,
				categoryId,
				notes,
				updatedAt: new Date()
			})
			.where(eq(expenseTable.id, expenseId));

		return { success: true, updatedId: expenseId };
	},

	deleteExpense: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const expenseId = String(data.get('id') || '');

		if (!expenseId) {
			return fail(400, { error: 'Expense ID required.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable.' });
		}

		const db = getDb(platform.env.DB);

		// Fetch expense to check ownership and get receipt key
		const [existingExpense] = await db
			.select()
			.from(expenseTable)
			.where(eq(expenseTable.id, expenseId))
			.limit(1);

		if (!existingExpense || existingExpense.userId !== locals.user.id) {
			return fail(403, { error: 'Unauthorized to delete this expense.' });
		}

		// Atomically delete receipt voucher from R2 (AC-04)
		if (existingExpense.receiptImageKey && platform?.env?.RECEIPTS_BUCKET) {
			await deleteReceiptFromR2(platform.env.RECEIPTS_BUCKET, existingExpense.receiptImageKey);
		}

		// Delete record from Cloudflare D1
		await db.delete(expenseTable).where(eq(expenseTable.id, expenseId));

		return { success: true, deletedId: expenseId };
	}
};
