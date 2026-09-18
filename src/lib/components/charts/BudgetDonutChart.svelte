<script lang="ts">
	import { centsToZar, type BudgetStatus } from '$lib/domain/currency';

	interface CategoryBreakdownItem {
		id: string;
		name: string;
		spentCents: number;
		colorHex?: string;
	}

	interface Props {
		spentCents: number;
		targetCents: number;
		remainingCents: number;
		percentage: number;
		status?: BudgetStatus;
		categoryBreakdown?: CategoryBreakdownItem[];
	}

	let {
		spentCents = 0,
		targetCents = 0,
		remainingCents = 0,
		percentage = 0,
		status = 'normal',
		categoryBreakdown = []
	}: Props = $props();

	// Active chart view: 'budget' (Spend vs Remaining vs Target) or 'categories' (Category spend breakdown)
	let activeView: 'budget' | 'categories' = $state('budget');

	// SVG circle geometry parameters
	const radius = 58;
	const circumference = 2 * Math.PI * radius; // ~364.42px

	// Derived values for Budget Utilization Donut
	const isOverBudget = $derived(remainingCents < 0 || percentage > 100);
	const clampedPercentage = $derived(Math.min(Math.max(percentage, 0), 100));

	const spendArcLength = $derived(
		targetCents > 0 ? (clampedPercentage / 100) * circumference : 0
	);
	const remainingArcLength = $derived(
		targetCents > 0 && !isOverBudget ? circumference - spendArcLength : 0
	);

	// Slice color for spend
	const spendColor = $derived.by(() => {
		if (isOverBudget) return '#EF4444'; // rose-500
		if (percentage >= 80) return '#F59E0B'; // amber-500
		return '#0B2240'; // primary brand navy
	});

	// Filter active categories with spending for category distribution pie
	const activeCategoriesWithSpend = $derived(
		categoryBreakdown.filter((c) => c.spentCents > 0)
	);

	// Calculate slice arcs for category breakdown
	const categorySlices = $derived.by(() => {
		if (spentCents <= 0 || activeCategoriesWithSpend.length === 0) return [];

		let accumulatedLength = 0;
		return activeCategoriesWithSpend.map((cat, idx) => {
			const catPercent = (cat.spentCents / spentCents) * 100;
			const sliceLength = (cat.spentCents / spentCents) * circumference;
			const offset = -accumulatedLength;
			accumulatedLength += sliceLength;

			// Fallback palette
			const palette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
			const color = cat.colorHex || palette[idx % palette.length];

			return {
				...cat,
				percent: catPercent,
				sliceLength,
				offset,
				color
			};
		});
	});
</script>

