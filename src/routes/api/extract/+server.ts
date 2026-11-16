import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { getDb, category, paymentAccount } from '$lib/server/db';
import { hasCompanyAccess } from '$lib/server/authz';
import { sanitizeExtractedReceipt, buildExtractionPrompt } from '$lib/domain/extraction';
import { formatSastIsoDate } from '$lib/domain/billing';

const MAX_EXTRACTION_IMAGE_BYTES = 10 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const imageFile = formData.get('image') as File | null;
		const companyId = String(formData.get('companyId') || locals.user.defaultCompanyId || '');

		if (!imageFile) {
			return json({ error: 'No image provided for receipt extraction.' }, { status: 400 });
		}
		if (imageFile.size > MAX_EXTRACTION_IMAGE_BYTES) {
			return json({ error: 'Image exceeds 10MB extraction limit.' }, { status: 400 });
		}

		// Load available categories and payment accounts for this company (with tenant authorization)
		let availableCategories: { id: string; name: string }[] = [];
		let availableAccounts: Array<{ id: string; name: string; cardNumber: string | null; isDefault: boolean }> = [];

		if (platform?.env?.DB && companyId) {
			const db = getDb(platform.env.DB);
			const authorized = await hasCompanyAccess(db, locals.user.id, companyId);
			if (!authorized) {
				return json({ error: 'Forbidden: You do not have access to this company.' }, { status: 403 });
			}

			const cats = await db.query.category.findMany({
				where: eq(category.companyId, companyId)
			});
			availableCategories = cats.map((c) => ({ id: c.id, name: c.name }));

			const accounts = await db
				.select()
				.from(paymentAccount)
				.where(eq(paymentAccount.companyId, companyId));
			availableAccounts = accounts.map((a) => ({
				id: a.id,
				name: a.name,
				cardNumber: a.cardNumber,
				isDefault: Boolean(a.isDefault)
			}));
		}

		// Fallback to categories and accounts sent directly in formData if DB returned empty or offline
		if (availableCategories.length === 0) {
			const categoriesParam = formData.get('categories');
			if (categoriesParam && typeof categoriesParam === 'string') {
				try {
					const parsed = JSON.parse(categoriesParam);
					if (Array.isArray(parsed) && parsed.length > 0) {
						availableCategories = parsed;
					}
				} catch {
					// ignore json parse error
				}
			}
		}

		if (availableAccounts.length === 0) {
			const accountsParam = formData.get('paymentAccounts');
			if (accountsParam && typeof accountsParam === 'string') {
				try {
					const parsed = JSON.parse(accountsParam);
					if (Array.isArray(parsed) && parsed.length > 0) {
						availableAccounts = parsed;
					}
				} catch {
					// ignore
				}
			}
		}

		const categoryNames = availableCategories.map((c) => c.name);
		const dynamicPrompt = buildExtractionPrompt(categoryNames);

		const imageBuffer = await imageFile.arrayBuffer();
		const imageBytes = new Uint8Array(imageBuffer);

		let rawOutput: any = null;

		// Execute Workers AI with Llama-3.2-11b Vision Instruct if binding is present
		if (platform?.env?.AI && typeof platform.env.AI.run === 'function') {
			try {
				const response: any = await platform.env.AI.run(
					'@cf/meta/llama-3.2-11b-vision-instruct',
					{
						prompt: dynamicPrompt,
						image: [...imageBytes],
						max_tokens: 512,
						temperature: 0.1
					}
				);

				rawOutput = response?.response || response;
			} catch (aiErr) {
				console.warn('Cloudflare Workers AI extraction error, falling back to heuristic parsing:', aiErr);
			}
		}

		// If Workers AI is unavailable or failed, return an empty manual-entry fallback (never fabricated data)
		if (!rawOutput) {
			return json({
				success: false,
				fallback: true,
				data: {
					vendorName: '',
					amountCents: 0,
					transactionDate: formatSastIsoDate(new Date()),
					suggestedCategoryId: availableCategories[0]?.id || '',
					confidence: 0
				}
			});
		}

		const sanitized = sanitizeExtractedReceipt(rawOutput, availableCategories, availableAccounts);

		return json({
			success: true,
			data: sanitized
		});
	} catch (err: any) {
		console.error('Receipt extraction failed:', err);
		return json(
			{
				error: 'Failed to process receipt image.'
			},
			{ status: 500 }
		);
	}
};
