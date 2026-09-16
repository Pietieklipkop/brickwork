/**
 * Personal Profile & Company Starter Seed Engine
 * Bootstraps initial personal profile, default categories, and default payment account.
 * Authority: docs/DATABASE_SCHEMA.md Section 5
 */

import { eq } from 'drizzle-orm';
import type { AppDatabase } from './index';
import { company, category, paymentAccount, user } from './schema';

export interface StarterCategoryPreset {
	name: string;
	monthlyTargetCents: number;
	colorHex: string;
}

export const DEFAULT_STARTER_CATEGORIES: StarterCategoryPreset[] = [
	{ name: 'Groceries', monthlyTargetCents: 600_000, colorHex: '#10B981' }, // R 6,000
	{ name: 'Fuel & Transport', monthlyTargetCents: 350_000, colorHex: '#0284C7' }, // R 3,500
	{ name: 'Dining & Entertainment', monthlyTargetCents: 250_000, colorHex: '#F59E0B' }, // R 2,500
	{ name: 'Utilities & Home', monthlyTargetCents: 400_000, colorHex: '#8B5CF6' }, // R 4,000
	{ name: 'General / Ad Hoc', monthlyTargetCents: 150_000, colorHex: '#64748B' } // R 1,500
];

export const BUSINESS_STARTER_CATEGORIES: StarterCategoryPreset[] = [
	{ name: 'Office Supplies & Tech', monthlyTargetCents: 500_000, colorHex: '#0B2240' },
	{ name: 'Travel & Accommodation', monthlyTargetCents: 800_000, colorHex: '#0284C7' },
	{ name: 'Client Meals & Entertainment', monthlyTargetCents: 400_000, colorHex: '#F59E0B' },
	{ name: 'Software & Cloud Services', monthlyTargetCents: 600_000, colorHex: '#8B5CF6' },
	{ name: 'Professional Services & Legal', monthlyTargetCents: 750_000, colorHex: '#10B981' },
	{ name: 'General Business Expenses', monthlyTargetCents: 250_000, colorHex: '#64748B' }
];

/**
 * Bootstraps a new user's default Personal Profile with default categories and payment account.
 */
export async function seedPersonalProfile(
	db: AppDatabase,
	userId: string,
	monthStartDay: number = 1
): Promise<{ companyId: string }> {
	const personalCompanyId = crypto.randomUUID();

	// 1. Create Personal Company
	await db.insert(company).values({
		id: personalCompanyId,
		ownerUserId: userId,
		name: 'Personal',
		isPersonal: true
	});

	// 2. Seed default categories
	for (const cat of DEFAULT_STARTER_CATEGORIES) {
		await db.insert(category).values({
			id: crypto.randomUUID(),
			companyId: personalCompanyId,
			name: cat.name,
			monthlyTargetCents: cat.monthlyTargetCents,
			colorHex: cat.colorHex
		});
	}

	// 3. Seed default payment account
	await db.insert(paymentAccount).values({
		id: crypto.randomUUID(),
		companyId: personalCompanyId,
		name: 'Default Card',
		isDefault: true
	});

	// 4. Update user default company and start day
	await db
		.update(user)
		.set({
			defaultCompanyId: personalCompanyId,
			monthStartDay: Math.min(Math.max(monthStartDay, 1), 28)
		})
		.where(eq(user.id, userId));

	return { companyId: personalCompanyId };
}

/**
 * Bootstraps a new registered company entity with standard business categories
 */
export async function seedBusinessCompany(
	db: AppDatabase,
	userId: string,
	companyName: string
): Promise<{ companyId: string }> {
	const newCompanyId = crypto.randomUUID();

	await db.insert(company).values({
		id: newCompanyId,
		ownerUserId: userId,
		name: companyName,
		isPersonal: false
	});

	for (const cat of BUSINESS_STARTER_CATEGORIES) {
		await db.insert(category).values({
			id: crypto.randomUUID(),
			companyId: newCompanyId,
			name: cat.name,
			monthlyTargetCents: cat.monthlyTargetCents,
			colorHex: cat.colorHex
		});
	}

	await db.insert(paymentAccount).values({
		id: crypto.randomUUID(),
		companyId: newCompanyId,
		name: 'Business Account',
		isDefault: true
	});

	return { companyId: newCompanyId };
}
