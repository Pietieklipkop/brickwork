<script lang="ts">
	import CameraViewfinder from '$lib/components/camera/CameraViewfinder.svelte';
	import PreSaveBottomSheet from '$lib/components/camera/PreSaveBottomSheet.svelte';
	import type { ExtractedReceiptData } from '$lib/domain/extraction';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let isProcessing = $state(false);
	let isSaving = $state(false);
	let showReview = $state(false);
	let previewUrl = $state('');
	let capturedFile: File | null = $state(null);
	let saveError = $state('');

	let extractedData: ExtractedReceiptData = $state({
		vendorName: '',
		amountCents: 0,
		transactionDate: new Date().toISOString().split('T')[0],
		suggestedCategoryId: '',
		confidence: 1.0
	});

	$effect(() => {
		if (!extractedData.suggestedCategoryId && data.categories.length > 0) {
			extractedData.suggestedCategoryId = data.categories[0].id;
		}
	});

	async function handleImageCapture(file: File, url: string) {
		capturedFile = file;
		previewUrl = url;
		isProcessing = true;
		saveError = '';

		try {
			const form = new FormData();
			form.append('image', file);
			form.append(
				'categories',
				JSON.stringify(
					data.categories.map((c) => ({
						id: c.id,
						name: c.name
					}))
				)
			);

			const res = await fetch('/api/extract', {
				method: 'POST',
				body: form
			});

			if (res.ok) {
				const json = (await res.json()) as any;
				if (json.data) {
					extractedData = json.data;
				}
			} else {
				console.warn('Extraction API returned non-OK status, falling back to manual entry');
				extractedData = {
					vendorName: '',
					amountCents: 0,
					transactionDate: new Date().toISOString().split('T')[0],
					suggestedCategoryId: data.categories[0]?.id || '',
					confidence: 0.5
				};
			}
		} catch (err) {
			console.warn('Error extracting receipt details:', err);
			extractedData = {
				vendorName: '',
				amountCents: 0,
				transactionDate: new Date().toISOString().split('T')[0],
				suggestedCategoryId: data.categories[0]?.id || '',
				confidence: 0.5
			};
		} finally {
			isProcessing = false;
			showReview = true;
		}
	}

	function handleManualEntry() {
		capturedFile = null;
		previewUrl = '';
		extractedData = {
			vendorName: '',
			amountCents: 0,
			transactionDate: new Date().toISOString().split('T')[0],
			suggestedCategoryId: data.categories[0]?.id || '',
			confidence: 1.0
		};
		showReview = true;
	}

	async function handleSaveExpense(expense: {
		vendorName: string;
		amountCents: number;
		transactionDate: string;
		categoryId: string;
		accountId?: string;
		notes?: string;
		isReimbursable?: boolean;
		reimbursableCompanyId?: string;
	}) {
		isSaving = true;
		saveError = '';

		const form = new FormData();
		form.append('vendorName', expense.vendorName);
		form.append('amountCents', String(expense.amountCents));
		form.append('transactionDate', expense.transactionDate);
		form.append('categoryId', expense.categoryId);
		if (expense.accountId) form.append('accountId', expense.accountId);
		if (expense.notes) form.append('notes', expense.notes);
		if (capturedFile) form.append('image', capturedFile);
		form.append('rawAiExtraction', JSON.stringify(extractedData));
		if (expense.isReimbursable) {
			form.append('isReimbursable', 'true');
			if (expense.reimbursableCompanyId) {
				form.append('reimbursableCompanyId', expense.reimbursableCompanyId);
			}
		}

		try {
			const res = await fetch('/capture', {
				method: 'POST',
				body: form
			});

			if (res.ok || res.redirected) {
				goto('/dashboard');
			} else {
				const result = (await res.json().catch(() => null)) as any;
				saveError = result?.error || 'Failed to save expense. Please check your details and try again.';
				isSaving = false;
			}
		} catch (err: any) {
			saveError = err?.message || 'A network error occurred while saving.';
			isSaving = false;
		}
	}

	function handleCancelReview() {
		showReview = false;
		capturedFile = null;
		previewUrl = '';
	}
</script>

<svelte:head>
	<title>Capture Receipt | Brickwork</title>
</svelte:head>

<div class="max-w-xl mx-auto space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-black text-slate-900 dark:text-white">
				Capture Receipt
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400">
				Point camera at slip or upload an image (AC-01)
			</p>
		</div>

		<button
			type="button"
			onclick={handleManualEntry}
			class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40"
		>
			+ Enter Manually
		</button>
	</div>

	{#if saveError}
		<div class="alert alert-error text-sm rounded-xl p-3 shadow-sm">
			<span>{saveError}</span>
		</div>
	{/if}

	<!-- Viewfinder Component -->
	<CameraViewfinder
		oncapture={handleImageCapture}
		{isProcessing}
	/>

	<!-- Pre-Save Review Bottom Sheet (AC-02, AC-16) -->
	{#if showReview}
		<PreSaveBottomSheet
			{extractedData}
			{previewUrl}
			categories={data.categories}
			paymentAccounts={data.paymentAccounts}
			isPersonal={data.activeCompany.isPersonal}
			businessCompanies={data.companies.filter((c) => !c.isPersonal)}
			{isSaving}
			onsave={handleSaveExpense}
			oncancel={handleCancelReview}
		/>
	{/if}
</div>
