<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import TopBar from '$lib/components/navigation/TopBar.svelte';
	import BottomTabBar from '$lib/components/navigation/BottomTabBar.svelte';

	let { data, children } = $props();

	function handleCompanySelect(companyId: string) {
		document.cookie = `brickwork_active_company=${companyId}; path=/; max-age=31536000; SameSite=Lax`;
		invalidateAll();
	}
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
	<TopBar
		userName={data.user.name}
		companies={data.companies}
		selectedCompanyId={data.activeCompany.id}
		onCompanySelect={handleCompanySelect}
	/>

	<main class="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-28">
		{@render children()}
	</main>

	<BottomTabBar />
</div>
