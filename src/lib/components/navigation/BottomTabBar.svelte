<script lang="ts">
	import { page } from '$app/state';

	interface NavItem {
		label: string;
		href: string;
		icon: 'dashboard' | 'capture' | 'expenses' | 'settings';
	}

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
		{ label: 'Capture', href: '/capture', icon: 'capture' },
		{ label: 'Expenses', href: '/expenses', icon: 'expenses' },
		{ label: 'Settings', href: '/settings', icon: 'settings' }
	];

	function isActive(href: string): boolean {
		const currentPath = page.url.pathname as string;
		if (href === '/dashboard') {
			return currentPath === '/dashboard' || currentPath === '/';
		}
		return currentPath.startsWith(href);
	}
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] shadow-lg"
	aria-label="Mobile application navigation"
>
	<div class="max-w-md mx-auto px-4 flex items-center justify-around h-16">
		{#each navItems as item}
			{#if item.icon === 'capture'}
				<!-- Special Prominent Center Shutter Button -->
				<a
					href={item.href}
					class="relative -top-3 flex flex-col items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
					aria-label="Capture Receipt at Point of Purchase"
				>
					<div
						class="w-14 h-14 rounded-full bg-[#0B2240] dark:bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all duration-150 ring-4 ring-slate-100 dark:ring-slate-900"
					>
						<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
							<circle cx="12" cy="13" r="3"></circle>
						</svg>
					</div>
					<span class="text-[11px] font-bold mt-1 text-slate-800 dark:text-slate-200">
						Capture
					</span>
				</a>
			{:else}
				<a
					href={item.href}
					class="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2240] rounded-lg {isActive(item.href)
						? 'text-[#0B2240] dark:text-emerald-400 font-bold'
						: 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}"
				>
					{#if item.icon === 'dashboard'}
						<svg class="w-6 h-6 mb-1 group-active:scale-95 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={isActive(item.href) ? '2.5' : '2'} stroke-linecap="round" stroke-linejoin="round">
							<rect width="7" height="9" x="3" y="3" rx="1"></rect>
							<rect width="7" height="5" x="14" y="3" rx="1"></rect>
							<rect width="7" height="9" x="14" y="12" rx="1"></rect>
							<rect width="7" height="5" x="3" y="16" rx="1"></rect>
						</svg>
					{:else if item.icon === 'expenses'}
						<svg class="w-6 h-6 mb-1 group-active:scale-95 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={isActive(item.href) ? '2.5' : '2'} stroke-linecap="round" stroke-linejoin="round">
							<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path>
							<path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
							<path d="M12 6v12"></path>
						</svg>
					{:else if item.icon === 'settings'}
						<svg class="w-6 h-6 mb-1 group-active:scale-95 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={isActive(item.href) ? '2.5' : '2'} stroke-linecap="round" stroke-linejoin="round">
							<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
							<circle cx="12" cy="12" r="3"></circle>
						</svg>
					{/if}

					<span class="text-[11px] font-medium leading-none">
						{item.label}
					</span>
				</a>
			{/if}
		{/each}
	</div>
</nav>
