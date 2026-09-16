<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		if ('serviceWorker' in navigator && typeof window !== 'undefined') {
			navigator.serviceWorker.register('/service-worker.js').catch((err) => {
				console.warn('Service worker registration:', err);
			});
		}
	});
</script>

{@render children()}
