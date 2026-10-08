<script lang="ts">
	import CameraViewfinder from '$lib/components/camera/CameraViewfinder.svelte';
	import PreSaveBottomSheet from '$lib/components/camera/PreSaveBottomSheet.svelte';
	import type { ExtractedReceiptData } from '$lib/domain/extraction';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { processUploadedImageFile } from '$lib/domain/image-filters';

	let { data } = $props();

	// Mode selector: 'camera' | 'upload'
	let captureMode = $state<'camera' | 'upload'>('camera');

	$effect(() => {
		if (page.url.searchParams.get('mode') === 'upload') {
			captureMode = 'upload';
		}
	});

	let isProcessing = $state(false);
	let isSaving = $state(false);
	let showReview = $state(false);
	let previewUrl = $state('');
	let capturedFile: File | null = $state(null);
	let capturedOcrFile: File | null = $state(null);
	let saveError = $state('');

	// Drag and drop state
	let isDragging = $state(false);
	let uploadFileInputEl: HTMLInputElement | null = $state(null);

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

	async function handleImageCapture(file: File, url: string, ocrFile?: File) {
		capturedFile = file;
		capturedOcrFile = ocrFile || null;
		previewUrl = url;
		isProcessing = true;
		saveError = '';

		try {
			const form = new FormData();
			// Send the preprocessed, shadow-removed, high-contrast crop to the OCR engine
			form.append('image', ocrFile || file);
			form.append('companyId', data.activeCompany.id);
			form.append(
				'categories',
				JSON.stringify(
					data.categories.map((c) => ({
						id: c.id,
						name: c.name
					}))
				)
			);
			form.append(
				'paymentAccounts',
				JSON.stringify(
					data.paymentAccounts.map((a) => ({
						id: a.id,
						name: a.name,
						cardNumber: a.cardNumber,
						isDefault: Boolean(a.isDefault)
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

	async function optimizeAndProcessFile(file: File) {
		if (!file.type.startsWith('image/')) {
			saveError = 'Please upload a valid image file (PNG, JPG, WebP).';
			return;
		}

		saveError = '';
		isProcessing = true;

		try {
			const { originalFile, ocrFile, previewUrl } = await processUploadedImageFile(file);
			await handleImageCapture(originalFile, previewUrl, ocrFile);
		} catch (err: any) {
			console.warn('Advanced file optimization failed, using raw fallback:', err);
			const preview = URL.createObjectURL(file);
			await handleImageCapture(file, preview, file);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) {
			optimizeAndProcessFile(file);
		}
	}

	function handleUploadInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			optimizeAndProcessFile(file);
		}
	}

	function handleManualEntry() {
		capturedFile = null;
		capturedOcrFile = null;
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
		if (capturedOcrFile) form.append('ocrImage', capturedOcrFile);
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
		capturedOcrFile = null;
		previewUrl = '';
	}
</script>

<svelte:head>
	<title>Capture Receipt | Brickwork</title>
</svelte:head>

<div class="max-w-xl mx-auto space-y-4">
	<!-- Header & Manual Entry Trigger -->
	<div class="flex items-center justify-between flex-wrap gap-2">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-black text-slate-900 dark:text-white">
					Capture Receipt
				</h1>
				<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
					v1.9 AI Scanner
				</span>
			</div>
			<p class="text-xs text-slate-500 dark:text-slate-400">
				Auto-detects paper edges & dewarps perspective into flat scans
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

	<!-- Mode Switcher: Camera vs Upload (AC-19) -->
	<div class="grid grid-cols-2 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-bold">
		<button
			type="button"
			onclick={() => (captureMode = 'camera')}
			class="py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all {captureMode === 'camera'
				? 'bg-white dark:bg-slate-900 text-[#0B2240] dark:text-white shadow-xs'
				: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
		>
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
				<circle cx="12" cy="13" r="3"></circle>
			</svg>
			<span>Scan with Camera</span>
		</button>

		<button
			type="button"
			onclick={() => (captureMode = 'upload')}
			class="py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all {captureMode === 'upload'
				? 'bg-white dark:bg-slate-900 text-[#0B2240] dark:text-white shadow-xs'
				: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
		>
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="17 8 12 3 7 8"></polyline>
				<line x1="12" y1="3" x2="12" y2="15"></line>
			</svg>
			<span>Upload Receipt File</span>
		</button>
	</div>

	{#if saveError}
		<div class="alert alert-error text-sm rounded-xl p-3 shadow-sm">
			<span>{saveError}</span>
		</div>
	{/if}

	<!-- Viewport Based on Selected Mode -->
	{#if captureMode === 'camera'}
		<!-- Viewfinder Component -->
		<CameraViewfinder
			oncapture={handleImageCapture}
			{isProcessing}
		/>
	{:else}
		<!-- Dedicated File Upload Dropzone (AC-19) -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={() => uploadFileInputEl?.click()}
			class="relative w-full min-h-[380px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none {isDragging
				? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]'
				: 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600'}"
		>
			<div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4 shadow-inner">
				{#if isProcessing}
					<span class="loading loading-spinner loading-md text-[#0B2240] dark:text-emerald-400"></span>
				{:else}
					<svg class="w-8 h-8 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="17 8 12 3 7 8"></polyline>
						<line x1="12" y1="3" x2="12" y2="15"></line>
					</svg>
				{/if}
			</div>

			{#if isProcessing}
				<h2 class="text-base font-bold text-slate-900 dark:text-white">
					Processing Receipt Image...
				</h2>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
					Extracting merchant, total, and category using Cloudflare Workers AI vision model.
				</p>
			{:else}
				<h2 class="text-base font-bold text-slate-900 dark:text-white">
					Drop Receipt File Here or Click to Browse
				</h2>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
					Supports PNG, JPG, JPEG, or WebP images. Ideal for receipts saved from emails, online PDF screenshots, or gallery photos.
				</p>

				<button
					type="button"
					class="mt-5 btn btn-sm bg-[#0B2240] text-white hover:bg-[#132f54] text-xs font-bold px-5 h-10"
				>
					Browse Files
				</button>
			{/if}

			<!-- Hidden File Input WITHOUT forced mobile camera -->
			<input
				bind:this={uploadFileInputEl}
				type="file"
				accept="image/png,image/jpeg,image/jpg,image/webp"
				onchange={handleUploadInputChange}
				class="hidden"
			/>
		</div>
	{/if}

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
