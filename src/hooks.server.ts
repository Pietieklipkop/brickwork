import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	// If building or running in pure node test without platform, bypass platform auth
	if (building || !event.platform?.env?.DB) {
		return resolve(event);
	}

	const { DB } = event.platform.env;
	const auth = createAuth(DB, event.url.origin);
	event.locals.auth = auth;

	try {
		const sessionData = await auth.api.getSession({
			headers: event.request.headers
		});

		if (sessionData) {
			event.locals.session = sessionData.session;
			event.locals.user = sessionData.user as any;
		} else {
			event.locals.session = null;
			event.locals.user = null;
		}
	} catch (err) {
		event.locals.session = null;
		event.locals.user = null;
	}

	const { pathname } = event.url;

	const isPublicRoute =
		pathname === '/' ||
		pathname.startsWith('/login') ||
		pathname.startsWith('/register') ||
		pathname.startsWith('/forgot-password') ||
		pathname.startsWith('/reset-password') ||
		pathname.startsWith('/api/auth') ||
		pathname.startsWith('/demo');

	// If unauthenticated and accessing a protected route, redirect to /login
	if (!event.locals.user && !isPublicRoute) {
		if (pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
	}

	// If authenticated and visiting /login or /register, redirect to /dashboard
	if (event.locals.user && (pathname === '/login' || pathname === '/register')) {
		throw redirect(303, '/dashboard');
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
