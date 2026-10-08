<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		processReceiptSnapshot,
		processUploadedImageFile,
		detectReceiptQuad,
		smoothQuad,
		quadMovement,
		toGrayscale,
		calculateSharpnessScore,
		isConvexQuad,
		type Quad,
		type Point
	} from '$lib/domain/image-filters';

	interface Props {
		oncapture: (file: File, previewUrl: string, ocrFile?: File) => void;
		isProcessing?: boolean;
	}

	let { oncapture, isProcessing = false }: Props = $props();

	let containerEl: HTMLElement | null = $state(null);
	let reticleEl: HTMLElement | null = $state(null);
	let videoEl: HTMLVideoElement | null = $state(null);
	let fileInputEl: HTMLInputElement | null = $state(null);
	let stream: MediaStream | null = $state(null);
	let cameraActive = $state(false);
	let cameraError = $state('');
	let hasTorch = $state(false);
	let isTorchOn = $state(false);
	let slipAspect: 'standard' | 'long' = $state('standard');
	let statusAnnouncement = $state('Camera ready. Align receipt within frame.');

	// Document scanner & auto-capture states (AC-25)
	let autoSnapEnabled = $state(true);
	let isFlashing = $state(false);
	let detectedQuad: Quad | null = $state(null);
	let smoothedQuad: Quad | null = $state(null);
	let prevQuad: Quad | null = null;
	let stableDurationMs = $state(0);
	let missedDetectionFrames = 0;
	let lastDetectTime = 0;
	let rafId: number | null = null;

	let stableProgress = $derived(Math.min(1, stableDurationMs / 500));

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

					const track = stream.getVideoTracks()[0];
					if (track) {
						const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
						hasTorch = Boolean(caps.torch);
					}

					startDetectionLoop();
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

	function startDetectionLoop() {
		stopDetectionLoop();

		const offscreenCanvas = document.createElement('canvas');
		const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

		const detectFrame = (timestamp: number) => {
			if (!cameraActive || isProcessing || !videoEl) {
				rafId = requestAnimationFrame(detectFrame);
				return;
			}

			// Throttle detection to run every ~65ms (~15 fps) to conserve mobile battery
			const elapsed = timestamp - lastDetectTime;
			if (elapsed >= 65) {
				lastDetectTime = timestamp;

				const vw = videoEl.videoWidth;
				const vh = videoEl.videoHeight;

				if (vw > 0 && vh > 0 && offscreenCtx) {
					const targetWidth = 240;
					const targetHeight = Math.round((240 * vh) / vw);

					if (offscreenCanvas.width !== targetWidth || offscreenCanvas.height !== targetHeight) {
						offscreenCanvas.width = targetWidth;
						offscreenCanvas.height = targetHeight;
					}

					try {
						offscreenCtx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
						const imgData = offscreenCtx.getImageData(0, 0, targetWidth, targetHeight);
						const gray = toGrayscale(imgData.data, targetWidth, targetHeight);

						const quad = detectReceiptQuad(gray, targetWidth, targetHeight);

						if (quad && isConvexQuad(quad)) {
							missedDetectionFrames = 0;
							smoothedQuad = smoothQuad(quad, smoothedQuad, 0.45);
							detectedQuad = smoothedQuad;

							// Stability check for auto-snap
							if (prevQuad) {
								const displacement = quadMovement(detectedQuad, prevQuad);
								// If movement is under 1.5% of frame dimensions, consider document steady
								if (displacement < 0.015) {
									stableDurationMs += elapsed;

									if (autoSnapEnabled && stableDurationMs >= 500 && !isProcessing) {
										const sharpness = calculateSharpnessScore(gray, targetWidth, targetHeight);
										if (sharpness >= 12) {
											// Auto-snap triggered!
											stableDurationMs = 0;
											takeSnapshot();
										}
									}
								} else {
									stableDurationMs = 0;
								}
							}
							prevQuad = detectedQuad;
						} else {
							missedDetectionFrames++;
							if (missedDetectionFrames > 4) {
								detectedQuad = null;
								smoothedQuad = null;
								prevQuad = null;
								stableDurationMs = 0;
							}
						}
					} catch (e) {
						// Ignore transient canvas read errors during orientation changes
					}
				}
			}

			rafId = requestAnimationFrame(detectFrame);
		};

		rafId = requestAnimationFrame(detectFrame);
	}

	function stopDetectionLoop() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		detectedQuad = null;
		smoothedQuad = null;
		prevQuad = null;
		stableDurationMs = 0;
	}

	async function toggleTorch() {
		if (!stream) return;
		const track = stream.getVideoTracks()[0];
		if (!track) return;
		try {
			isTorchOn = !isTorchOn;
			await (track.applyConstraints as any)({
				advanced: [{ torch: isTorchOn }]
			});
		} catch (err) {
			console.warn('Could not toggle torch:', err);
			isTorchOn = false;
		}
	}

	function stopCamera() {
		stopDetectionLoop();
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		cameraActive = false;
		isTorchOn = false;
	}

	function getSvgPolygonPoints(quad: Quad): string {
		if (!containerEl || !videoEl) return '';
		const cw = containerEl.clientWidth;
		const ch = containerEl.clientHeight;
		const vw = videoEl.videoWidth || 1280;
		const vh = videoEl.videoHeight || 720;
		if (cw <= 0 || ch <= 0 || vw <= 0 || vh <= 0) return '';

		const scale = Math.max(cw / vw, ch / vh);
		const rw = vw * scale;
		const rh = vh * scale;
		const ox = (rw - cw) / 2;
		const oy = (rh - ch) / 2;

		return quad
			.map((p) => {
				const x = p.x * vw * scale - ox;
				const y = p.y * vh * scale - oy;
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	}

	function getSvgCornerPoints(quad: Quad): Point[] {
		if (!containerEl || !videoEl) return [];
		const cw = containerEl.clientWidth;
		const ch = containerEl.clientHeight;
		const vw = videoEl.videoWidth || 1280;
		const vh = videoEl.videoHeight || 720;
		if (cw <= 0 || ch <= 0 || vw <= 0 || vh <= 0) return [];

		const scale = Math.max(cw / vw, ch / vh);
		const rw = vw * scale;
		const rh = vh * scale;
		const ox = (rw - cw) / 2;
		const oy = (rh - ch) / 2;

		return quad.map((p) => ({
			x: p.x * vw * scale - ox,
			y: p.y * vh * scale - oy
		}));
	}

	async function takeSnapshot() {
		if (!videoEl || !cameraActive || isProcessing) return;

		// Trigger visual flash
		isFlashing = true;
		setTimeout(() => (isFlashing = false), 150);

		// Haptic vibration feedback
		if (typeof navigator !== 'undefined' && navigator.vibrate) {
			try {
				navigator.vibrate(50);
			} catch (_) {}
		}

		statusAnnouncement = detectedQuad
			? 'Document boundary locked. Dewarping perspective and enhancing for AI OCR...'
			: 'Capturing receipt, auto-cropping, and enhancing for AI OCR...';

		try {
			const activeQuad = detectedQuad ? ([...detectedQuad] as Quad) : null;
			const { originalFile, ocrFile, previewUrl } = await processReceiptSnapshot(
				videoEl,
				containerEl,
				reticleEl,
				activeQuad
			);
			statusAnnouncement = 'Receipt captured. Processing with AI vision model...';
			oncapture(originalFile, previewUrl, ocrFile);
			return;
		} catch (err) {
			console.warn('Optimized snapshot processing failed, using fallback:', err);
		}

		// Fallback snapshot if elements or canvas error
		const canvas = document.createElement('canvas');
		const videoWidth = videoEl.videoWidth || 1280;
		const videoHeight = videoEl.videoHeight || 720;
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

		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				const file = new File([blob], `receipt_${Date.now()}.webp`, { type: 'image/webp' });
				const previewUrl = URL.createObjectURL(blob);
				statusAnnouncement = 'Receipt captured. Processing with AI vision model...';
				oncapture(file, previewUrl);
			},
			'image/webp',
			0.85
		);
	}

	async function handleFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		statusAnnouncement = 'Receipt file selected. Optimizing image and enhancing text...';

		try {
			const { originalFile, ocrFile, previewUrl } = await processUploadedImageFile(file);
			statusAnnouncement = 'Receipt optimized. Processing with AI vision model...';
			oncapture(originalFile, previewUrl, ocrFile);
		} catch (err) {
			console.warn('Uploaded image enhancement failed, using raw fallback:', err);
			const previewUrl = URL.createObjectURL(file);
			oncapture(file, previewUrl, file);
		}
	}
