import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import {
	user as userTable,
	company as companyTable,
	category as categoryTable,
	expense as expenseTable,
	companyMember as companyMemberTable
} from '$lib/server/db/schema';
import { seedBusinessCompany } from '$lib/server/db/seed';
import { eq, and } from 'drizzle-orm';

async function checkCanManageCategories(db: ReturnType<typeof getDb>, companyId: string, userId: string): Promise<boolean> {
	const [comp] = await db
		.select()
		.from(companyTable)
		.where(eq(companyTable.id, companyId))
		.limit(1);
	if (comp && comp.ownerUserId === userId) {
		return true;
	}
	const [membership] = await db
		.select()
		.from(companyMemberTable)
		.where(
			and(
				eq(companyMemberTable.companyId, companyId),
				eq(companyMemberTable.userId, userId),
				eq(companyMemberTable.canManageCategories, true)
			)
		)
		.limit(1);
	return Boolean(membership);
}

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { user, companies, activeCompany } = await parent();

	if (!platform?.env?.DB) {
		return {
			user,
			companies,
			activeCompany,
			categories: [],
			members: []
		};
	}

	const db = getDb(platform.env.DB);
	const categories = await db
		.select()
		.from(categoryTable)
		.where(eq(categoryTable.companyId, activeCompany.id));

	let members: Array<{
		id: string;
		userId: string;
		role: string;
		canManageCategories: boolean;
		userName: string;
		userEmail: string;
	}> = [];

	if (!activeCompany.isPersonal) {
		const memberRows = await db
			.select({
				id: companyMemberTable.id,
				userId: companyMemberTable.userId,
				role: companyMemberTable.role,
				canManageCategories: companyMemberTable.canManageCategories,
				userName: userTable.name,
				userEmail: userTable.email
			})
			.from(companyMemberTable)
			.innerJoin(userTable, eq(companyMemberTable.userId, userTable.id))
			.where(eq(companyMemberTable.companyId, activeCompany.id));

		members = memberRows.map((m) => ({
			...m,
			canManageCategories: Boolean(m.canManageCategories)
		}));
	}

	return {
		user,
		companies,
		activeCompany,
		categories,
		members
	};
};

