import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { eq } from 'drizzle-orm';
import { getDb, user, passwordResetToken } from '$lib/server/db';
import { sendPasswordResetEmail } from '$lib/server/email';
import { sha256Hex } from '$lib/server/authz';

export const actions: Actions = {
	default: async ({ request, platform, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') || '').trim().toLowerCase();

		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Please provide a valid email address.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service is unavailable.' });
		}

		const db = getDb(platform.env.DB);
		const existingUser = await db.query.user.findFirst({
			where: eq(user.email, email)
		});

		if (existingUser) {
			// Generate cryptographically secure reset token and store only its SHA-256 hash
			const tokenBytes = new Uint8Array(32);
			crypto.getRandomValues(tokenBytes);
			const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, '0')).join('');
			const tokenHash = await sha256Hex(token);

			// 1-Hour Expiration (AC-11)
			const oneHourMs = 60 * 60 * 1000;
			const expiresAt = new Date(Date.now() + oneHourMs);

			await db.insert(passwordResetToken).values({
				id: crypto.randomUUID(),
				userId: existingUser.id,
				tokenHash,
				expiresAt
			});

			const canonicalOrigin = platform.env.APP_URL || url.origin;
			const resetUrl = `${canonicalOrigin.replace(/\/$/, '')}/reset-password?token=${token}`;

			await sendPasswordResetEmail({
				to: existingUser.email,
				recipientName: existingUser.name,
				resetUrl,
				platformEnv: platform.env
			});
		}

		// Always return success to prevent user email enumeration
		return {
			success: true,
			message: 'If an account exists for that email, a password reset link has been dispatched.'
		};
	}
};
