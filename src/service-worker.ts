/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `brickwork-cache-${version}`;

// Assets to precache during install
const PRECACHE_ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(PRECACHE_ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Only cache HTTP/HTTPS GET requests
	if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
		return;
	}

	// Skip auth or extraction APIs from persistent cache
	if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/extract')) {
		return;
	}

	// Cache-first strategy for static build files and media
	const isStaticAsset = PRECACHE_ASSETS.includes(url.pathname);

	if (isStaticAsset) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				return (
					cached ||
					fetch(event.request).then((response) => {
						if (response.status === 200) {
							const copy = response.clone();
							event.waitUntil(
								caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
							);
						}
						return response;
					})
				);
			})
		);
		return;
	}

	// Network-only for authenticated pages, APIs, and private receipts (never cache sensitive financial data)
	event.respondWith(
		fetch(event.request).catch(() => {
			return new Response('You are offline. Please connect to the internet to sync expenses.', {
				status: 503,
				statusText: 'Service Unavailable',
				headers: { 'Content-Type': 'text/plain; charset=utf-8' }
			});
		})
	);
});
