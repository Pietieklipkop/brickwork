import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (locals.auth) {
		try {
			await locals.auth.api.signOut({ headers: request.headers });
		} catch (err) {
			console.error('Sign out error:', err);
		}
	}
	throw redirect(303, '/login');
};

export const GET: RequestHandler = async ({ locals, request }) => {
	if (locals.auth) {
		try {
			await locals.auth.api.signOut({ headers: request.headers });
		} catch (err) {
			console.error('Sign out error:', err);
		}
	}
	throw redirect(303, '/login');
};
