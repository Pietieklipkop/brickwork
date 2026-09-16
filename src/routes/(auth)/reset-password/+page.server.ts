import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { getDb, passwordResetToken, account } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return { valid: false, error: 'No password reset token provided.' };
	}

	if (!platform?.env?.DB) {
		return { valid: false, error: 'Database service unavailable.' };
	}

	const db = getDb(platform.env.DB);
	const record = await db.query.passwordResetToken.findFirst({
		where: eq(passwordResetToken.tokenHash, token)
	});

	if (!record) {
		return { valid: false, error: 'Invalid password reset token.' };
	}

	if (record.usedAt) {
		return { valid: false, error: 'This password reset token has already been used.' };
	}

	if (record.expiresAt.getTime() < Date.now()) {
		return { valid: false, error: 'This password reset link has expired (1 hour expiration).' };
	}

	return { valid: true, token };
};

export const actions: Actions = {
	default: async ({ request, platform, url }) => {
		const data = await request.formData();
		const token = String(data.get('token') || '').trim();
		const password = String(data.get('password') || '');
		const confirmPassword = String(data.get('confirmPassword') || '');

		if (!token) {
			return fail(400, { error: 'Missing reset token.' });
		}

		if (!password || password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service is unavailable.' });
		}

		const db = getDb(platform.env.DB);
		const record = await db.query.passwordResetToken.findFirst({
			where: eq(passwordResetToken.tokenHash, token)
		});

		if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
			return fail(400, { error: 'Reset token is invalid or has expired.' });
		}

		// Hash new password using Better Auth's standard hasher
		const hashedPassword = await hashPassword(password);

		// Update account password in D1
		await db
			.update(account)
			.set({
				password: hashedPassword,
				updatedAt: new Date()
			})
			.where(eq(account.userId, record.userId));

		// Mark token as consumed
		await db
			.update(passwordResetToken)
			.set({
				usedAt: new Date()
			})
			.where(eq(passwordResetToken.id, record.id));

		throw redirect(303, '/login?reset=success');
	}
};
