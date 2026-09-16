import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { getDb, schema } from '$lib/server/db';

export const createAuth = (d1: D1Database, appUrl?: string, secret?: string) =>
	betterAuth({
		baseURL: appUrl || 'http://localhost:5173',
		secret: secret || 'brickwork-enterprise-secret-key-min-32-chars-long!',
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

export type AppAuth = ReturnType<typeof createAuth>;
