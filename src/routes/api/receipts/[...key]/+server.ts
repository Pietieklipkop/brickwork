import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, or } from 'drizzle-orm';
import { getDb, company, expense, companyMember } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const key = params.key;
	if (!key) {
		throw error(400, 'Receipt key is required');
	}

	if (!platform?.env?.RECEIPTS_BUCKET) {
		throw error(500, 'Receipt storage service is unavailable');
	}

	// Security Verification: Key format is receipts/{companyId}/...
	// Verify user has access to this company or expense
	const parts = key.split('/');
	const companyId = parts.length > 1 ? parts[1] : null;

	if (platform?.env?.DB && companyId) {
		const db = getDb(platform.env.DB);
		const userCompany = await db.query.company.findFirst({
			where: and(eq(company.id, companyId), eq(company.ownerUserId, locals.user.id))
		});

		if (!userCompany) {
			// Check if user is a registered member of this company
			const memberRecord = await db.query.companyMember.findFirst({
				where: and(eq(companyMember.companyId, companyId), eq(companyMember.userId, locals.user.id))
			});

			if (!memberRecord) {
				// Also check if user owns the expense associated with this receipt key (original or OCR variant)
				const userExpense = await db.query.expense.findFirst({
					where: and(
						or(eq(expense.receiptImageKey, key), eq(expense.ocrImageKey, key)),
						eq(expense.userId, locals.user.id)
					)
				});

				if (!userExpense) {
					throw error(403, 'Forbidden: You do not have access to this receipt.');
				}
			}
		}
	}

	const object = await platform.env.RECEIPTS_BUCKET.get(key);

	if (!object) {
		throw error(404, 'Receipt image not found');
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('ETag', object.httpEtag);
	headers.set('Cache-Control', 'private, max-age=31536000, immutable');

	return new Response(object.body, {
		headers
	});
};
