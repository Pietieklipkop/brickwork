import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { getDb, schema } from '$lib/server/db';

export const createAuth = (d1: D1Database, appUrl?: string, secret?: string) => {
	const resolvedUrl = appUrl || 'http://localhost:5173';
	const isLocalDev =
		resolvedUrl.startsWith('http://localhost') || resolvedUrl.startsWith('http://127.0.0.1');
	const resolvedSecret = secret || (isLocalDev ? 'brickwork-local-dev-secret-min-32-chars!!' : '');

	if (!resolvedSecret) {
		throw new Error('BETTER_AUTH_SECRET environment secret is required in non-local environments.');
	}

	return betterAuth({
		baseURL: resolvedUrl,
		secret: resolvedSecret,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false
		},
		database: drizzleAdapter(getDb(d1), {
			provider: 'sqlite',
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification
			}
		}),
		user: {
			additionalFields: {
				role: {
					type: 'string',
					required: false,
					defaultValue: 'main_member',
					input: false
				},
				defaultCompanyId: {
					type: 'string',
					required: false,
					input: false
				},
				monthStartDay: {
					type: 'number',
					required: false,
					defaultValue: 1,
					input: false
				}
			}
		},
		plugins: [
			sveltekitCookies(getRequestEvent) // must be last plugin
		]
	});
};

export type AppAuth = ReturnType<typeof createAuth>;
