<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { centsToZar } from '$lib/domain/currency';
	import CurrencyInputField from '$lib/components/forms/CurrencyInputField.svelte';
	import PrimaryActionButton from '$lib/components/ui/PrimaryActionButton.svelte';

	let { data } = $props();

	// Filter state
	let selectedCompany = $state('');
	let dateFilterMode = $state('current_cycle');
	let fromDate = $state('');
	let toDate = $state('');
	let vendorSearch = $state('');
	let selectedCategory = $state('');

	$effect(() => {
		selectedCompany = data.filters.selectedCompanyId;
		dateFilterMode = data.filters.dateFilter;
		fromDate = data.filters.from;
		toDate = data.filters.to;
		vendorSearch = data.filters.vendor;
		selectedCategory = data.filters.categoryId;
	});

	// Edit Modal State
	let editingExpense: any = $state(null);
	let editVendor = $state('');
	let editAmountCents = $state(0);
	let editDate = $state('');
	let editCategory = $state('');
	let editNotes = $state('');
	let isUpdating = $state(false);
	let updateError = $state('');

	// Delete Dialog State
	let deletingExpenseId: string | null = $state(null);
	let isDeleting = $state(false);

	// Receipt preview state
	let previewImageKey: string | null = $state(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedCompany) params.set('company', selectedCompany);
		if (dateFilterMode) params.set('dateFilter', dateFilterMode);
		if (dateFilterMode === 'custom') {
			if (fromDate) params.set('from', fromDate);
			if (toDate) params.set('to', toDate);
		}
		if (vendorSearch.trim()) params.set('vendor', vendorSearch.trim());
		if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);

		goto(`/expenses?${params.toString()}`);
	}

	function resetFilters() {
		selectedCompany = data.filters.selectedCompanyId;
		dateFilterMode = 'current_cycle';
		fromDate = data.cycleWindow.startDate;
		toDate = data.cycleWindow.endDate;
		vendorSearch = '';
		selectedCategory = '';
		goto('/expenses');
	}

	function startEdit(exp: any) {
		editingExpense = exp;
		editVendor = exp.vendorName;
		editAmountCents = exp.amountCents;
		editDate = exp.transactionDate;
		editCategory = exp.categoryId;
		editNotes = exp.notes || '';
		updateError = '';
	}

	async function handleUpdateSubmit(e: Event) {
		e.preventDefault();
		if (!editingExpense) return;
		isUpdating = true;
		updateError = '';

		const form = new FormData();
		form.append('id', editingExpense.id);
		form.append('vendorName', editVendor.trim());
		form.append('amountCents', String(editAmountCents));
		form.append('transactionDate', editDate);
		form.append('categoryId', editCategory);
		if (editNotes) form.append('notes', editNotes.trim());

		try {
			const res = await fetch('/expenses?/updateExpense', {
				method: 'POST',
				body: form
			});

			if (res.ok) {
				editingExpense = null;
				await invalidateAll();
			} else {
				const result = (await res.json().catch(() => null)) as any;
				updateError = result?.error || 'Failed to update expense. Please check your inputs.';
			}
		} catch (err: any) {
			updateError = err?.message || 'A network error occurred.';
		} finally {
			isUpdating = false;
		}
	}

	async function confirmDelete() {
		if (!deletingExpenseId) return;
		isDeleting = true;

		const form = new FormData();
		form.append('id', deletingExpenseId);

		try {
			const res = await fetch('/expenses?/deleteExpense', {
				method: 'POST',
				body: form
			});

			if (res.ok) {
				deletingExpenseId = null;
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to delete expense:', err);
		} finally {
			isDeleting = false;
		}
	}

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
	<title>Expense History | Brickwork</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
				Expense History
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400">
				Search, filter, and audit recorded receipts and expenses (AC-09)
			</p>
		</div>

		<a
			href="/capture"
			class="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#0B2240] hover:bg-[#132f54] text-white text-xs font-bold shadow transition-transform active:scale-95"
		>
			<svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="M12 5v14M5 12h14"></path>
			</svg>
			<span>Record Expense</span>
		</a>
	</div>

	<!-- Combinable Filters Bar (AC-09) -->
	<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
		<!-- Filter Controls Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- Date Range Filter Mode -->
			<div>
				<label for="filter-date-mode" class="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
					Date Window
				</label>
				<select
					id="filter-date-mode"
					bind:value={dateFilterMode}
					onchange={applyFilters}
					class="select select-bordered select-sm w-full bg-slate-50 dark:bg-slate-800 font-medium text-xs"
				>
					<option value="current_cycle">
						Current Cycle ({formatDateShort(data.cycleWindow.startDate)} – {formatDateShort(data.cycleWindow.endDate)})
					</option>
					<option value="custom">Custom Date Range</option>
					<option value="all">All Dates</option>
				</select>
			</div>

			<!-- Vendor Search Input -->
			<div>
				<label for="filter-vendor" class="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
					Vendor / Merchant
				</label>
				<div class="relative">
					<input
						id="filter-vendor"
						type="text"
						bind:value={vendorSearch}
						placeholder="Search merchant..."
						onkeydown={(e) => e.key === 'Enter' && applyFilters()}
						class="input input-bordered input-sm w-full bg-slate-50 dark:bg-slate-800 text-xs pl-8"
					/>
					<svg class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<path d="m21 21-4.3-4.3"></path>
					</svg>
				</div>
			</div>

			<!-- Category Filter Dropdown -->
			<div>
				<label for="filter-category" class="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
					Category
				</label>
				<select
					id="filter-category"
					bind:value={selectedCategory}
					onchange={applyFilters}
					class="select select-bordered select-sm w-full bg-slate-50 dark:bg-slate-800 font-medium text-xs"
				>
					<option value="">All Categories</option>
					{#each data.companyCategories as cat}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>
			</div>

			<!-- Action Filter Buttons -->
			<div class="flex items-end space-x-2">
				<button
					type="button"
					onclick={applyFilters}
					class="btn btn-sm bg-[#0B2240] hover:bg-[#132f54] text-white flex-1 font-bold text-xs"
				>
					Apply
				</button>
				<button
					type="button"
					onclick={resetFilters}
					class="btn btn-sm btn-ghost text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
				>
					Reset
				</button>
			</div>
		</div>

		<!-- Custom Date Range Row (Shown only if dateFilterMode === 'custom') -->
		{#if dateFilterMode === 'custom'}
			<div class="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
				<div>
					<label for="filter-from" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
						From Date (SAST)
					</label>
					<input
						id="filter-from"
						type="date"
						bind:value={fromDate}
						class="input input-bordered input-sm w-full bg-slate-50 dark:bg-slate-800 text-xs font-mono"
					/>
				</div>
				<div>
					<label for="filter-to" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
						To Date (SAST)
					</label>
					<input
						id="filter-to"
						type="date"
						bind:value={toDate}
						class="input input-bordered input-sm w-full bg-slate-50 dark:bg-slate-800 text-xs font-mono"
					/>
				</div>
			</div>
		{/if}
	</div>

	<!-- Results Summary Bar -->
	<div class="flex items-center justify-between px-1">
		<p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
			Showing <span class="font-bold text-slate-900 dark:text-slate-100">{data.expenses.length}</span> {data.expenses.length === 1 ? 'transaction' : 'transactions'}
		</p>
		<p class="text-xs text-slate-500 dark:text-slate-400">
			Total Filtered: <span class="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{centsToZar(data.totalFilteredCents)}</span>
		</p>
	</div>

	<!-- Expenses Ledger List -->
	{#if data.expenses.length === 0}
		<div class="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
			<svg class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.3-4.3"></path>
			</svg>
			<h3 class="text-base font-bold text-slate-800 dark:text-slate-200">No matching expenses found</h3>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
				Try loosening your filter criteria or reset filters to view the current month cycle.
			</p>
			<button
				type="button"
				onclick={resetFilters}
				class="mt-4 px-4 py-2 text-xs font-bold text-[#0B2240] dark:text-emerald-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
			>
				Reset All Filters
			</button>
		</div>
	{:else}
		<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
			{#each data.expenses as exp (exp.id)}
				<div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
					<!-- Expense Info Left -->
					<div class="flex items-start space-x-3.5 min-w-0">
						<!-- Receipt Thumbnail Trigger -->
						<div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
							{#if exp.receiptImageKey}
								<button
									type="button"
									onclick={() => (previewImageKey = exp.receiptImageKey)}
									title="View receipt slip"
									aria-label="View receipt slip for {exp.vendorName}"
									class="text-emerald-600 dark:text-emerald-400 hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
								>
									<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
										<circle cx="9" cy="9" r="2"/>
										<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
									</svg>
								</button>
							{:else}
								<svg class="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
								</svg>
							{/if}
						</div>

						<!-- Details -->
						<div class="min-w-0 space-y-1">
							<div class="flex items-center space-x-2 flex-wrap gap-y-1">
								<p class="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
									{exp.vendorName}
								</p>
								{#if exp.receiptImageKey}
									<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
										R2 Voucher
									</span>
								{/if}
								{#if exp.isReimbursable}
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800">
										Reimbursable {exp.reimbursableCompanyName ? `• ${exp.reimbursableCompanyName}` : ''}
									</span>
								{/if}
							</div>

							<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
								<span class="inline-flex items-center space-x-1">
									<span
										class="inline-block w-2 h-2 rounded-full shrink-0"
										style="background-color: {exp.categoryColor || '#64748B'}"
									></span>
									<span class="font-medium text-slate-700 dark:text-slate-300">
										{exp.categoryName || 'Uncategorized'}
									</span>
								</span>
								<span>&bull;</span>
								<span>{formatDateShort(exp.transactionDate)}</span>
							</div>

							{#if exp.notes}
								<p class="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1">
									"{exp.notes}"
								</p>
							{/if}
						</div>
					</div>

					<!-- Amount & Actions Right -->
					<div class="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
						<span class="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums">
							{centsToZar(exp.amountCents)}
						</span>

						<div class="flex items-center space-x-1">
							<!-- Edit Button (AC-04) -->
							<button
								type="button"
								onclick={() => startEdit(exp)}
								aria-label="Edit expense {exp.vendorName}"
								title="Edit Expense"
								class="p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							>
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
								</svg>
							</button>

							<!-- Delete Button (AC-04) -->
							<button
								type="button"
								onclick={() => (deletingExpenseId = exp.id)}
								aria-label="Delete expense {exp.vendorName}"
								title="Delete Expense"
								class="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
							>
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="3 6 5 6 21 6"></polyline>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Edit Expense Modal (AC-04) -->
{#if editingExpense}
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-modal-title"
	>
		<div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
				<h2 id="edit-modal-title" class="text-lg font-bold text-slate-900 dark:text-white">
					Edit Expense
				</h2>
				<button
					type="button"
					onclick={() => (editingExpense = null)}
					class="p-1 rounded text-slate-400 hover:text-slate-600"
					aria-label="Close edit modal"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			{#if updateError}
				<div class="alert alert-error text-xs rounded-lg p-2">
					<span>{updateError}</span>
				</div>
			{/if}

			<form onsubmit={handleUpdateSubmit} class="space-y-4">
				<div>
					<label for="edit-vendor" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
						Vendor / Merchant <span class="text-rose-500">*</span>
					</label>
					<input
						id="edit-vendor"
						type="text"
						required
						bind:value={editVendor}
						class="input input-bordered w-full h-11 text-sm bg-slate-50 dark:bg-slate-800"
					/>
				</div>

				<CurrencyInputField
					bind:valueCents={editAmountCents}
					label="Amount (ZAR)"
					id="edit-amount"
					required
				/>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="edit-date" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
							Date (SAST) <span class="text-rose-500">*</span>
						</label>
						<input
							id="edit-date"
							type="date"
							required
							bind:value={editDate}
							class="input input-bordered w-full h-11 text-sm bg-slate-50 dark:bg-slate-800 font-mono"
						/>
					</div>

					<div>
						<label for="edit-cat" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
							Category <span class="text-rose-500">*</span>
						</label>
						<select
							id="edit-cat"
							bind:value={editCategory}
							required
							class="select select-bordered w-full h-11 text-sm bg-slate-50 dark:bg-slate-800"
						>
							{#each data.companyCategories as cat}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="edit-notes" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
						Notes
					</label>
					<input
						id="edit-notes"
						type="text"
						bind:value={editNotes}
						class="input input-bordered w-full h-11 text-sm bg-slate-50 dark:bg-slate-800"
					/>
				</div>

				<div class="pt-2 flex items-center justify-end space-x-3">
					<button
						type="button"
						onclick={() => (editingExpense = null)}
						class="btn btn-ghost btn-sm"
					>
						Cancel
					</button>
					<PrimaryActionButton
						type="submit"
						loading={isUpdating}
						variant="primary"
						class="btn-sm"
					>
						Save Changes
					</PrimaryActionButton>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Dialog (AC-04) -->
{#if deletingExpenseId}
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-dialog-title"
	>
		<div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
			<div class="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
				<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="3 6 5 6 21 6"></polyline>
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
				</svg>
			</div>

			<div>
				<h3 id="delete-dialog-title" class="text-base font-bold text-slate-900 dark:text-white">
					Delete Expense?
				</h3>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
					This will permanently delete this transaction and delete the receipt voucher from private R2 storage (AC-04).
				</p>
			</div>

			<div class="flex items-center justify-center space-x-3 pt-2">
				<button
					type="button"
					onclick={() => (deletingExpenseId = null)}
					disabled={isDeleting}
					class="btn btn-ghost btn-sm"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmDelete}
					disabled={isDeleting}
					class="btn bg-rose-600 hover:bg-rose-700 text-white btn-sm border-none font-bold"
				>
					{#if isDeleting}
						<span class="loading loading-spinner loading-xs"></span>
					{/if}
					<span>Delete</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Receipt Slip Image Viewer Modal -->
{#if previewImageKey}
	<div
		class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Receipt Image Preview"
		tabindex="-1"
		onclick={() => (previewImageKey = null)}
		onkeydown={(e) => {
			if (e.key === 'Escape') previewImageKey = null;
		}}
	>
		<div
			class="relative max-w-lg max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<button
				type="button"
				onclick={() => (previewImageKey = null)}
				class="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
				aria-label="Close image preview"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
			<img
				src={`/api/receipts/${previewImageKey}`}
				alt="Receipt voucher"
				class="max-h-[80vh] w-auto object-contain rounded-xl"
			/>
		</div>
	</div>
{/if}
