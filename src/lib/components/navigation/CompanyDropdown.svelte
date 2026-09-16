<script lang="ts">
	interface CompanyOption {
		id: string;
		name: string;
		isPersonal?: boolean;
	}

	interface Props {
		companies: CompanyOption[];
		selectedCompanyId: string;
		onselect?: (companyId: string) => void;
	}

	let { companies = [], selectedCompanyId = $bindable(''), onselect }: Props = $props();

	let selectedCompany = $derived(
		companies.find((c) => c.id === selectedCompanyId) || companies[0]
	);

	let isOpen = $state(false);

	function select(id: string) {
		selectedCompanyId = id;
		isOpen = false;
		onselect?.(id);
	}
</script>

<div class="relative inline-block text-left">
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2240]"
		aria-haspopup="true"
		aria-expanded={isOpen}
	>
		<span class="w-2.5 h-2.5 rounded-full {selectedCompany?.isPersonal ? 'bg-emerald-500' : 'bg-blue-600'}" aria-hidden="true"></span>
		<span class="max-w-[140px] truncate">{selectedCompany?.name || 'Select Company'}</span>
		<svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="6 9 12 15 18 9"></polyline>
		</svg>
	</button>

	{#if isOpen}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-20"
			onclick={() => (isOpen = false)}
			role="presentation"
		></div>

		<!-- Dropdown Menu -->
		<div
			class="absolute left-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-30 py-1 divide-y divide-slate-100 dark:divide-slate-800"
			role="menu"
		>
			<div class="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
				Switch Profile
			</div>
			<div class="py-1">
				{#each companies as comp}
					<button
						type="button"
						role="menuitem"
						onclick={() => select(comp.id)}
						class="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors {comp.id ===
						selectedCompanyId
							? 'bg-slate-50 dark:bg-slate-800/80 font-bold text-[#0B2240] dark:text-emerald-400'
							: 'text-slate-700 dark:text-slate-300'}"
					>
						<div class="flex items-center space-x-2 truncate">
							<span class="w-2 h-2 rounded-full {comp.isPersonal ? 'bg-emerald-500' : 'bg-blue-600'} shrink-0"></span>
							<span class="truncate">{comp.name}</span>
						</div>
						{#if comp.isPersonal}
							<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
								Personal
							</span>
						{/if}
					</button>
				{/each}
			</div>
			<div class="py-1">
				<a
					href="/settings"
					class="block px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
					onclick={() => (isOpen = false)}
				>
					+ Manage companies in Settings
				</a>
			</div>
		</div>
	{/if}
</div>
