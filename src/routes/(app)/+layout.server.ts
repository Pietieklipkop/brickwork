import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import {
	user as userTable,
	company as companyTable,
	category as categoryTable,
	paymentAccount as paymentAccountTable,
	companyMember as companyMemberTable
} from '$lib/server/db/schema';
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
			companies: [{ id: 'personal', name: 'Personal', isPersonal: true, isOwner: true, canManageCategories: true, role: 'owner' }],
			activeCompany: { id: 'personal', name: 'Personal', isPersonal: true, isOwner: true, canManageCategories: true, role: 'owner' },
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

	// Fetch owned companies
	let ownedCompanies = await db
		.select()
		.from(companyTable)
		.where(eq(companyTable.ownerUserId, locals.user.id));

	// If no companies found, auto-seed default Personal profile
	if (ownedCompanies.length === 0) {
		await seedPersonalProfile(db, locals.user.id, currentUser?.monthStartDay ?? 1);
		ownedCompanies = await db
			.select()
			.from(companyTable)
			.where(eq(companyTable.ownerUserId, locals.user.id));
	}

	// Fetch companies where user is an invited member
	const memberCompanies = await db
		.select({
			company: companyTable,
			role: companyMemberTable.role,
			canManageCategories: companyMemberTable.canManageCategories
		})
		.from(companyMemberTable)
		.innerJoin(companyTable, eq(companyMemberTable.companyId, companyTable.id))
		.where(eq(companyMemberTable.userId, locals.user.id));

	// Merge into all available companies with permission flags
	const allCompanies = [
		...ownedCompanies.map((c) => ({
			...c,
			isOwner: true,
			canManageCategories: true,
			role: 'owner' as const
		})),
		...memberCompanies.map((m) => ({
			...m.company,
			isOwner: false,
			canManageCategories: Boolean(m.canManageCategories),
			role: m.role
		}))
	];

	// Resolve active company from cookie, or fallback to defaultCompanyId or first company
	const cookieCompanyId = cookies.get('brickwork_active_company');
	let activeCompany = allCompanies.find((c) => c.id === cookieCompanyId);

	if (!activeCompany && currentUser?.defaultCompanyId) {
		activeCompany = allCompanies.find((c) => c.id === currentUser.defaultCompanyId);
	}

	if (!activeCompany) {
		activeCompany = allCompanies[0];
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
		companies: allCompanies.map((c) => ({
			id: c.id,
			name: c.name,
			isPersonal: c.isPersonal,
			isOwner: c.isOwner,
			canManageCategories: c.canManageCategories,
			role: c.role
		})),
		activeCompany: {
			id: activeCompany.id,
			name: activeCompany.name,
			isPersonal: activeCompany.isPersonal,
			isOwner: activeCompany.isOwner,
			canManageCategories: activeCompany.canManageCategories,
			role: activeCompany.role
		},
		categories,
		paymentAccounts
	};
};
