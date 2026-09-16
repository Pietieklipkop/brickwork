import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { expense as expenseTable, user as userTable, company as companyTable } from '$lib/server/db/schema';
import { uploadReceiptToR2 } from '$lib/server/storage';
import { formatSastIsoDate } from '$lib/domain/billing';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { activeCompany, categories, paymentAccounts } = await parent();
	return {
		activeCompany,
		categories,
		paymentAccounts
	};
};

export const actions: Actions = {
	default: async ({ request, locals, platform, cookies }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();

		const vendorName = String(formData.get('vendorName') || '').trim();
		const amountCents = Number(formData.get('amountCents') || 0);
		const transactionDate = String(formData.get('transactionDate') || '').trim();
		const categoryId = String(formData.get('categoryId') || '').trim();
		const accountId = String(formData.get('accountId') || '').trim() || null;
		const notes = String(formData.get('notes') || '').trim() || null;
		const rawAiExtraction = String(formData.get('rawAiExtraction') || '').trim() || null;
		const imageFile = formData.get('image') as File | null;

		// Validation (AC-11)
		if (!vendorName) {
			return fail(400, { error: 'Vendor name is required.' });
		}
		if (isNaN(amountCents) || amountCents <= 0) {
			return fail(400, { error: 'Amount must be greater than R 0.00.' });
		}
		if (!transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
			return fail(400, { error: 'A valid transaction date is required (YYYY-MM-DD).' });
		}

		// Prevent future dates in SAST
		const todaySast = formatSastIsoDate(new Date());
		if (transactionDate > todaySast) {
			return fail(400, { error: 'Transaction date cannot be in the future.' });
		}

		if (!categoryId) {
			return fail(400, { error: 'Please select a spend category.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable.' });
		}

		const db = getDb(platform.env.DB);

		// Resolve active company
		let activeCompanyId: string | undefined = cookies.get('brickwork_active_company');
		if (!activeCompanyId) {
			const [u] = await db.select().from(userTable).where(eq(userTable.id, locals.user.id)).limit(1);
			activeCompanyId = u?.defaultCompanyId ?? undefined;
		}
		if (!activeCompanyId) {
			const [comp] = await db.select().from(companyTable).where(eq(companyTable.ownerUserId, locals.user.id)).limit(1);
			activeCompanyId = comp?.id ?? undefined;
		}
		if (!activeCompanyId) {
			return fail(400, { error: 'No company profile found to attach expense to.' });
		}

		const expenseId = crypto.randomUUID();
		let receiptImageKey: string | null = null;

		// Upload receipt image to Cloudflare R2 if present (AC-01, AC-03)
		if (imageFile && imageFile.size > 0) {
			if (imageFile.size > 10 * 1024 * 1024) {
				return fail(400, { error: 'Receipt image exceeds 10MB limit.' });
			}

			if (platform?.env?.RECEIPTS_BUCKET) {
				try {
					const arrayBuffer = await imageFile.arrayBuffer();
					receiptImageKey = await uploadReceiptToR2({
						r2Bucket: platform.env.RECEIPTS_BUCKET,
						companyId: activeCompanyId,
						expenseId,
						imageBytes: arrayBuffer,
						mimeType: imageFile.type || 'image/webp'
					});
				} catch (err) {
					console.error('Failed to upload receipt to R2:', err);
				}
			}
		}

		// Persist expense to Cloudflare D1
		await db.insert(expenseTable).values({
			id: expenseId,
			userId: locals.user.id,
			companyId: activeCompanyId,
			categoryId,
			accountId,
			vendorName,
			amountCents: Math.round(amountCents),
			transactionDate,
			receiptImageKey,
			rawAiExtraction,
			notes
		});

		throw redirect(303, '/dashboard');
	}
};
