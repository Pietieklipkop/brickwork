<script lang="ts">
	import { formatZAR, calculateBudgetPercentage } from '$lib/domain/currency';

	interface Props {
		id?: string;
		name: string;
		spentCents: number;
		targetCents: number;
		colorHex?: string;
		onclick?: () => void;
	}

	let {
		id,
		name,
		spentCents = 0,
		targetCents = 0,
		colorHex = '#0B2240',
		onclick
	}: Props = $props();

	let percentage = $derived(calculateBudgetPercentage(spentCents, targetCents));

	let status = $derived(() => {
		if (targetCents <= 0) {
			return spentCents > 0 ? 'exceeded' : 'safe';
		}
		if (percentage >= 100) return 'exceeded';
		if (percentage >= 80) return 'warning';
		return 'safe';
	});

	let progressWidth = $derived(Math.min(Math.max(percentage, 0), 100));

	let remainingCents = $derived(Math.max(0, targetCents - spentCents));
	let exceededCents = $derived(Math.max(0, spentCents - targetCents));
</script>

<div
	role="button"
	tabindex="0"
	{onclick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick?.();
		}
	}}
	class="group relative w-full p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all duration-150 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#0B2240] dark:focus-visible:outline-emerald-400 cursor-pointer {status() ===
	'exceeded'
		? 'border-rose-300 dark:border-rose-900/70 bg-rose-50/20 dark:bg-rose-950/10'
		: 'border-slate-200 dark:border-slate-800'}"
>
	<!-- Header Row: Category Name + Status Pill Badge -->
	<div class="flex items-center justify-between gap-2 mb-2">
		<div class="flex items-center space-x-2 truncate">
			<span
				class="w-3 h-3 rounded-full shrink-0"
				style="background-color: {colorHex || '#0B2240'};"
				aria-hidden="true"
			></span>
			<h3 class="font-semibold text-slate-900 dark:text-slate-100 text-[15px] truncate">
				{name}
			</h3>
		</div>

		<!-- Status Badge -->
		{#if status() === 'safe'}
			<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0">
				Safe ({percentage}%)
			</span>
		{:else if status() === 'warning'}
			<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
				Warning ({percentage}%)
			</span>
		{:else}
			<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 shrink-0">
				Over Budget ({percentage}%)
			</span>
		{/if}
	</div>

	<!-- Metrics Row: Spent vs Target -->
	<div class="flex items-baseline justify-between mb-2.5">
		<span class="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
			{formatZAR(spentCents)}
		</span>
		<span class="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
			target {formatZAR(targetCents)}
		</span>
	</div>

	<!-- Progress Bar Track & Fill -->
	<div
		class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2.5"
		role="progressbar"
		aria-valuenow={percentage}
		aria-valuemin="0"
		aria-valuemax="100"
		aria-label="{name} budget progress"
	>
		<div
			class="h-full rounded-full transition-all duration-300 ease-out {status() === 'safe'
				? 'bg-emerald-500'
				: status() === 'warning'
					? 'bg-amber-500'
					: 'bg-rose-500'}"
			style="width: {progressWidth}%;"
		></div>
	</div>

	<!-- Footer Row: Remaining / Exceeded Subtext + Chevron Icon -->
	<div class="flex items-center justify-between text-xs">
		{#if status() === 'exceeded'}
			<span class="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
				Exceeded by {formatZAR(exceededCents)}
			</span>
		{:else}
			<span class="text-slate-600 dark:text-slate-400 tabular-nums">
				Remaining: <strong class="text-slate-800 dark:text-slate-200">{formatZAR(remainingCents)}</strong>
			</span>
		{/if}

		<span class="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors inline-flex items-center">
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="9 18 15 12 9 6"></polyline>
			</svg>
		</span>
	</div>
</div>