export const actions: Actions = {
	updateCycleStartDay: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const rawDay = Number(data.get('monthStartDay'));

		if (isNaN(rawDay) || rawDay < 1 || rawDay > 28) {
			return fail(400, { error: 'Billing cycle start day must be an integer between 1 and 28.' });
		}

		const monthStartDay = Math.floor(rawDay);

		if (platform?.env?.DB) {
			const db = getDb(platform.env.DB);
			await db
				.update(userTable)
				.set({ monthStartDay, updatedAt: new Date() })
				.where(eq(userTable.id, locals.user.id));
		}

		return { success: true, monthStartDay };
	},

	createCompany: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const name = String(data.get('name') || '').trim();

		if (!name || name.length < 2) {
			return fail(400, { error: 'Company name must be at least 2 characters.' });
		}

		if (platform?.env?.DB) {
			const db = getDb(platform.env.DB);
			await seedBusinessCompany(db, locals.user.id, name);
		}

		return { success: true };
	},

	updateCompany: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const companyId = String(data.get('id') || '');
		const name = String(data.get('name') || '').trim();

		if (!companyId || !name) {
			return fail(400, { error: 'Company ID and name are required.' });
		}

		if (platform?.env?.DB) {
			const db = getDb(platform.env.DB);
			const [comp] = await db
				.select()
				.from(companyTable)
				.where(and(eq(companyTable.id, companyId), eq(companyTable.ownerUserId, locals.user.id)))
				.limit(1);

			if (!comp) {
				return fail(403, { error: 'Unauthorized to modify this company.' });
			}

			await db
				.update(companyTable)
				.set({ name, updatedAt: new Date() })
				.where(eq(companyTable.id, companyId));
		}

		return { success: true };
	},

	deleteCompany: async ({ request, locals, platform, cookies }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const companyId = String(data.get('id') || '');

		if (!companyId) {
			return fail(400, { error: 'Company ID required.' });
		}

		if (platform?.env?.DB) {
			const db = getDb(platform.env.DB);
			const [comp] = await db
				.select()
				.from(companyTable)
				.where(and(eq(companyTable.id, companyId), eq(companyTable.ownerUserId, locals.user.id)))
				.limit(1);

			if (!comp) {
				return fail(403, { error: 'Company not found or unauthorized.' });
			}

			if (comp.isPersonal) {
				return fail(400, { error: 'The default Personal profile cannot be deleted.' });
			}

			await db.delete(companyTable).where(eq(companyTable.id, companyId));

			// If current active company was deleted, clear cookie
			if (cookies.get('brickwork_active_company') === companyId) {
				cookies.delete('brickwork_active_company', { path: '/' });
			}
		}

		return { success: true };
	},

	addMember: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const companyId = String(data.get('companyId') || '');
		const email = String(data.get('email') || '').trim().toLowerCase();
		const canManageCategories = data.get('canManageCategories') === 'on' || data.get('canManageCategories') === 'true';

		if (!companyId || !email) {
			return fail(400, { error: 'Company and collaborator email are required.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable.' });
		}

		const db = getDb(platform.env.DB);

		// Must be owner of company
		const [comp] = await db
			.select()
			.from(companyTable)
			.where(and(eq(companyTable.id, companyId), eq(companyTable.ownerUserId, locals.user.id)))
			.limit(1);

		if (!comp) {
			return fail(403, { error: 'Only the company owner can add collaborators.' });
		}

		if (comp.isPersonal) {
			return fail(400, { error: 'Cannot add collaborators to a Personal profile.' });
		}

		// Look up registered user by email
		const [targetUser] = await db
			.select()
			.from(userTable)
			.where(eq(userTable.email, email))
			.limit(1);

		if (!targetUser) {
			return fail(404, {
				error: `No registered user found with email "${email}". Please ensure they have registered on Brickwork first.`
			});
		}

		if (targetUser.id === locals.user.id) {
			return fail(400, { error: 'You are already the owner of this company.' });
		}

		// Check if already member
		const [existingMember] = await db
			.select()
			.from(companyMemberTable)
			.where(and(eq(companyMemberTable.companyId, companyId), eq(companyMemberTable.userId, targetUser.id)))
			.limit(1);

		if (existingMember) {
			return fail(400, { error: `User ${email} is already a collaborator on this company.` });
		}

		await db.insert(companyMemberTable).values({
			id: crypto.randomUUID(),
			companyId,
			userId: targetUser.id,
			role: 'member',
			canManageCategories
		});

		return { success: true, memberAdded: true };
	},

	removeMember: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const memberId = String(data.get('memberId') || '');
		const companyId = String(data.get('companyId') || '');

		if (!memberId || !companyId) {
			return fail(400, { error: 'Member ID and Company ID required.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable.' });
		}

		const db = getDb(platform.env.DB);

		// Must be company owner
		const [comp] = await db
			.select()
			.from(companyTable)
			.where(and(eq(companyTable.id, companyId), eq(companyTable.ownerUserId, locals.user.id)))
			.limit(1);

		if (!comp) {
			return fail(403, { error: 'Only the company owner can remove members.' });
		}

		await db
			.delete(companyMemberTable)
			.where(and(eq(companyMemberTable.id, memberId), eq(companyMemberTable.companyId, companyId)));

		return { success: true, memberRemoved: true };
	},

	toggleMemberCategoryPermission: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const memberId = String(data.get('memberId') || '');
		const companyId = String(data.get('companyId') || '');
		const canManageCategories = data.get('canManageCategories') === 'true' || data.get('canManageCategories') === 'on';

		if (!memberId || !companyId) {
			return fail(400, { error: 'Member ID and Company ID required.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable.' });
		}

		const db = getDb(platform.env.DB);

		// Must be company owner
		const [comp] = await db
			.select()
			.from(companyTable)
			.where(and(eq(companyTable.id, companyId), eq(companyTable.ownerUserId, locals.user.id)))
			.limit(1);

		if (!comp) {
			return fail(403, { error: 'Only the company owner can adjust permissions.' });
		}

		await db
			.update(companyMemberTable)
			.set({ canManageCategories, updatedAt: new Date() })
			.where(and(eq(companyMemberTable.id, memberId), eq(companyMemberTable.companyId, companyId)));

		return { success: true };
	},

	createCategory: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const companyId = String(data.get('companyId') || '');
		const name = String(data.get('name') || '').trim();
		const monthlyTargetCents = Number(data.get('monthlyTargetCents') || 0);
		const colorHex = String(data.get('colorHex') || '#0B2240').trim();

		if (!name) {
			return fail(400, { error: 'Category name is required.' });
		}
		if (isNaN(monthlyTargetCents) || monthlyTargetCents < 0) {
			return fail(400, { error: 'Monthly budget target cannot be negative.' });
		}

		if (platform?.env?.DB) {
			const db = getDb(platform.env.DB);
			const allowed = await checkCanManageCategories(db, companyId, locals.user.id);
			if (!allowed) {
				return fail(403, { error: 'You do not have permission to manage categories for this company.' });
			}

			await db.insert(categoryTable).values({
				id: crypto.randomUUID(),
				companyId,
				name,
				monthlyTargetCents: Math.round(monthlyTargetCents),
				colorHex
			});
		}

		return { success: true };
	},

	updateCategory: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const categoryId = String(data.get('id') || '');
		const name = String(data.get('name') || '').trim();
		const monthlyTargetCents = Number(data.get('monthlyTargetCents') || 0);
		const colorHex = String(data.get('colorHex') || '#0B2240').trim();

		if (!categoryId || !name) {
			return fail(400, { error: 'Category ID and name are required.' });
		}
		if (isNaN(monthlyTargetCents) || monthlyTargetCents < 0) {
			return fail(400, { error: 'Monthly budget target cannot be negative.' });
		}

		if (platform?.env?.DB) {
			const db = getDb(platform.env.DB);
			const [cat] = await db
				.select()
				.from(categoryTable)
				.where(eq(categoryTable.id, categoryId))
				.limit(1);

			if (!cat) {
				return fail(404, { error: 'Category not found.' });
			}

			const allowed = await checkCanManageCategories(db, cat.companyId, locals.user.id);
			if (!allowed) {
				return fail(403, { error: 'You do not have permission to manage categories for this company.' });
			}

			await db
				.update(categoryTable)
				.set({
					name,
					monthlyTargetCents: Math.round(monthlyTargetCents),
					colorHex,
					updatedAt: new Date()
				})
				.where(eq(categoryTable.id, categoryId));
		}

		return { success: true };
	},

	deleteCategory: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const categoryId = String(data.get('id') || '');

		if (!categoryId) {
			return fail(400, { error: 'Category ID is required.' });
		}

		if (platform?.env?.DB) {
			const db = getDb(platform.env.DB);
			const [cat] = await db
				.select()
				.from(categoryTable)
				.where(eq(categoryTable.id, categoryId))
				.limit(1);

			if (!cat) {
				return fail(404, { error: 'Category not found.' });
			}

			const allowed = await checkCanManageCategories(db, cat.companyId, locals.user.id);
			if (!allowed) {
				return fail(403, { error: 'You do not have permission to manage categories for this company.' });
			}

			// Check if any expenses are linked to this category
			const linkedExpenses = await db
				.select()
				.from(expenseTable)
				.where(eq(expenseTable.categoryId, categoryId))
				.limit(1);

			if (linkedExpenses.length > 0) {
				return fail(400, {
					error: 'Cannot delete category that has existing expenses attached. Reassign or delete expenses first.'
				});
			}

			await db.delete(categoryTable).where(eq(categoryTable.id, categoryId));
		}

		return { success: true };
	}
};
