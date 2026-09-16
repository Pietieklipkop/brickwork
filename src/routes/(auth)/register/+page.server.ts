import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { getDb } from '$lib/server/db';
import { seedPersonalProfile } from '$lib/server/db/seed';

export const actions: Actions = {
	default: async ({ request, locals, platform }) => {
		const data = await request.formData();
		const name = String(data.get('name') || '').trim();
		const email = String(data.get('email') || '').trim().toLowerCase();
		const password = String(data.get('password') || '');
		const monthStartDayRaw = Number(data.get('monthStartDay') || 1);
		const monthStartDay = Math.min(Math.max(monthStartDayRaw, 1), 28);

		if (!name || name.length < 2) {
			return fail(400, { error: 'Please enter your full name.', name, email });
		}
		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Please enter a valid email address.', name, email });
		}
		if (!password || password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long.', name, email });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service is unavailable.', name, email });
		}

		try {
			const res = await locals.auth.api.signUpEmail({
				body: {
					name,
					email,
					password
				},
				headers: request.headers
			});

			if (!res || !res.user) {
				return fail(400, { error: 'Registration failed. Please try again.', name, email });
			}

			// Bootstrap Personal Profile & Starter Categories
			const db = getDb(platform.env.DB);
			await seedPersonalProfile(db, res.user.id, monthStartDay);

		} catch (err: any) {
			const msg = err?.message || '';
			if (msg.includes('already exists') || msg.includes('UNIQUE constraint failed')) {
				return fail(400, {
					error: 'An account with this email address already exists.',
					name,
					email
				});
			}
			return fail(500, {
				error: msg || 'An unexpected error occurred during registration.',
				name,
				email
			});
		}

		throw redirect(303, '/dashboard');
	}
};