<div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
	<!-- Chart Header with View Toggle -->
	<div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
		<div class="flex items-center space-x-2">
			<span class="w-2 h-2 rounded-full {isOverBudget ? 'bg-rose-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
			<h3 class="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
				{activeView === 'budget' ? 'Budget Utilization' : 'Category Distribution'}
			</h3>
		</div>

		{#if activeCategoriesWithSpend.length > 0}
			<div class="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
				<button
					type="button"
					onclick={() => (activeView = 'budget')}
					class="px-2.5 py-1 rounded-md transition-colors {activeView === 'budget'
						? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
						: 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}"
				>
					Budget Plan
				</button>
				<button
					type="button"
					onclick={() => (activeView = 'categories')}
					class="px-2.5 py-1 rounded-md transition-colors {activeView === 'categories'
						? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
						: 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}"
				>
					By Category
				</button>
			</div>
		{/if}
	</div>

	<!-- Main Chart Content (Side-by-side or stacked) -->
	<div class="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
		<!-- SVG Donut Chart -->
		<div class="relative w-40 h-40 shrink-0 flex items-center justify-center">
			<svg
				viewBox="0 0 140 140"
				class="w-full h-full -rotate-90 transform"
				aria-label="Financial summary chart"
				role="img"
			>
				<!-- Background Track -->
				<circle
					cx="70"
					cy="70"
					r={radius}
					fill="transparent"
					stroke="currentColor"
					stroke-width="14"
					class="text-slate-100 dark:text-slate-800"
				/>

				{#if activeView === 'budget'}
					{#if targetCents > 0}
						<!-- Spent Arc -->
						<circle
							cx="70"
							cy="70"
							r={radius}
							fill="transparent"
							stroke={spendColor}
							stroke-width="14"
							stroke-dasharray="{spendArcLength} {circumference}"
							stroke-linecap="round"
							class="transition-all duration-500 ease-out"
						/>

						<!-- Remaining Arc (if within budget) -->
						{#if !isOverBudget && remainingArcLength > 0}
							<circle
								cx="70"
								cy="70"
								r={radius}
								fill="transparent"
								stroke="#10B981"
								stroke-width="14"
								stroke-dasharray="{remainingArcLength} {circumference}"
								stroke-dashoffset={-spendArcLength}
								stroke-linecap="round"
								class="transition-all duration-500 ease-out opacity-80"
							/>
						{/if}
					{/if}
				{:else}
					<!-- Category Slices -->
					{#each categorySlices as slice (slice.id)}
						<circle
							cx="70"
							cy="70"
							r={radius}
							fill="transparent"
							stroke={slice.color}
							stroke-width="14"
							stroke-dasharray="{slice.sliceLength} {circumference}"
							stroke-dashoffset={slice.offset}
							class="transition-all duration-500 ease-out"
						/>
					{/each}
				{/if}
			</svg>

			<!-- Inner Center Label & Callout -->
			<div class="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
				{#if activeView === 'budget'}
					<span class="text-2xl font-black tabular-nums {isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}">
						{Math.round(percentage)}%
					</span>
					<span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
						{isOverBudget ? 'Exceeded' : 'Utilized'}
					</span>
				{:else}
					<span class="text-xs font-bold text-slate-700 dark:text-slate-300">
						{activeCategoriesWithSpend.length}
					</span>
					<span class="text-[10px] uppercase font-semibold text-slate-400">
						Categories
					</span>
				{/if}
			</div>
		</div>

		<!-- High-Density Metrics Chips / Legend Panel -->
		<div class="flex-1 w-full max-w-md">
			{#if activeView === 'budget'}
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<!-- Spend Metric Chip -->
					<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
						<div class="flex items-center space-x-1.5">
							<span class="w-2 h-2 rounded-full {isOverBudget ? 'bg-rose-500' : 'bg-[#0B2240] dark:bg-blue-400'}"></span>
							<p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
								Cycle Spend
							</p>
						</div>
						<p class="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
							{centsToZar(spentCents)}
						</p>
						<p class="text-[11px] text-slate-400 mt-0.5">
							{percentage.toFixed(0)}% of plan
						</p>
					</div>

					<!-- Target Metric Chip -->
					<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
						<div class="flex items-center space-x-1.5">
							<span class="w-2 h-2 rounded-full bg-slate-400"></span>
							<p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
								Monthly Target
							</p>
						</div>
						<p class="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
							{centsToZar(targetCents)}
						</p>
						<p class="text-[11px] text-slate-400 mt-0.5">
							All categories
						</p>
					</div>

					<!-- Remaining Metric Chip -->
					<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
						<div class="flex items-center space-x-1.5">
							<span class="w-2 h-2 rounded-full {remainingCents >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
							<p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
								{remainingCents >= 0 ? 'Remaining' : 'Exceeded'}
							</p>
						</div>
						<p
							class="text-base sm:text-lg font-black mt-1 tabular-nums {remainingCents >= 0
								? 'text-emerald-600 dark:text-emerald-400'
								: 'text-rose-600 dark:text-rose-400'}"
						>
							{centsToZar(Math.abs(remainingCents))}
						</p>
						<p class="text-[11px] text-slate-400 mt-0.5">
							{remainingCents >= 0 ? 'Available balance' : 'Over budget'}
						</p>
					</div>
				</div>
			{:else}
				<!-- Category Distribution Breakdown List -->
				<div class="space-y-2 max-h-48 overflow-y-auto pr-1">
					{#each categorySlices as slice (slice.id)}
						<div class="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40">
							<div class="flex items-center space-x-2 truncate">
								<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {slice.color}"></span>
								<span class="font-semibold text-slate-800 dark:text-slate-200 truncate">{slice.name}</span>
							</div>
							<div class="flex items-center space-x-2 shrink-0 tabular-nums">
								<span class="text-slate-500 dark:text-slate-400">{slice.percent.toFixed(0)}%</span>
								<span class="font-bold text-slate-900 dark:text-white">{centsToZar(slice.spentCents)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
