<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Forgot Password — Brickwork</title>
</svelte:head>

<div>
	<h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center">
		Reset your password
	</h2>
	<p class="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
		Enter your email address and we'll send you a secure link to reset your password.
	</p>

	{#if form?.error}
		<div class="mb-5 rounded-lg bg-rose-50 dark:bg-rose-950/50 p-4 border border-rose-200 dark:border-rose-900/60 text-sm text-rose-700 dark:text-rose-300 flex items-start space-x-3" role="alert">
			<svg class="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{form.error}</span>
		</div>
	{/if}

	{#if form?.success}
		<div class="mb-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-4 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-700 dark:text-emerald-300 flex items-start space-x-3" role="alert">
			<svg class="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span>{form.message}</span>
		</div>
	{:else}
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
			class="space-y-4"
		>
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
					class="input input-bordered w-full h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base"
					placeholder="name@company.co.za"
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
						<span>Sending link...</span>
					{:else}
						<span>Send Reset Link</span>
					{/if}
				</button>
			</div>
		</form>
	{/if}

	<div class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
		Remember your password?{' '}
		<a href="/login" class="font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
			Back to sign in
		</a>
	</div>
</div>
