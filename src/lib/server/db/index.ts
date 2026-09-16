import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export * from './schema';
export { schema };

export const getDb = (d1: D1Database) => drizzle(d1, { schema });
export type AppDatabase = ReturnType<typeof getDb>;

// Entity Inferred Types
export type User = typeof schema.user.$inferSelect;
export type NewUser = typeof schema.user.$inferInsert;

export type Session = typeof schema.session.$inferSelect;
export type Account = typeof schema.account.$inferSelect;

export type Company = typeof schema.company.$inferSelect;
export type NewCompany = typeof schema.company.$inferInsert;

export type Category = typeof schema.category.$inferSelect;
export type NewCategory = typeof schema.category.$inferInsert;

export type PaymentAccount = typeof schema.paymentAccount.$inferSelect;
export type NewPaymentAccount = typeof schema.paymentAccount.$inferInsert;

export type Expense = typeof schema.expense.$inferSelect;
export type NewExpense = typeof schema.expense.$inferInsert;

export type PasswordResetToken = typeof schema.passwordResetToken.$inferSelect;
export type NewPasswordResetToken = typeof schema.passwordResetToken.$inferInsert;
