<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		oncapture: (file: File, previewUrl: string) => void;
		isProcessing?: boolean;
	}

	let { oncapture, isProcessing = false }: Props = $props();

	let videoEl: HTMLVideoElement | null = $state(null);
	let fileInputEl: HTMLInputElement | null = $state(null);
	let stream: MediaStream | null = $state(null);
	let cameraActive = $state(false);
	let cameraError = $state('');
	let statusAnnouncement = $state('Camera ready. Align receipt within frame.');

	onMount(async () => {
		await startCamera();
	});

	onDestroy(() => {
		stopCamera();
	});

	async function startCamera() {
		cameraError = '';
		try {
			if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
				stream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: { ideal: 'environment' },
						width: { ideal: 1920 },
						height: { ideal: 1080 }
					},
					audio: false
				});

				if (videoEl) {
					videoEl.srcObject = stream;
					await videoEl.play();
					cameraActive = true;
				}
			} else {
				cameraActive = false;
			}
		} catch (err: any) {
			console.warn('Camera access error or permission denied:', err);
			cameraActive = false;
			cameraError = 'Camera access unavailable. You can upload an image instead.';
		}
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		cameraActive = false;
	}

	async function takeSnapshot() {
		if (!videoEl || !cameraActive || isProcessing) return;

		statusAnnouncement = 'Capturing receipt image and optimizing...';

		const canvas = document.createElement('canvas');
		const videoWidth = videoEl.videoWidth || 1280;
		const videoHeight = videoEl.videoHeight || 720;

		// Downscale to max 1600px maintaining aspect ratio
		const maxDim = 1600;
		let targetWidth = videoWidth;
		let targetHeight = videoHeight;

		if (targetWidth > maxDim || targetHeight > maxDim) {
			if (targetWidth > targetHeight) {
				targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
				targetWidth = maxDim;
			} else {
				targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
				targetHeight = maxDim;
			}
		}

		canvas.width = targetWidth;
		canvas.height = targetHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);

		// Export as high efficiency WebP (or JPEG fallback)
		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				const file = new File([blob], `receipt_${Date.now()}.webp`, { type: 'image/webp' });
				const previewUrl = URL.createObjectURL(blob);
				statusAnnouncement = 'Receipt captured. Processing with AI vision model...';
				oncapture(file, previewUrl);
			},
			'image/webp',
			0.82
		);
	}

	function handleFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		statusAnnouncement = 'Receipt file selected. Optimizing image...';

		// Downscale uploaded file on canvas before processing
		const img = new Image();
		const reader = new FileReader();

		reader.onload = (event) => {
			img.onload = () => {
				const canvas = document.createElement('canvas');
				const maxDim = 1600;
				let w = img.width;
				let h = img.height;

				if (w > maxDim || h > maxDim) {
					if (w > h) {
						h = Math.round((h * maxDim) / w);
						w = maxDim;
					} else {
						w = Math.round((w * maxDim) / h);
						h = maxDim;
					}
				}

				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext('2d');
				if (!ctx) return;

				ctx.drawImage(img, 0, 0, w, h);
				canvas.toBlob(
					(blob) => {
						if (!blob) return;
						const optimizedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
							type: 'image/webp'
						});
						const previewUrl = URL.createObjectURL(blob);
						statusAnnouncement = 'Receipt optimized. Processing with AI vision model...';
						oncapture(optimizedFile, previewUrl);
					},
					'image/webp',
					0.82
				);
			};
			img.src = event.target?.result as string;
		};

		reader.readAsDataURL(file);
	}
</script>

<div class="relative w-full h-full min-h-[420px] max-h-[75vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center select-none">
	<!-- Screen Reader Accessibility Announcer (WCAG SC 4.1.3) -->
	<div aria-live="polite" class="sr-only">
		{statusAnnouncement}
	</div>

	{#if cameraActive}
		<!-- Live Video Stream -->
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			bind:this={videoEl}
			autoplay
			playsinline
			muted
			class="w-full h-full object-cover"
		></video>

		<!-- Visual Document Alignment Reticle & Shading -->
		<div class="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
			<div class="relative w-full max-w-sm aspect-[3/4] border-2 border-dashed border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
				<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-emerald-400 text-xs font-semibold px-3 py-0.5 rounded-full backdrop-blur-sm">
					Align Slip Within Frame
				</div>

				<!-- Reticle Corner Accents -->
				<span class="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></span>
				<span class="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></span>
				<span class="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></span>
				<span class="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></span>
			</div>
		</div>

		<!-- Shutter Action Bar at Viewfinder Bottom -->
		<div class="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-around px-8">
			<!-- Upload / Gallery Fallback Trigger -->
			<button
				type="button"
				onclick={() => fileInputEl?.click()}
				disabled={isProcessing}
				class="p-3 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-white backdrop-blur-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
				aria-label="Upload photo from gallery"
			>
				<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
					<circle cx="9" cy="9" r="2"/>
					<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
				</svg>
			</button>

			<!-- Prominent Tactile Shutter Button -->
			<button
				type="button"
				onclick={takeSnapshot}
				disabled={isProcessing}
				class="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 shadow-2xl active:scale-95 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400"
				aria-label="Snap receipt photo"
			>
				<div class="w-full h-full rounded-full bg-white hover:bg-emerald-400 active:bg-emerald-500 transition-colors flex items-center justify-center">
					{#if isProcessing}
						<span class="loading loading-spinner text-[#0B2240] loading-md"></span>
					{/if}
				</div>
			</button>

			<!-- Placeholder for spacing -->
			<div class="w-12"></div>
		</div>
	{:else}
		<!-- Fallback Viewfinder if Camera Permission Denied or Unavailable -->
		<div class="p-8 text-center text-white max-w-sm flex flex-col items-center">
			<div class="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
				<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
					<circle cx="12" cy="13" r="3"></circle>
				</svg>
			</div>

			<h3 class="text-lg font-bold mb-2">Camera Unavailable</h3>
			<p class="text-sm text-slate-400 mb-6">
				{cameraError || 'Use your device camera or select a receipt photo to scan.'}
			</p>

			<button
				type="button"
				onclick={() => fileInputEl?.click()}
				disabled={isProcessing}
				class="btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-6 border-none shadow-lg w-full"
			>
				{#if isProcessing}
					<span class="loading loading-spinner loading-sm"></span>
					<span>Scanning receipt...</span>
				{:else}
					<span>Choose Photo / File</span>
				{/if}
			</button>
		</div>
	{/if}

	<!-- Hidden Native File Input with Camera Capture Support -->
	<input
		bind:this={fileInputEl}
		type="file"
		accept="image/*"
		capture="environment"
		onchange={handleFileSelected}
		class="hidden"
	/>
</div>
