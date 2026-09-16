<script lang="ts">
	import CompanyDropdown from './CompanyDropdown.svelte';

	interface CompanyOption {
		id: string;
		name: string;
		isPersonal?: boolean;
	}

	interface Props {
		userName?: string;
		companies?: CompanyOption[];
		selectedCompanyId?: string;
		onCompanySelect?: (companyId: string) => void;
	}

	let {
		userName = '',
		companies = [],
		selectedCompanyId = '',
		onCompanySelect
	}: Props = $props();
</script>

<header class="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
	<div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
		<!-- Left: Brand / Logo -->
		<div class="flex items-center space-x-3">
			<a href="/dashboard" class="flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2240] rounded-md">
				<div class="w-8 h-8 rounded-lg bg-[#0B2240] flex items-center justify-center text-white shadow-sm">
					<svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<rect width="18" height="18" x="3" y="3" rx="2"/>
						<path d="M3 9h18"/>
						<path d="M3 15h18"/>
						<path d="M9 3v6"/>
						<path d="M15 9v6"/>
					</svg>
				</div>
				<span class="font-mono font-black text-lg text-slate-900 dark:text-slate-100 tracking-tight hidden xs:inline">
					BRICKWORK
				</span>
			</a>

			<!-- Company Dropdown Selector -->
			{#if companies.length > 0}
				<div class="border-l border-slate-200 dark:border-slate-800 pl-3">
					<CompanyDropdown
						{companies}
						{selectedCompanyId}
						onselect={onCompanySelect}
					/>
				</div>
			{/if}
		</div>

		<!-- Right: User Avatar & Logout Action -->
		<div class="flex items-center space-x-2">
			{#if userName}
				<span class="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden sm:inline truncate max-w-[120px]">
					{userName}
				</span>
			{/if}

			<form action="/logout" method="POST" class="inline">
				<button
					type="submit"
					aria-label="Sign out"
					title="Sign out"
					class="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
						<polyline points="16 17 21 12 16 7"></polyline>
						<line x1="21" y1="12" x2="9" y2="12"></line>
					</svg>
				</button>
			</form>
		</div>
	</div>
</header>
