<script lang="ts">
	import { centsToZar } from '$lib/domain/currency';
	import CategoryBudgetCard from '$lib/components/cards/CategoryBudgetCard.svelte';

	let { data } = $props();

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
</script>

<svelte:head>
	<title>Dashboard | Brickwork</title>
</svelte:head>

<div class="space-y-6">
	<!-- Active Billing Cycle Banner -->
	<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<div class="flex items-center space-x-2">
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
						Active Cycle
					</span>
					<span class="text-xs text-slate-500 dark:text-slate-400">SAST (UTC+2)</span>
				</div>
				<h1 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
					{formatDateShort(data.cycleWindow.startDate)} – {formatDateShort(data.cycleWindow.endDate)}
				</h1>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
					Monthly cycle starts on day {data.user.monthStartDay ?? 1} of each month.
				</p>
			</div>

			<a
				href="/capture"
				class="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0B2240] hover:bg-[#132f54] text-white text-sm font-bold shadow transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
			>
				<svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
					<circle cx="12" cy="13" r="3"></circle>
				</svg>
				<span>Capture Receipt</span>
			</a>
		</div>

		<!-- High-Level Financial Metrics Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
			<!-- Total Spent -->
			<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
				<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
					Cycle Spend
				</p>
				<p class="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
					{centsToZar(data.metrics.totalSpentCents)}
				</p>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
					{data.metrics.percentage.toFixed(0)}% of monthly target
				</p>
			</div>

			<!-- Total Monthly Target -->
			<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
				<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
					Monthly Target
				</p>
				<p class="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
					{centsToZar(data.metrics.totalTargetCents)}
				</p>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
					Sum of category budgets
				</p>
			</div>

			<!-- Remaining / Over-budget -->
			<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
				<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
					{data.metrics.remainingCents >= 0 ? 'Remaining Budget' : 'Budget Exceeded'}
				</p>
				<p
					class="text-2xl font-black mt-1 tabular-nums {data.metrics.remainingCents >= 0
						? 'text-emerald-600 dark:text-emerald-400'
						: 'text-rose-600 dark:text-rose-400'}"
				>
					{centsToZar(Math.abs(data.metrics.remainingCents))}
				</p>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
					{data.metrics.remainingCents >= 0 ? 'Within monthly plan' : 'Review expenses'}
				</p>
			</div>
		</div>
	</div>

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
