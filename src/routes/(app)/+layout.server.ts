import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { user as userTable, company as companyTable, category as categoryTable, paymentAccount as paymentAccountTable } from '$lib/server/db/schema';
import { seedPersonalProfile } from '$lib/server/db/seed';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, platform, cookies }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (!platform?.env?.DB) {
		// Mock fallback for testing or unconfigured local environments
		return {
			user: locals.user,
			companies: [{ id: 'personal', name: 'Personal', isPersonal: true }],
			activeCompany: { id: 'personal', name: 'Personal', isPersonal: true },
			categories: [],
			paymentAccounts: []
		};
	}

	const db = getDb(platform.env.DB);

	// Fetch updated user entity
	const [currentUser] = await db
		.select()
		.from(userTable)
		.where(eq(userTable.id, locals.user.id))
		.limit(1);

	// Fetch user companies
	let userCompanies = await db
		.select()
		.from(companyTable)
		.where(eq(companyTable.ownerUserId, locals.user.id));

	// If no companies found, auto-seed default Personal profile
	if (userCompanies.length === 0) {
		await seedPersonalProfile(db, locals.user.id, currentUser?.monthStartDay ?? 1);
		userCompanies = await db
			.select()
			.from(companyTable)
			.where(eq(companyTable.ownerUserId, locals.user.id));
	}

	// Resolve active company from cookie, or fallback to defaultCompanyId or first company
	const cookieCompanyId = cookies.get('brickwork_active_company');
	let activeCompany = userCompanies.find((c) => c.id === cookieCompanyId);

	if (!activeCompany && currentUser?.defaultCompanyId) {
		activeCompany = userCompanies.find((c) => c.id === currentUser.defaultCompanyId);
	}

	if (!activeCompany) {
		activeCompany = userCompanies[0];
	}

	// Ensure cookie reflects active company
	if (cookieCompanyId !== activeCompany.id) {
		cookies.set('brickwork_active_company', activeCompany.id, {
			path: '/',
			httpOnly: false,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	// Fetch active company categories
	const categories = await db
		.select()
		.from(categoryTable)
		.where(eq(categoryTable.companyId, activeCompany.id));

	// Fetch active company payment accounts
	const paymentAccounts = await db
		.select()
		.from(paymentAccountTable)
		.where(eq(paymentAccountTable.companyId, activeCompany.id));

	return {
		user: currentUser ?? locals.user,
		companies: userCompanies.map((c) => ({
			id: c.id,
			name: c.name,
			isPersonal: c.isPersonal
		})),
		activeCompany: {
			id: activeCompany.id,
			name: activeCompany.name,
			isPersonal: activeCompany.isPersonal
		},
		categories,
		paymentAccounts
	};
};
