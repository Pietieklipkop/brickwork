<script lang="ts">
	let { children } = $props();
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md text-center px-4 mb-6">
		<div class="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-navy-900 bg-[#0B2240] text-white shadow-md mb-3">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect width="18" height="18" x="3" y="3" rx="2"/>
				<path d="M3 9h18"/>
				<path d="M3 15h18"/>
				<path d="M9 3v6"/>
				<path d="M15 9v6"/>
				<path d="M9 15v6"/>
			</svg>
		</div>
		<h1 class="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-mono">
			BRICKWORK
		</h1>
		<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
			Point-of-Purchase Real-Time Expense & Budget Platform
		</p>
	</div>

	<div class="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
		<div class="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 sm:px-10">
			{@render children()}
		</div>
	</div>
</div>
