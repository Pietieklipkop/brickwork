import { and, eq } from 'drizzle-orm';
import {
	company as companyTable,
	companyMember as companyMemberTable,
	category as categoryTable,
	paymentAccount as paymentAccountTable,
	type getDb
} from '$lib/server/db';

type DrizzleDb = ReturnType<typeof getDb>;

/**
 * Verifies whether a user owns or is a registered member of a company profile.
 */
export async function hasCompanyAccess(
	db: DrizzleDb,
	userId: string,
	companyId: string
): Promise<boolean> {
	if (!userId || !companyId) return false;

	const owned = await db
		.select({ id: companyTable.id })
		.from(companyTable)
		.where(and(eq(companyTable.id, companyId), eq(companyTable.ownerUserId, userId)))
		.limit(1);

	if (owned.length > 0) return true;

	const member = await db
		.select({ id: companyMemberTable.id })
		.from(companyMemberTable)
		.where(and(eq(companyMemberTable.companyId, companyId), eq(companyMemberTable.userId, userId)))
		.limit(1);

	return member.length > 0;
}

/**
 * Verifies that a category belongs to the specified company.
 */
export async function verifyCategoryInCompany(
	db: DrizzleDb,
	categoryId: string,
	companyId: string
): Promise<boolean> {
	if (!categoryId || !companyId) return false;
	const row = await db
		.select({ id: categoryTable.id })
		.from(categoryTable)
		.where(and(eq(categoryTable.id, categoryId), eq(categoryTable.companyId, companyId)))
		.limit(1);
	return row.length > 0;
}

/**
 * Verifies that a payment account belongs to the specified company.
 */
export async function verifyAccountInCompany(
	db: DrizzleDb,
	accountId: string,
	companyId: string
): Promise<boolean> {
	if (!accountId || !companyId) return false;
	const row = await db
		.select({ id: paymentAccountTable.id })
		.from(paymentAccountTable)
		.where(and(eq(paymentAccountTable.id, accountId), eq(paymentAccountTable.companyId, companyId)))
		.limit(1);
	return row.length > 0;
}

/**
 * Computes a lowercase hex SHA-256 digest using Web Crypto (Cloudflare Workers compatible).
 */
export async function sha256Hex(value: string): Promise<string> {
	const data = new TextEncoder().encode(value);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Escapes HTML special characters for safe interpolation in email templates.
 */
export function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
