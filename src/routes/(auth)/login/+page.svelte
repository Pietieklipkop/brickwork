<script lang="ts">
	import { signIn } from '$lib/auth-client';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	$effect(() => {
		if (page.url.searchParams.get('reset') === 'success') {
			successMessage = 'Your password has been reset successfully. Please log in.';
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';
		loading = true;

		try {
			const res = await signIn.email({
				email: email.trim().toLowerCase(),
				password
			});

			if (res.error) {
				errorMessage = res.error.message || 'Invalid email or password. Please try again.';
				loading = false;
				return;
			}

			const redirectTo = page.url.searchParams.get('redirectTo') || '/dashboard';
			await goto(redirectTo, { invalidateAll: true });
		} catch (err: any) {
			errorMessage = err?.message || 'An unexpected error occurred. Please try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In — Brickwork</title>
</svelte:head>

<div>
	<h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
		Sign in to your account
	</h2>

	{#if errorMessage}
		<div class="mb-5 rounded-lg bg-rose-50 dark:bg-rose-950/50 p-4 border border-rose-200 dark:border-rose-900/60 text-sm text-rose-700 dark:text-rose-300 flex items-start space-x-3" role="alert">
			<svg class="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="mb-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-4 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-700 dark:text-emerald-300 flex items-start space-x-3" role="alert">
			<svg class="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span>{successMessage}</span>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<label for="email" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
				Email address
			</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				bind:value={email}
				class="input input-bordered w-full h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base"
				placeholder="name@company.co.za"
			/>
		</div>

		<div>
			<div class="flex items-center justify-between mb-1">
				<label for="password" class="block text-sm font-semibold text-slate-700 dark:text-slate-300">
					Password
				</label>
				<a href="/forgot-password" class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
					Forgot password?
				</a>
			</div>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				bind:value={password}
				class="input input-bordered w-full h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base"
				placeholder="••••••••"
			/>
		</div>

		<div class="pt-2">
			<button
				type="submit"
				disabled={loading}
				class="btn w-full h-12 bg-[#0B2240] hover:bg-[#132f54] text-white font-bold text-base border-none shadow-md transition-all flex items-center justify-center space-x-2"
			>
				{#if loading}
					<span class="loading loading-spinner loading-sm"></span>
					<span>Signing in...</span>
				{:else}
					<span>Sign in</span>
				{/if}
			</button>
		</div>
	</form>

	<div class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
		Don't have an account?{' '}
		<a href="/register" class="font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
			Create an account
		</a>
	</div>
</div>
