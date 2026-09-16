<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Set New Password — Brickwork</title>
</svelte:head>

<div>
	<h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center">
		Set a new password
	</h2>
	<p class="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
		Please enter your new password below.
	</p>

	{#if !data.valid}
		<div class="mb-5 rounded-lg bg-rose-50 dark:bg-rose-950/50 p-4 border border-rose-200 dark:border-rose-900/60 text-sm text-rose-700 dark:text-rose-300" role="alert">
			<div class="font-semibold mb-1">Invalid or Expired Link</div>
			<div>{data.error}</div>
			<div class="mt-4">
				<a href="/forgot-password" class="btn btn-sm bg-[#0B2240] text-white hover:bg-[#132f54]">
					Request a new link
				</a>
			</div>
		</div>
	{:else}
		{#if form?.error}
			<div class="mb-5 rounded-lg bg-rose-50 dark:bg-rose-950/50 p-4 border border-rose-200 dark:border-rose-900/60 text-sm text-rose-700 dark:text-rose-300 flex items-start space-x-3" role="alert">
				<svg class="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>{form.error}</span>
			</div>
		{/if}

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
			<input type="hidden" name="token" value={data.token} />

			<div>
				<label for="password" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
					New password
				</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
					class="input input-bordered w-full h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base"
					placeholder="At least 8 characters"
				/>
			</div>

			<div>
				<label for="confirmPassword" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
					Confirm new password
				</label>
				<input
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
					class="input input-bordered w-full h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base"
					placeholder="Repeat your password"
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
						<span>Updating password...</span>
					{:else}
						<span>Reset Password</span>
					{/if}
				</button>
			</div>
		</form>
	{/if}

	<div class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
		<a href="/login" class="font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
			Back to sign in
		</a>
	</div>
</div>
