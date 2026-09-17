import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

// Re-export all authentication tables and relations
export * from './auth.schema';

/**
 * Company / Entity Table
 * Supports multiple entities per account, including personal expense profiles.
 * Authority: docs/DATABASE_SCHEMA.md Section 2 & docs/SPECIFICATION.md Section 3.3
 */
export const company = sqliteTable(
	'company',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		ownerUserId: text('owner_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		isPersonal: integer('is_personal', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('company_owner_idx').on(table.ownerUserId)]
);

/**
 * Company Member / Collaborator Table
 * Allows company owners to add registered members to their company.
 * Members can view and add expenses; canManageCategories controls category & target editing rights.
 */
export const companyMember = sqliteTable(
	'company_member',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		companyId: text('company_id')
			.notNull()
			.references(() => company.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('member'),
		canManageCategories: integer('can_manage_categories', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('company_member_unique_idx').on(table.companyId, table.userId),
		index('company_member_user_idx').on(table.userId),
		index('company_member_company_idx').on(table.companyId)
	]
);

/**
 * Spend Category Table
 * Configurable per company with monthly spend target in integer ZAR cents.
 */
export const category = sqliteTable(
	'category',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		companyId: text('company_id')
			.notNull()
			.references(() => company.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		monthlyTargetCents: integer('monthly_target_cents').notNull().default(0),
		colorHex: text('color_hex').notNull().default('#0B2240'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('category_company_idx').on(table.companyId)]
);

/**
 * Payment Account Table
 * Payment methods (e.g. "Business Card", "Petty Cash") per company with default flag.
 */
export const paymentAccount = sqliteTable(
	'payment_account',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		companyId: text('company_id')
			.notNull()
			.references(() => company.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('payment_account_company_idx').on(table.companyId)]
);

/**
 * Expense Records Table
 * Core financial ledger storing receipts and expenses in integer ZAR cents.
 * Dates are strictly YYYY-MM-DD in South African Standard Time (SAST, UTC+2).
 */
export const expense = sqliteTable(
	'expense',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'restrict' }),
		companyId: text('company_id')
			.notNull()
			.references(() => company.id, { onDelete: 'cascade' }),
		categoryId: text('category_id')
			.notNull()
			.references(() => category.id, { onDelete: 'restrict' }),
		accountId: text('account_id').references(() => paymentAccount.id, { onDelete: 'set null' }),
		vendorName: text('vendor_name').notNull(),
		amountCents: integer('amount_cents').notNull(), // Integer ZAR cents (e.g. 45280 = R 452.80)
		transactionDate: text('transaction_date').notNull(), // ISO YYYY-MM-DD in SAST
		receiptImageKey: text('receipt_image_key'), // Cloudflare R2 Object Key
		rawAiExtraction: text('raw_ai_extraction'), // JSON snapshot of Workers AI OCR output
		notes: text('notes'),
		isReimbursable: integer('is_reimbursable', { mode: 'boolean' }).notNull().default(false),
		reimbursableCompanyId: text('reimbursable_company_id').references(() => company.id, { onDelete: 'set null' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('idx_expense_company_date').on(table.companyId, table.transactionDate),
		index('idx_expense_category_date').on(table.categoryId, table.transactionDate),
		index('idx_expense_user_date').on(table.userId, table.transactionDate),
		index('idx_expense_reimbursable').on(table.isReimbursable, table.reimbursableCompanyId)
	]
);

/**
 * Password Reset Token Table
 * Cryptographically secured 1-hour expiration tokens for password recovery.
 */
export const passwordResetToken = sqliteTable(
	'password_reset_token',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		usedAt: integer('used_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('idx_password_reset_token_hash').on(table.tokenHash)]
);

// Relations Definitions
export const companyRelations = relations(company, ({ one, many }) => ({
	owner: one(user, {
		fields: [company.ownerUserId],
		references: [user.id]
	}),
	categories: many(category),
	paymentAccounts: many(paymentAccount),
	expenses: many(expense),
	members: many(companyMember)
}));

export const companyMemberRelations = relations(companyMember, ({ one }) => ({
	company: one(company, {
		fields: [companyMember.companyId],
		references: [company.id]
	}),
	user: one(user, {
		fields: [companyMember.userId],
		references: [user.id]
	})
}));

export const categoryRelations = relations(category, ({ one, many }) => ({
	company: one(company, {
		fields: [category.companyId],
		references: [company.id]
	}),
	expenses: many(expense)
}));

export const paymentAccountRelations = relations(paymentAccount, ({ one, many }) => ({
	company: one(company, {
		fields: [paymentAccount.companyId],
		references: [company.id]
	}),
	expenses: many(expense)
}));

export const expenseRelations = relations(expense, ({ one }) => ({
	user: one(user, {
		fields: [expense.userId],
		references: [user.id]
	}),
	company: one(company, {
		fields: [expense.companyId],
		references: [company.id]
	}),
	category: one(category, {
		fields: [expense.categoryId],
		references: [category.id]
	}),
	account: one(paymentAccount, {
		fields: [expense.accountId],
		references: [paymentAccount.id]
	}),
	reimbursableCompany: one(company, {
		fields: [expense.reimbursableCompanyId],
		references: [company.id]
	})
}));

export const passwordResetTokenRelations = relations(passwordResetToken, ({ one }) => ({
	user: one(user, {
		fields: [passwordResetToken.userId],
		references: [user.id]
	})
}));
