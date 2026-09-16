<script lang="ts">
	import CurrencyInputField from '$lib/components/forms/CurrencyInputField.svelte';
	import PrimaryActionButton from '$lib/components/ui/PrimaryActionButton.svelte';
	import type { ExtractedReceiptData } from '$lib/domain/extraction';

	interface CategoryOption {
		id: string;
		name: string;
		colorHex?: string;
	}

	interface AccountOption {
		id: string;
		name: string;
		isDefault?: boolean;
	}

	interface Props {
		extractedData: ExtractedReceiptData;
		previewUrl?: string;
		categories: CategoryOption[];
		paymentAccounts: AccountOption[];
		isSaving?: boolean;
		onsave: (expense: {
			vendorName: string;
			amountCents: number;
			transactionDate: string;
			categoryId: string;
			accountId?: string;
			notes?: string;
		}) => void;
		oncancel: () => void;
	}

	let {
		extractedData,
		previewUrl = '',
		categories = [],
		paymentAccounts = [],
		isSaving = false,
		onsave,
		oncancel
	}: Props = $props();

	// Editable state fields
	let vendorName = $state('');
	let amountCents = $state(0);
	let transactionDate = $state(new Date().toISOString().split('T')[0]);
	let categoryId = $state('');
	let accountId = $state('');
	let notes = $state('');

	$effect(() => {
		vendorName = extractedData.vendorName || '';
		amountCents = extractedData.amountCents || 0;
		transactionDate = extractedData.transactionDate || new Date().toISOString().split('T')[0];
		categoryId = extractedData.suggestedCategoryId || categories[0]?.id || '';
		accountId = paymentAccounts.find((a) => a.isDefault)?.id || paymentAccounts[0]?.id || '';
	});

	// Validation
	let hasVendorError = $state(false);
	let hasAmountError = $state(false);

	function handleSubmit(e: Event) {
		e.preventDefault();
		hasVendorError = false;
		hasAmountError = false;

		if (!vendorName.trim()) {
			hasVendorError = true;
			return;
		}

		if (amountCents <= 0) {
			hasAmountError = true;
			return;
		}

		onsave({
			vendorName: vendorName.trim(),
			amountCents,
			transactionDate,
			categoryId,
			accountId: accountId || undefined,
			notes: notes.trim() || undefined
		});
	}
</script>

<!-- Backdrop Overlay -->
<div
	class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="review-sheet-title"
>
	<!-- Modal / Bottom Sheet Container -->
	<div
		class="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200"
	>
		<!-- Drag Bar for mobile touch -->
		<div class="w-full flex items-center justify-center pt-3 pb-1 sm:hidden">
			<div class="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
		</div>

		<!-- Header -->
		<div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
			<div>
				<h2 id="review-sheet-title" class="text-lg font-bold text-slate-900 dark:text-slate-100">
					Review Extracted Expense
				</h2>
				<p class="text-xs text-slate-500 dark:text-slate-400">
					Verify details extracted by AI before persisting (AC-02)
				</p>
			</div>

			<button
				type="button"
				onclick={oncancel}
				disabled={isSaving}
				class="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
				aria-label="Close review"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		</div>

		<!-- Scrollable Body Form -->
		<form onsubmit={handleSubmit} class="p-6 overflow-y-auto space-y-4 flex-1">
			<!-- Receipt Image Thumbnail & AI Confidence -->
			{#if previewUrl}
				<div class="flex items-center space-x-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
					<img
						src={previewUrl}
						alt="Captured receipt thumbnail"
						class="w-14 h-18 object-cover rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm shrink-0"
					/>
					<div class="text-xs space-y-1">
						<span class="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
							AI Confidence: {Math.round((extractedData.confidence || 0.8) * 100)}%
						</span>
						<p class="text-slate-500 dark:text-slate-400">
							Receipt voucher will be stored in private R2 bucket.
						</p>
					</div>
				</div>
			{/if}

			<!-- Vendor Name Field -->
			<div>
				<label for="review-vendor" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
					Vendor / Merchant <span class="text-rose-500">*</span>
				</label>
				<input
					id="review-vendor"
					type="text"
					required
					bind:value={vendorName}
					placeholder="e.g. Woolworths, Shell, Checkers"
					class="input input-bordered w-full h-12 text-base font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 {hasVendorError
						? 'border-rose-500 focus:border-rose-500'
						: ''}"
				/>
				{#if hasVendorError}
					<p class="mt-1 text-xs text-rose-600">Please provide the vendor name.</p>
				{/if}
			</div>

			<!-- Currency Input Field -->
			<div>
				<CurrencyInputField
					bind:valueCents={amountCents}
					label="Total Amount (ZAR)"
					id="review-amount"
					required
					hasError={hasAmountError}
					errorMessage={hasAmountError ? 'Please enter an amount greater than R 0.00' : ''}
				/>
			</div>

			<!-- Spend Category Dropdown -->
			<div>
				<label for="review-category" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
					Spend Category <span class="text-rose-500">*</span>
				</label>
				<select
					id="review-category"
					bind:value={categoryId}
					required
					class="select select-bordered w-full h-12 text-base bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
				>
					{#each categories as cat}
						<option value={cat.id}>
							{cat.name}
						</option>
					{/each}
				</select>
			</div>

			<!-- Transaction Date & Payment Account 2-Column Grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label for="review-date" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
						Date (SAST) <span class="text-rose-500">*</span>
					</label>
					<input
						id="review-date"
						type="date"
						required
						bind:value={transactionDate}
						class="input input-bordered w-full h-12 text-base bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
					/>
				</div>

				{#if paymentAccounts.length > 0}
					<div>
						<label for="review-account" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
							Paid With
						</label>
						<select
							id="review-account"
							bind:value={accountId}
							class="select select-bordered w-full h-12 text-base bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
						>
							{#each paymentAccounts as acc}
								<option value={acc.id}>
									{acc.name} {acc.isDefault ? '(Default)' : ''}
								</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>

			<!-- Optional Notes -->
			<div>
				<label for="review-notes" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
					Notes / Business Purpose
				</label>
				<input
					id="review-notes"
					type="text"
					bind:value={notes}
					placeholder="e.g. Client lunch with supplier"
					class="input input-bordered w-full h-11 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
				/>
			</div>

			<!-- Action Buttons -->
			<div class="pt-4 flex flex-col sm:flex-row items-center gap-3">
				<PrimaryActionButton
					type="submit"
					loading={isSaving}
					variant="primary"
					class="w-full sm:flex-1"
				>
					Save Expense
				</PrimaryActionButton>

				<button
					type="button"
					onclick={oncancel}
					disabled={isSaving}
					class="w-full sm:w-auto h-12 px-6 rounded-lg font-semibold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
				>
					Cancel / Retake
				</button>
			</div>
		</form>
	</div>
</div>
