<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { centsToZar } from '$lib/domain/currency';
	import CurrencyInputField from '$lib/components/forms/CurrencyInputField.svelte';
	import PrimaryActionButton from '$lib/components/ui/PrimaryActionButton.svelte';

	let { data } = $props();

	// Cycle Setting State
	let cycleDay = $state(1);
	let isSavingCycle = $state(false);
	let cycleMessage = $state('');

	$effect(() => {
		cycleDay = data.user.monthStartDay ?? 1;
	});

	// Company Management State
	let newCompanyName = $state('');
	let isCreatingCompany = $state(false);
	let companyError = $state('');

	let editingCompany: any = $state(null);
	let editCompanyName = $state('');
	let isUpdatingCompany = $state(false);

	// Category Management State
	let showAddCategory = $state(false);
	let newCatName = $state('');
	let newCatTargetCents = $state(0);
	let newCatColor = $state('#0B2240');
	let isCreatingCat = $state(false);
	let catError = $state('');

	let editingCat: any = $state(null);
	let editCatName = $state('');
	let editCatTargetCents = $state(0);
	let editCatColor = $state('#0B2240');
	let isUpdatingCat = $state(false);

	const PRESET_COLORS = [
		'#0B2240', '#10B981', '#0284C7', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B', '#E11D48'
	];

	function getCyclePreview(day: number): string {
		const clamped = Math.min(Math.max(day, 1), 28);
		if (clamped === 1) {
			return 'Your cycle runs from the 1st to the last day of each calendar month.';
		}
		const endDay = clamped - 1;
		return `Your cycle runs from the ${clamped}${getOrdinal(clamped)} of the month to the ${endDay}${getOrdinal(endDay)} of the following month.`;
	}

	function getOrdinal(n: number): string {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return s[(v - 20) % 10] || s[v] || s[0];
	}

	async function handleSaveCycle(e: Event) {
		e.preventDefault();
		isSavingCycle = true;
		cycleMessage = '';

		const form = new FormData();
		form.append('monthStartDay', String(cycleDay));

		try {
			const res = await fetch('/settings?/updateCycleStartDay', {
				method: 'POST',
				body: form
			});

			if (res.ok) {
				cycleMessage = 'Billing cycle updated successfully!';
				await invalidateAll();
			} else {
				cycleMessage = 'Failed to update billing cycle.';
			}
		} catch (err: any) {
			cycleMessage = err?.message || 'Network error.';
		} finally {
			isSavingCycle = false;
		}
	}

	async function handleCreateCompany(e: Event) {
		e.preventDefault();
		if (!newCompanyName.trim()) return;
		isCreatingCompany = true;
		companyError = '';

		const form = new FormData();
		form.append('name', newCompanyName.trim());

		try {
			const res = await fetch('/settings?/createCompany', {
				method: 'POST',
				body: form
			});

			if (res.ok) {
				newCompanyName = '';
				await invalidateAll();
			} else {
				const r = (await res.json().catch(() => null)) as any;
				companyError = r?.error || 'Failed to create company.';
			}
		} catch (err: any) {
			companyError = err?.message || 'Network error.';
		} finally {
			isCreatingCompany = false;
		}
	}

	async function handleUpdateCompany(e: Event) {
		e.preventDefault();
		if (!editingCompany || !editCompanyName.trim()) return;
		isUpdatingCompany = true;

		const form = new FormData();
		form.append('id', editingCompany.id);
		form.append('name', editCompanyName.trim());

		try {
			const res = await fetch('/settings?/updateCompany', {
				method: 'POST',
				body: form
			});

			if (res.ok) {
				editingCompany = null;
				await invalidateAll();
			}
		} finally {
			isUpdatingCompany = false;
		}
	}

	async function handleDeleteCompany(id: string) {
		if (!confirm('Are you sure you want to delete this company entity?')) return;

		const form = new FormData();
		form.append('id', id);

		const res = await fetch('/settings?/deleteCompany', {
			method: 'POST',
			body: form
		});

		if (res.ok) {
			await invalidateAll();
		}
	}

	async function handleCreateCategory(e: Event) {
		e.preventDefault();
		if (!newCatName.trim()) return;
		isCreatingCat = true;
		catError = '';

		const form = new FormData();
		form.append('companyId', data.activeCompany.id);
		form.append('name', newCatName.trim());
		form.append('monthlyTargetCents', String(newCatTargetCents));
		form.append('colorHex', newCatColor);

		try {
			const res = await fetch('/settings?/createCategory', {
				method: 'POST',
				body: form
			});

			if (res.ok) {
				showAddCategory = false;
				newCatName = '';
				newCatTargetCents = 0;
				await invalidateAll();
			} else {
				const r = (await res.json().catch(() => null)) as any;
				catError = r?.error || 'Failed to create category.';
			}
		} finally {
			isCreatingCat = false;
		}
	}

	function startEditCat(cat: any) {
		editingCat = cat;
		editCatName = cat.name;
		editCatTargetCents = cat.monthlyTargetCents;
		editCatColor = cat.colorHex;
		catError = '';
	}

	async function handleUpdateCategory(e: Event) {
		e.preventDefault();
		if (!editingCat || !editCatName.trim()) return;
		isUpdatingCat = true;
		catError = '';

		const form = new FormData();
		form.append('id', editingCat.id);
		form.append('name', editCatName.trim());
		form.append('monthlyTargetCents', String(editCatTargetCents));
		form.append('colorHex', editCatColor);

		try {
			const res = await fetch('/settings?/updateCategory', {
				method: 'POST',
				body: form
			});

			if (res.ok) {
				editingCat = null;
				await invalidateAll();
			} else {
				const r = (await res.json().catch(() => null)) as any;
				catError = r?.error || 'Failed to update category.';
			}
		} finally {
			isUpdatingCat = false;
		}
	}

	async function handleDeleteCategory(id: string) {
		if (!confirm('Are you sure you want to delete this category?')) return;

		const form = new FormData();
		form.append('id', id);

		const res = await fetch('/settings?/deleteCategory', {
			method: 'POST',
			body: form
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const r = (await res.json().catch(() => null)) as any;
			alert(r?.error || 'Cannot delete this category.');
		}
	}
</script>

<svelte:head>
	<title>Settings | Brickwork</title>
</svelte:head>

<div class="space-y-8 max-w-4xl mx-auto">
	<div>
		<h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
			Settings & Configuration
		</h1>
		<p class="text-xs text-slate-500 dark:text-slate-400">
			Manage entities, billing cycle rules, categories, and account (AC-05, AC-06)
		</p>
	</div>

	<!-- 1. Billing Cycle Configuration (AC-06) -->
	<section class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
		<div class="border-b border-slate-100 dark:border-slate-800 pb-3">
			<h2 class="text-base font-bold text-slate-900 dark:text-white">
				Monthly Billing Cycle Rollover (SAST)
			</h2>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
				Defines when monthly budget targets reset. Bounded strictly between day 1 and 28 to prevent month-end rollover discrepancies.
			</p>
		</div>

		{#if cycleMessage}
			<div class="p-3 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
				{cycleMessage}
			</div>
		{/if}

		<form onsubmit={handleSaveCycle} class="space-y-4 max-w-md">
			<div>
				<label for="cycle-day-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
					Cycle Start Day of Month (1–28)
				</label>
				<div class="flex items-center space-x-3">
					<input
						id="cycle-day-input"
						type="number"
						min="1"
						max="28"
						required
						bind:value={cycleDay}
						class="input input-bordered w-32 font-bold text-base"
					/>
					<PrimaryActionButton
						type="submit"
						loading={isSavingCycle}
						variant="primary"
						class="btn-sm h-10 px-5"
					>
						Save Cycle Day
					</PrimaryActionButton>
				</div>
			</div>

			<!-- Dynamic Preview Explanation -->
			<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
				<span class="font-bold text-[#0B2240] dark:text-emerald-400">Live Preview:</span> {getCyclePreview(cycleDay)}
			</div>
		</form>
	</section>

	<!-- 2. Company / Entity Management (AC-05) -->
	<section class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
		<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
			<div>
				<h2 class="text-base font-bold text-slate-900 dark:text-white">
					Company Entities & Profiles
				</h2>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
					Switch between your Personal profile and registered business entities (AC-05).
				</p>
			</div>
		</div>

		{#if companyError}
			<div class="alert alert-error text-xs rounded-xl p-3">
				<span>{companyError}</span>
			</div>
		{/if}

		<!-- Company Entities List -->
		<div class="divide-y divide-slate-100 dark:divide-slate-800">
			{#each data.companies as comp (comp.id)}
				<div class="py-3 flex items-center justify-between gap-3">
					<div class="flex items-center space-x-3">
						<span class="w-3 h-3 rounded-full {comp.isPersonal ? 'bg-emerald-500' : 'bg-blue-600'}"></span>
						<div>
							<div class="flex items-center space-x-2">
								<span class="text-sm font-bold text-slate-900 dark:text-white">{comp.name}</span>
								{#if comp.isPersonal}
									<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
										Personal
									</span>
								{/if}
								{#if comp.id === data.activeCompany.id}
									<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
										Active
									</span>
								{/if}
							</div>
						</div>
					</div>

					<div class="flex items-center space-x-1">
						{#if !comp.isPersonal}
							<button
								type="button"
								onclick={() => {
									editingCompany = comp;
									editCompanyName = comp.name;
								}}
								class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
								aria-label="Edit {comp.name}"
							>
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
								</svg>
							</button>

							<button
								type="button"
								onclick={() => handleDeleteCompany(comp.id)}
								class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
								aria-label="Delete {comp.name}"
							>
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"></polyline>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								</svg>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Add Company Form -->
		<form onsubmit={handleCreateCompany} class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
			<input
				type="text"
				bind:value={newCompanyName}
				placeholder="New Company Name (e.g. Apex Consulting)"
				required
				class="input input-bordered input-sm h-10 w-full sm:max-w-xs text-xs font-semibold"
			/>
			<button
				type="submit"
				disabled={isCreatingCompany}
				class="btn btn-sm h-10 bg-[#0B2240] text-white hover:bg-[#132f54] text-xs font-bold w-full sm:w-auto px-4"
			>
				{#if isCreatingCompany}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				<span>+ Add Company Entity</span>
			</button>
		</form>
	</section>

	<!-- 3. Spend Categories & Budget Targets (AC-06) -->
	<section class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
		<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
			<div>
				<h2 class="text-base font-bold text-slate-900 dark:text-white">
					Categories & Monthly Budget Targets ({data.activeCompany.name})
				</h2>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
					Configure monthly spend thresholds in integer ZAR cents for the active profile (AC-06).
				</p>
			</div>

			<button
				type="button"
				onclick={() => (showAddCategory = true)}
				class="btn btn-sm bg-[#0B2240] text-white hover:bg-[#132f54] text-xs font-bold"
			>
				+ Add Category
			</button>
		</div>

		{#if catError}
			<div class="alert alert-error text-xs rounded-xl p-3">
				<span>{catError}</span>
			</div>
		{/if}

		<!-- Add Category Form Dialog -->
		{#if showAddCategory}
			<form onsubmit={handleCreateCategory} class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
				<h3 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
					New Category for {data.activeCompany.name}
				</h3>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="new-cat-name" class="block text-xs font-semibold mb-1">Category Name</label>
						<input
							id="new-cat-name"
							type="text"
							required
							bind:value={newCatName}
							placeholder="e.g. Marketing"
							class="input input-bordered input-sm w-full h-10 text-xs"
						/>
					</div>

					<div>
						<CurrencyInputField
							bind:valueCents={newCatTargetCents}
							label="Monthly Target (ZAR)"
							id="new-cat-target"
							required
						/>
					</div>
				</div>

				<div>
					<span class="block text-xs font-semibold mb-1">Color Badge</span>
					<div class="flex items-center space-x-2">
						{#each PRESET_COLORS as color}
							<button
								type="button"
								onclick={() => (newCatColor = color)}
								class="w-7 h-7 rounded-full transition-transform {newCatColor === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''}"
								style="background-color: {color}"
								aria-label="Select color {color}"
							></button>
						{/each}
					</div>
				</div>

				<div class="flex items-center justify-end space-x-2 pt-2">
					<button
						type="button"
						onclick={() => (showAddCategory = false)}
						class="btn btn-ghost btn-sm text-xs"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isCreatingCat}
						class="btn btn-sm bg-[#0B2240] text-white font-bold text-xs"
					>
						Save Category
					</button>
				</div>
			</form>
		{/if}

		<!-- Category List Table -->
		<div class="divide-y divide-slate-100 dark:divide-slate-800">
			{#each data.categories as cat (cat.id)}
				<div class="py-3 flex items-center justify-between gap-3">
					<div class="flex items-center space-x-3">
						<span class="w-3.5 h-3.5 rounded-full shrink-0" style="background-color: {cat.colorHex}"></span>
						<div>
							<span class="text-sm font-bold text-slate-900 dark:text-white">{cat.name}</span>
						</div>
					</div>

					<div class="flex items-center space-x-4">
						<span class="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
							{centsToZar(cat.monthlyTargetCents)} / mo
						</span>

						<div class="flex items-center space-x-1">
							<button
								type="button"
								onclick={() => startEditCat(cat)}
								class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
								aria-label="Edit {cat.name}"
							>
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
								</svg>
							</button>

							<button
								type="button"
								onclick={() => handleDeleteCategory(cat.id)}
								class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
								aria-label="Delete {cat.name}"
							>
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"></polyline>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- 4. User Profile & Sign Out -->
	<section class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
		<div class="border-b border-slate-100 dark:border-slate-800 pb-3">
			<h2 class="text-base font-bold text-slate-900 dark:text-white">
				Account & Authentication
			</h2>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
				Logged in as {data.user.email} (Role: {data.user.role || 'main_member'})
			</p>
		</div>

		<div class="flex items-center justify-between pt-2">
			<div>
				<p class="text-sm font-bold text-slate-900 dark:text-white">{data.user.name}</p>
				<p class="text-xs text-slate-500">{data.user.email}</p>
			</div>

			<form action="/logout" method="POST">
				<button
					type="submit"
					class="btn btn-sm btn-outline border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400 text-xs font-bold"
				>
					Sign Out of Brickwork
				</button>
			</form>
		</div>
	</section>
</div>

<!-- Edit Category Modal -->
{#if editingCat}
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
			<h3 class="text-base font-bold text-slate-900 dark:text-white">
				Edit Category: {editingCat.name}
			</h3>

			<form onsubmit={handleUpdateCategory} class="space-y-4">
				<div>
					<label for="edit-cat-name" class="block text-xs font-semibold mb-1">Category Name</label>
					<input
						id="edit-cat-name"
						type="text"
						required
						bind:value={editCatName}
						class="input input-bordered w-full h-11 text-sm bg-slate-50 dark:bg-slate-800"
					/>
				</div>

				<div>
					<CurrencyInputField
						bind:valueCents={editCatTargetCents}
						label="Monthly Budget Target (ZAR)"
						id="edit-cat-target"
						required
					/>
				</div>

				<div>
					<span class="block text-xs font-semibold mb-1">Color Badge</span>
					<div class="flex items-center space-x-2">
						{#each PRESET_COLORS as color}
							<button
								type="button"
								onclick={() => (editCatColor = color)}
								class="w-7 h-7 rounded-full transition-transform {editCatColor === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''}"
								style="background-color: {color}"
								aria-label="Select color {color}"
							></button>
						{/each}
					</div>
				</div>

				<div class="pt-2 flex items-center justify-end space-x-3">
					<button
						type="button"
						onclick={() => (editingCat = null)}
						class="btn btn-ghost btn-sm"
					>
						Cancel
					</button>
					<PrimaryActionButton
						type="submit"
						loading={isUpdatingCat}
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

<!-- Edit Company Modal -->
{#if editingCompany}
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
			<h3 class="text-base font-bold text-slate-900 dark:text-white">
				Rename Company Entity
			</h3>

			<form onsubmit={handleUpdateCompany} class="space-y-4">
				<div>
					<label for="edit-comp-name" class="block text-xs font-semibold mb-1">Company Name</label>
					<input
						id="edit-comp-name"
						type="text"
						required
						bind:value={editCompanyName}
						class="input input-bordered w-full h-11 text-sm bg-slate-50 dark:bg-slate-800 font-semibold"
					/>
				</div>

				<div class="pt-2 flex items-center justify-end space-x-3">
					<button
						type="button"
						onclick={() => (editingCompany = null)}
						class="btn btn-ghost btn-sm"
					>
						Cancel
					</button>
					<PrimaryActionButton
						type="submit"
						loading={isUpdatingCompany}
						variant="primary"
						class="btn-sm"
					>
						Save
					</PrimaryActionButton>
				</div>
			</form>
		</div>
	</div>
{/if}
