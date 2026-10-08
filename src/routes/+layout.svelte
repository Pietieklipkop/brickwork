<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		if ('serviceWorker' in navigator && typeof window !== 'undefined') {
			let hadPreviousController = Boolean(navigator.serviceWorker.controller);

			navigator.serviceWorker
				.register('/service-worker.js')
				.then((reg) => {
					// Proactively check for newer versions on server
					reg.update().catch(() => {});
				})
				.catch((err) => {
					console.warn('Service worker registration:', err);
				});

			let refreshing = false;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				// Don't reload on first installation or in automated test environments
				if (navigator.webdriver || !hadPreviousController) {
					hadPreviousController = true;
					return;
				}
				if (!refreshing) {
					refreshing = true;
					window.location.reload();
				}
			});
		}
	});
</script>

{@render children()}