</script>

<div
	bind:this={containerEl}
	class="relative w-full h-full min-h-[420px] max-h-[75vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center select-none"
>
	<!-- Screen Reader Accessibility Announcer (WCAG SC 4.1.3) -->
	<div aria-live="polite" class="sr-only">
		{statusAnnouncement}
	</div>

	<!-- Shutter Flash Animation -->
	{#if isFlashing}
		<div class="absolute inset-0 bg-white/70 z-40 pointer-events-none transition-opacity duration-150"></div>
	{/if}

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

		<!-- Top Controls Bar: Aspect Ratio, Version Tag, Auto-Snap & Torch -->
		<div class="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-3 sm:px-5 pointer-events-auto gap-2">
			<!-- Aspect Ratio Pill & Version Tag -->
			<div class="flex items-center gap-1.5">
				<div class="flex items-center p-0.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-lg text-[11px] font-bold">
					<button
						type="button"
						onclick={() => (slipAspect = 'standard')}
						class="px-2.5 sm:px-3 py-1 rounded-full transition-colors {slipAspect === 'standard'
							? 'bg-emerald-500 text-slate-950 shadow-xs'
							: 'text-slate-300 hover:text-white'}"
					>
						Standard 3:4
					</button>
					<button
						type="button"
						onclick={() => (slipAspect = 'long')}
						class="px-2.5 sm:px-3 py-1 rounded-full transition-colors {slipAspect === 'long'
							? 'bg-emerald-500 text-slate-950 shadow-xs'
							: 'text-slate-300 hover:text-white'}"
					>
						Long Slip
					</button>
				</div>
				<span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900/90 text-emerald-400 border border-slate-700 shadow-xs">
					v1.9
				</span>
			</div>

			<!-- Right Controls: Auto-Snap & Torch -->
			<div class="flex items-center gap-2">
				<!-- Auto-Snap Toggle Button (AC-25) -->
				<button
					type="button"
					onclick={() => (autoSnapEnabled = !autoSnapEnabled)}
					class="px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold backdrop-blur-md shadow-lg border transition-all {autoSnapEnabled
						? 'bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-500/20'
						: 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-white'}"
					title={autoSnapEnabled ? 'Auto-capture enabled (snaps when steady)' : 'Auto-capture off (tap shutter to snap)'}
					aria-label={autoSnapEnabled ? 'Disable auto-capture' : 'Enable auto-capture'}
				>
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill={autoSnapEnabled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
						<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
					</svg>
					<span class="hidden sm:inline">{autoSnapEnabled ? 'Auto-Snap ON' : 'Auto-Snap OFF'}</span>
					<span class="sm:hidden">{autoSnapEnabled ? 'Auto' : 'Manual'}</span>
				</button>

				<!-- Torch / Flashlight Toggle Button -->
				{#if hasTorch}
					<button
						type="button"
						onclick={toggleTorch}
						class="p-2 sm:p-2.5 rounded-full transition-all backdrop-blur-md shadow-lg border {isTorchOn
							? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/30'
							: 'bg-slate-900/80 text-white border-slate-700/60 hover:bg-slate-800'}"
						aria-label={isTorchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
						title={isTorchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
					>
						<svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill={isTorchOn ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 6c0 2-2 4-2 7v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-6c0-3-2-5-2-7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/>
							<line x1="6" x2="18" y1="6" y2="6"/>
							<line x1="12" x2="12" y1="12" y2="12"/>
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Status Badge: Document Locked OR Active Radar Scan (AC-25) -->
		{#if detectedQuad}
			<div class="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/85 border border-emerald-500/70 text-emerald-300 text-[11px] font-bold shadow-xl backdrop-blur-md transition-all">
				<span class="relative flex h-2 w-2">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
					<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
				</span>
				<span>Document Locked</span>
				{#if autoSnapEnabled && stableProgress > 0}
					<div class="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-emerald-600/40">
						<div class="h-full bg-emerald-400 transition-all duration-75" style="width: {stableProgress * 100}%"></div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/75 border border-slate-700/80 text-slate-300 text-[11px] font-semibold shadow-lg backdrop-blur-md">
				<span class="relative flex h-2 w-2">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/50 opacity-75"></span>
					<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
				</span>
				<span>Scanning for receipt...</span>
			</div>
		{/if}

		<!-- Real-Time Document Detection SVG Boundary Overlay (AC-25) -->
		{#if detectedQuad && containerEl && videoEl}
			<svg class="absolute inset-0 w-full h-full pointer-events-none z-10">
				<polygon
					points={getSvgPolygonPoints(detectedQuad)}
					class="fill-emerald-400/15 stroke-emerald-400 stroke-2 transition-all duration-75"
					stroke-linejoin="round"
				/>
				{#each getSvgCornerPoints(detectedQuad) as pt}
					<circle cx={pt.x} cy={pt.y} r="5" class="fill-emerald-400 stroke-white stroke-2 shadow-lg" />
				{/each}
			</svg>
		{/if}

		<!-- Visual Document Alignment Reticle & Shading (Falls back if quad is searching) -->
		<div class="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
			<div
				bind:this={reticleEl}
				class="relative w-full transition-all duration-300 border-2 border-dashed {detectedQuad ? 'border-emerald-400/30' : 'border-emerald-400/80'} rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] {slipAspect === 'standard' ? 'max-w-sm aspect-[3/4]' : 'max-w-[260px] aspect-[1/2.2]'}"
			>
				{#if !detectedQuad}
					<!-- Sweeping document laser scanning beam -->
					<div class="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981] animate-scan-beam pointer-events-none"></div>

					<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-emerald-400 text-xs font-semibold px-3 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap">
						{slipAspect === 'long' ? 'Align Long Slip Within Frame' : 'Align Slip Within Frame'}
					</div>
				{/if}

				<!-- Reticle Corner Accents -->
				<span class="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl {detectedQuad ? 'opacity-40' : 'opacity-100'}"></span>
				<span class="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl {detectedQuad ? 'opacity-40' : 'opacity-100'}"></span>
				<span class="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl {detectedQuad ? 'opacity-40' : 'opacity-100'}"></span>
				<span class="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl {detectedQuad ? 'opacity-40' : 'opacity-100'}"></span>
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
				<div class="w-full h-full rounded-full {detectedQuad ? 'bg-emerald-400 hover:bg-emerald-300' : 'bg-white hover:bg-emerald-400'} active:bg-emerald-500 transition-colors flex items-center justify-center">
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

<style>
	@keyframes scan-beam {
		0% {
			top: 5%;
			opacity: 0.2;
		}
		50% {
			opacity: 0.95;
		}
		100% {
			top: 95%;
			opacity: 0.2;
		}
	}
	:global(.animate-scan-beam) {
		animation: scan-beam 2.4s ease-in-out infinite alternate;
	}
</style>

