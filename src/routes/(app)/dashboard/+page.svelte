<script lang="ts">
	import { goto } from '$app/navigation';
	import { centsToZar } from '$lib/domain/currency';
	import CategoryBudgetCard from '$lib/components/cards/CategoryBudgetCard.svelte';
	import BudgetDonutChart from '$lib/components/charts/BudgetDonutChart.svelte';

	let { data } = $props();

	let isFilterModalOpen = $state(false);
	let filterFrom = $state('');
	let filterTo = $state('');

	$effect(() => {
		filterFrom = data.cycleWindow.startDate;
		filterTo = data.cycleWindow.endDate;
	});

	function formatDateShort(isoDate: string): string {
		try {
			const parts = isoDate.split('-');
			if (parts.length !== 3) return isoDate;
			const [year, month, day] = parts;
			const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			const monthName = months[parseInt(month, 10) - 1] || month;
			return `${parseInt(day, 10)} ${monthName} ${year}`;
		} catch {
			return isoDate;
		}
	}

	function handleApplyFilter(e: Event) {
		e.preventDefault();
		if (!filterFrom || !filterTo) return;
		if (filterFrom > filterTo) {
			alert('From Date must be before or equal to To Date');
			return;
		}
		isFilterModalOpen = false;
		goto(`/dashboard?from=${filterFrom}&to=${filterTo}`);
	}

	function handleResetFilter() {
		isFilterModalOpen = false;
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Dashboard | Brickwork</title>
</svelte:head>

<div class="space-y-6">
	<!-- Active Billing Cycle Banner with Date Filter (AC-17) -->
	<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<div class="flex items-center flex-wrap gap-2 mb-1.5">
					<!-- Top-Left Filter Button (AC-17) -->
					<button
						type="button"
						onclick={() => (isFilterModalOpen = true)}
						class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs {data.isFiltered
							? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse-once ring-2 ring-amber-300 dark:ring-amber-800'
							: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}"
						aria-label="Filter dashboard by date range"
					>
						<svg class="w-3.5 h-3.5 {data.isFiltered ? 'text-white' : 'text-slate-500'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
						</svg>
						<span>{data.isFiltered ? 'Filter Active' : 'Filter Dates'}</span>
					</button>

					{#if data.isFiltered}
						<button
							type="button"
							onclick={handleResetFilter}
							class="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline px-1"
							title="Reset to default billing cycle"
						>
							Reset
						</button>
					{/if}

					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold {data.isFiltered
						? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
						: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'}">
						{data.isFiltered ? 'Custom Range' : 'Active Cycle'}
					</span>
					<span class="text-xs text-slate-500 dark:text-slate-400">SAST (UTC+2)</span>
				</div>

				<h1 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
					{formatDateShort(data.cycleWindow.startDate)} – {formatDateShort(data.cycleWindow.endDate)}
				</h1>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
					{data.isFiltered
						? 'Viewing custom filtered date range. Budget targets remain monthly.'
						: `Monthly cycle starts on day ${data.user.monthStartDay ?? 1} of each month.`}
				</p>
			</div>

			<!-- Action Buttons: Upload Receipt & Capture Receipt (AC-19) -->
			<div class="flex items-center gap-2 shrink-0">
				<a
					href="/capture?mode=upload"
					class="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95"
					title="Upload a receipt or invoice from files or email"
				>
					<svg class="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="17 8 12 3 7 8"></polyline>
						<line x1="12" y1="3" x2="12" y2="15"></line>
					</svg>
					<span>Upload Receipt</span>
				</a>

				<a
					href="/capture"
					class="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0B2240] hover:bg-[#132f54] text-white text-xs sm:text-sm font-bold shadow transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
				>
					<svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
						<circle cx="12" cy="13" r="3"></circle>
					</svg>
					<span>Capture Receipt</span>
				</a>
			</div>
		</div>

		<!-- Visual Budget Utilization Donut Chart (AC-18) -->
		<div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
			<BudgetDonutChart
				spentCents={data.metrics.totalSpentCents}
				targetCents={data.metrics.totalTargetCents}
				remainingCents={data.metrics.remainingCents}
				percentage={data.metrics.percentage}
				status={data.metrics.status}
				categoryBreakdown={data.categoryBudgets}
			/>
		</div>
	</div>

	<!-- Date Filter Modal Dialog (AC-17) -->
	{#if isFilterModalOpen}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
			<div
				class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4"
				role="dialog"
				aria-modal="true"
				aria-labelledby="filter-modal-title"
			>
				<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
					<div class="flex items-center space-x-2">
						<div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
							<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
							</svg>
						</div>
						<h2 id="filter-modal-title" class="text-base font-bold text-slate-900 dark:text-white">
							Filter Dashboard by Date Range
						</h2>
					</div>
					<button
						type="button"
						onclick={() => (isFilterModalOpen = false)}
						class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
						aria-label="Close filter modal"
					>
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<form onsubmit={handleApplyFilter} class="space-y-4">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="filter-from" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
								From Date <span class="text-rose-500">*</span>
							</label>
							<input
								id="filter-from"
								type="date"
								required
								bind:value={filterFrom}
								class="input input-bordered input-sm w-full font-mono text-xs"
							/>
						</div>
						<div>
							<label for="filter-to" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
								To Date <span class="text-rose-500">*</span>
							</label>
							<input
								id="filter-to"
								type="date"
								required
								bind:value={filterTo}
								class="input input-bordered input-sm w-full font-mono text-xs"
							/>
						</div>
					</div>

					<p class="text-[11px] text-slate-500 dark:text-slate-400">
						Expenses within this window will be aggregated. The filter button will turn amber while custom dates are applied.
					</p>

					<div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
						<button
							type="button"
							onclick={handleResetFilter}
							class="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline"
						>
							Reset to Billing Cycle
						</button>

						<div class="flex items-center space-x-2">
							<button
								type="button"
								onclick={() => (isFilterModalOpen = false)}
								class="btn btn-sm btn-ghost text-xs"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="btn btn-sm bg-[#0B2240] text-white hover:bg-[#132f54] text-xs font-bold px-4"
							>
								Apply Filter
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Category Budget Progress Section (AC-07) -->
	<section aria-labelledby="category-budgets-heading">
		<div class="flex items-center justify-between mb-4">
			<h2 id="category-budgets-heading" class="text-lg font-bold text-slate-900 dark:text-slate-100">
				Category Budgets
			</h2>
			<a
				href="/settings"
				class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
			>
				Manage Categories &rarr;
			</a>
		</div>

		{#if data.categoryBudgets.length === 0}
			<div class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
				<p class="text-sm text-slate-500 dark:text-slate-400">No categories found for this company.</p>
				<a
					href="/settings"
					class="mt-3 inline-block px-4 py-2 text-xs font-bold text-white bg-[#0B2240] rounded-xl hover:bg-[#132f54]"
				>
					Configure Categories in Settings
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each data.categoryBudgets as cat (cat.id)}
					<CategoryBudgetCard
						name={cat.name}
						spentCents={cat.spentCents}
						targetCents={cat.targetCents}
						colorHex={cat.colorHex}
					/>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Recent Transactions Section (AC-08) -->
	<section aria-labelledby="recent-expenses-heading">
		<div class="flex items-center justify-between mb-4">
			<h2 id="recent-expenses-heading" class="text-lg font-bold text-slate-900 dark:text-slate-100">
				Recent Transactions
			</h2>
			<a
				href="/expenses"
				class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
			>
				View All Expenses &rarr;
			</a>
		</div>

		{#if data.recentExpenses.length === 0}
			<div class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
				<svg class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path>
					<path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
					<path d="M12 6v12"></path>
				</svg>
				<p class="text-sm font-semibold text-slate-700 dark:text-slate-300">No expenses recorded yet</p>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Capture a point-of-purchase receipt to get started.</p>
				<a
					href="/capture"
					class="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B2240] rounded-xl hover:bg-[#132f54]"
				>
					<span>Capture Receipt</span>
				</a>
			</div>
		{:else}
			<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
				{#each data.recentExpenses as exp (exp.id)}
					<div class="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
						<div class="flex items-center space-x-3 min-w-0">
							<!-- Receipt Thumbnail / Icon Indicator (AC-08) -->
							<div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
								{#if exp.receiptImageKey}
									<a
										href={`/api/receipts/${exp.receiptImageKey}`}
										target="_blank"
										rel="noopener noreferrer"
										title="View full receipt image"
										class="text-emerald-600 dark:text-emerald-400 hover:scale-110 transition-transform"
										aria-label="Receipt attached for {exp.vendorName}"
									>
										<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
											<circle cx="9" cy="9" r="2"/>
											<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
										</svg>
									</a>
								{:else}
									<svg class="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
									</svg>
								{/if}
							</div>

							<!-- Vendor & Category Badge -->
							<div class="min-w-0">
								<div class="flex items-center space-x-2">
									<p class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
										{exp.vendorName}
									</p>
									{#if exp.receiptImageKey}
										<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
											Receipt
										</span>
									{/if}
								</div>
								<div class="flex items-center space-x-2 mt-0.5">
									<span
										class="inline-block w-2 h-2 rounded-full"
										style="background-color: {exp.categoryColor || '#64748B'}"
									></span>
									<span class="text-xs text-slate-500 dark:text-slate-400 truncate">
										{exp.categoryName || 'Uncategorized'}
									</span>
									<span class="text-xs text-slate-300 dark:text-slate-600">&bull;</span>
									<span class="text-xs text-slate-400 dark:text-slate-500">
										{formatDateShort(exp.transactionDate)}
									</span>
								</div>
							</div>
						</div>

						<!-- Amount in ZAR -->
						<div class="text-right shrink-0">
							<span class="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
								{centsToZar(exp.amountCents)}
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>
