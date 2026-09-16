<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Create Account — Brickwork</title>
</svelte:head>

<div>
	<h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
		Create your Brickwork account
	</h2>

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
		<div>
			<label for="name" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
				Full Name
			</label>
			<input
				id="name"
				name="name"
				type="text"
				autocomplete="name"
				required
				value={form?.name || ''}
				class="input input-bordered w-full h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base"
				placeholder="Stefan van Dyk"
			/>
		</div>

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
				value={form?.email || ''}
				class="input input-bordered w-full h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base"
				placeholder="stefan@mycompany.co.za"
			/>
		</div>

		<div>
			<label for="password" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
				Password
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
			<label for="monthStartDay" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
				Month Cycle Start Day
			</label>
			<div class="flex items-center space-x-3">
				<select
					id="monthStartDay"
					name="monthStartDay"
					class="select select-bordered w-full h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-base"
				>
					<option value="1">Day 1 (1st of month — Calendar Month)</option>
					<option value="15">Day 15 (Mid-month cycle)</option>
					<option value="25" selected>Day 25 (Standard South African Payday cycle)</option>
					{#each Array.from({ length: 28 }, (_, i) => i + 1) as day}
						{#if day !== 1 && day !== 15 && day !== 25}
							<option value={day}>Day {day} of each month</option>
						{/if}
					{/each}
				</select>
			</div>
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				Category spend targets will automatically reset on this day each month.
			</p>
		</div>

		<div class="pt-3">
			<button
				type="submit"
				disabled={loading}
				class="btn w-full h-12 bg-[#0B2240] hover:bg-[#132f54] text-white font-bold text-base border-none shadow-md transition-all flex items-center justify-center space-x-2"
			>
				{#if loading}
					<span class="loading loading-spinner loading-sm"></span>
					<span>Setting up account...</span>
				{:else}
					<span>Create Account</span>
				{/if}
			</button>
		</div>
	</form>

	<div class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
		Already have an account?{' '}
		<a href="/login" class="font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
			Sign in
		</a>
	</div>
</div>
