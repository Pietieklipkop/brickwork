/**
 * Client-side Document Scanner & Image Preprocessing Pipeline
 * Enhances receipt images for maximum OCR / Vision model accuracy by:
 * 1. Cropping precisely to the viewfinder reticle (3x-4x optical resolution boost)
 * 2. Grayscale luma normalization
 * 3. Adaptive local shadow division (removes hand and phone shadows)
 * 4. Auto-levels histogram contrast stretching (faint thermal print -> deep black)
 * 5. High-frequency unsharp edge sharpening (distinguishes dot-matrix digits and decimals)
 *
 * Designed with pure pixel mathematics so algorithms are 100% testable in Node and Vitest.
 */

export interface CropRect {
	sx: number;
	sy: number;
	sw: number;
	sh: number;
}

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Calculates the exact source coordinates in the camera video stream
 * corresponding to the user-visible alignment reticle, accounting for CSS object-cover.
 */
export function calculateReticleCrop(
	containerWidth: number,
	containerHeight: number,
	reticleRect: { left: number; top: number; width: number; height: number },
	containerRect: { left: number; top: number },
	videoWidth: number,
	videoHeight: number,
	margin = 0.05
): CropRect {
	if (containerWidth <= 0 || containerHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
		return { sx: 0, sy: 0, sw: Math.max(1, videoWidth), sh: Math.max(1, videoHeight) };
	}

	// CSS object-cover scaling calculation
	const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
	const renderedWidth = videoWidth * scale;
	const renderedHeight = videoHeight * scale;
	const offsetX = (renderedWidth - containerWidth) / 2;
	const offsetY = (renderedHeight - containerHeight) / 2;

	// Position of reticle relative to container
	const relX = reticleRect.left - containerRect.left;
	const relY = reticleRect.top - containerRect.top;

	// Map container pixels back to video source pixels
	let sx = (relX + offsetX) / scale;
	let sy = (relY + offsetY) / scale;
	let sw = reticleRect.width / scale;
	let sh = reticleRect.height / scale;

	// Apply margin to ensure text near the border is not accidentally clipped
	const marginX = sw * margin;
	const marginY = sh * margin;

	sx = Math.max(0, sx - marginX);
	sy = Math.max(0, sy - marginY);
	sw = Math.min(videoWidth - sx, sw + marginX * 2);
	sh = Math.min(videoHeight - sy, sh + marginY * 2);

	return {
		sx: Math.round(sx),
		sy: Math.round(sy),
		sw: Math.max(1, Math.round(sw)),
		sh: Math.max(1, Math.round(sh))
	};
}

/**
 * Converts standard RGBA pixel data to an 8-bit grayscale luminance array using Rec. 601 coefficients.
 */
export function toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
	const totalPixels = width * height;
	const gray = new Uint8Array(totalPixels);

	for (let i = 0, p = 0; i < totalPixels; i++, p += 4) {
		const r = rgba[p];
		const g = rgba[p + 1];
		const b = rgba[p + 2];
		// Integer fixed-point approximation of 0.299*R + 0.587*G + 0.114*B
		gray[i] = (r * 77 + g * 150 + b * 29) >> 8;
	}

	return gray;
}

/**
 * Removes uneven shadows (e.g. phone cast shadows) across a receipt using local background estimation
 * and division normalization.
 */
export function removeShadowsAdaptive(
	gray: Uint8Array,
	width: number,
	height: number,
	blockSize?: number
): Uint8Array {
	const output = new Uint8Array(width * height);
	if (width <= 0 || height <= 0) return output;

	// Choose block size roughly 1/24th of the shortest dimension (min 16px, max 64px)
	const minDim = Math.min(width, height);
	const bs = blockSize ?? Math.max(16, Math.min(64, Math.floor(minDim / 24)));

	const gridCols = Math.ceil(width / bs);
	const gridRows = Math.ceil(height / bs);
	const bgGrid = new Float32Array(gridCols * gridRows);

	// 1. In each block, estimate the local background (paper) level as the 90th percentile
	for (let gy = 0; gy < gridRows; gy++) {
		const startY = gy * bs;
		const endY = Math.min(height, startY + bs);

		for (let gx = 0; gx < gridCols; gx++) {
			const startX = gx * bs;
			const endX = Math.min(width, startX + bs);

			// Collect histogram for this block
			const hist = new Int32Array(256);
			let count = 0;

			for (let y = startY; y < endY; y++) {
				const rowOffset = y * width;
				for (let x = startX; x < endX; x++) {
					hist[gray[rowOffset + x]]++;
					count++;
				}
			}

			// Find 90th percentile
			let acc = 0;
			const target = Math.floor(count * 0.9);
			let bgVal = 200; // default safe fallback

			for (let v = 0; v < 256; v++) {
				acc += hist[v];
				if (acc >= target) {
					bgVal = v;
					break;
				}
			}

			// Ensure paper baseline is not zero
			bgGrid[gy * gridCols + gx] = Math.max(30, bgVal);
		}
	}

	// 2. Bilinearly interpolate background grid and divide each pixel by local illumination
	const targetPaperLevel = 225; // Target bright clean white paper value

	for (let y = 0; y < height; y++) {
		const fy = (y / bs) - 0.5;
		const gy0 = Math.max(0, Math.min(gridRows - 1, Math.floor(fy)));
		const gy1 = Math.max(0, Math.min(gridRows - 1, gy0 + 1));
		const yFrac = Math.max(0, Math.min(1, fy - gy0));

		const rowOffset = y * width;

		for (let x = 0; x < width; x++) {
			const fx = (x / bs) - 0.5;
			const gx0 = Math.max(0, Math.min(gridCols - 1, Math.floor(fx)));
			const gx1 = Math.max(0, Math.min(gridCols - 1, gx0 + 1));
			const xFrac = Math.max(0, Math.min(1, fx - gx0));

			const bg00 = bgGrid[gy0 * gridCols + gx0];
			const bg10 = bgGrid[gy0 * gridCols + gx1];
			const bg01 = bgGrid[gy1 * gridCols + gx0];
			const bg11 = bgGrid[gy1 * gridCols + gx1];

			const bgTop = bg00 + (bg10 - bg00) * xFrac;
			const bgBottom = bg01 + (bg11 - bg01) * xFrac;
			const localBg = bgTop + (bgBottom - bgTop) * yFrac;

			const orig = gray[rowOffset + x];
			// Division normalization: turns shadowed paper bright white without destroying text
			const normalized = (orig / (localBg + 1e-4)) * targetPaperLevel;
			output[rowOffset + x] = Math.min(255, Math.max(0, Math.round(normalized)));
		}
	}

	return output;
}

/**
 * Auto-levels histogram contrast stretching.
 * Identifies the 2nd percentile (ink baseline) and 98th percentile (paper baseline)
 * and linearly stretches them to [0, 255].
 */
export function autoLevelsContrast(
	gray: Uint8Array,
	width: number,
	height: number,
	lowCutPercent = 0.02,
	highCutPercent = 0.98
): Uint8Array {
	const totalPixels = width * height;
	const output = new Uint8Array(totalPixels);
	if (totalPixels === 0) return output;

	const hist = new Int32Array(256);
	for (let i = 0; i < totalPixels; i++) {
		hist[gray[i]]++;
	}

	const lowTarget = Math.floor(totalPixels * lowCutPercent);
	const highTarget = Math.floor(totalPixels * highCutPercent);

	let acc = 0;
	let lowVal = 0;
	let highVal = 255;

	for (let v = 0; v < 256; v++) {
		acc += hist[v];
		if (lowVal === 0 && acc >= lowTarget) {
			lowVal = v;
		}
		if (acc >= highTarget) {
			highVal = v;
			break;
		}
	}

	if (highVal <= lowVal + 15) {
		// Low dynamic range or uniform image, return as-is
		output.set(gray);
		return output;
	}

	// Pre-compute 256-entry lookup table for fast linear stretch
	const lut = new Uint8Array(256);
	const range = highVal - lowVal;

	for (let v = 0; v < 256; v++) {
		if (v <= lowVal) {
			lut[v] = 0;
		} else if (v >= highVal) {
			lut[v] = 255;
		} else {
			lut[v] = Math.round(((v - lowVal) / range) * 255);
		}
	}

	for (let i = 0; i < totalPixels; i++) {
		output[i] = lut[gray[i]];
	}

	return output;
}

/**
 * Applies a 3x3 sharpening convolution filter to crispen thermal dot-matrix characters
 * and fine decimal points.
 */
export function applySharpenFilter(gray: Uint8Array, width: number, height: number): Uint8Array {
	const totalPixels = width * height;
	const output = new Uint8Array(totalPixels);
	if (width < 3 || height < 3) {
		output.set(gray);
		return output;
	}

	// Kernel:
	//  0  -0.5   0
	// -0.5 3.0 -0.5
	//  0  -0.5   0

	for (let y = 0; y < height; y++) {
		const rowOffset = y * width;
		const prevRow = y > 0 ? (y - 1) * width : rowOffset;
		const nextRow = y < height - 1 ? (y + 1) * width : rowOffset;

		for (let x = 0; x < width; x++) {
			if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
				output[rowOffset + x] = gray[rowOffset + x];
				continue;
			}

			const center = gray[rowOffset + x];
			const top = gray[prevRow + x];
			const bottom = gray[nextRow + x];
			const left = gray[rowOffset + x - 1];
			const right = gray[rowOffset + x + 1];

			const sharp = center * 3.0 - (top + bottom + left + right) * 0.5;
			output[rowOffset + x] = Math.min(255, Math.max(0, Math.round(sharp)));
		}
	}

	return output;
}

/**
 * Runs the full OCR enhancement pipeline on raw RGBA pixel data:
 * Grayscale -> Adaptive Shadow Removal -> Auto-Levels -> Sharpening.
 * Returns an RGBA Uint8ClampedArray ready for canvas rendering.
 */
export function enhanceReceiptPixels(
	rgba: Uint8ClampedArray,
	width: number,
	height: number
): Uint8ClampedArray {
	const gray = toGrayscale(rgba, width, height);
	const shadowRemoved = removeShadowsAdaptive(gray, width, height);
	const contrasted = autoLevelsContrast(shadowRemoved, width, height);
	const sharpened = applySharpenFilter(contrasted, width, height);

	const totalPixels = width * height;
	const outRgba = new Uint8ClampedArray(totalPixels * 4);

	for (let i = 0, p = 0; i < totalPixels; i++, p += 4) {
		const val = sharpened[i];
		outRgba[p] = val;
		outRgba[p + 1] = val;
		outRgba[p + 2] = val;
		outRgba[p + 3] = 255; // Fully opaque
	}

	return outRgba;
}

/**
 * Detects document edges or high-contrast receipt bounding box in an image.
 * Returns null if the receipt already spans the entire image frame.
 */
export function detectDocumentBoundingBox(
	gray: Uint8Array,
	width: number,
	height: number
): BoundingBox | null {
	if (width < 30 || height < 30) return null;

	// Downsample to a small grid (e.g. 64x64) to find high-intensity rectangular clusters
	const downCols = 40;
	const downRows = 40;
	const blockW = width / downCols;
	const blockH = height / downRows;

	let minRow = downRows;
	let maxRow = 0;
	let minCol = downCols;
	let maxCol = 0;

	// Find global brightness mean
	let sum = 0;
	for (let i = 0; i < gray.length; i += 4) {
		sum += gray[i];
	}
	const globalMean = sum / (gray.length / 4);

	let detectedBlocks = 0;

	for (let r = 0; r < downRows; r++) {
		const startY = Math.floor(r * blockH);
		const endY = Math.min(height, Math.floor((r + 1) * blockH));

		for (let c = 0; c < downCols; c++) {
			const startX = Math.floor(c * blockW);
			const endX = Math.min(width, Math.floor((c + 1) * blockW));

			let blockSum = 0;
			let blockCount = 0;

			for (let y = startY; y < endY; y += 2) {
				const rowOffset = y * width;
				for (let x = startX; x < endX; x += 2) {
					blockSum += gray[rowOffset + x];
					blockCount++;
				}
			}

			const blockMean = blockCount > 0 ? blockSum / blockCount : 0;

			// Receipt paper typically exhibits significantly higher luminance than surrounding surface
			if (blockMean > globalMean + 20 || blockMean > 150) {
				if (r < minRow) minRow = r;
				if (r > maxRow) maxRow = r;
				if (c < minCol) minCol = c;
				if (c > maxCol) maxCol = c;
				detectedBlocks++;
			}
		}
	}

	// If detected region is between 20% and 90% of the image area, return bounding box
	const totalBlocks = downCols * downRows;
	if (detectedBlocks >= totalBlocks * 0.15 && detectedBlocks <= totalBlocks * 0.9) {
		const pad = 1;
		const c0 = Math.max(0, minCol - pad);
		const c1 = Math.min(downCols, maxCol + pad + 1);
		const r0 = Math.max(0, minRow - pad);
		const r1 = Math.min(downRows, maxRow + pad + 1);

		const x = Math.round(c0 * blockW);
		const y = Math.round(r0 * blockH);
		const w = Math.min(width - x, Math.round((c1 - c0) * blockW));
		const h = Math.min(height - y, Math.round((r1 - r0) * blockH));

		if (w > width * 0.3 && h > height * 0.3) {
			return { x, y, width: w, height: h };
		}
	}

	return null;
}

// ---------------------------------------------------------------------------
// Browser Canvas Helpers
// ---------------------------------------------------------------------------

/**
 * Applies the receipt enhancement filter pipeline to an existing HTMLCanvasElement.
 * Returns a new canvas with the filtered result.
 */
export function applyOcrFiltersToCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
	const outCanvas = document.createElement('canvas');
	outCanvas.width = sourceCanvas.width;
	outCanvas.height = sourceCanvas.height;

	const ctx = outCanvas.getContext('2d');
	if (!ctx) return sourceCanvas;

	const srcCtx = sourceCanvas.getContext('2d');
	if (!srcCtx) return sourceCanvas;

	const imgData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
	const enhancedRgba = enhanceReceiptPixels(imgData.data, sourceCanvas.width, sourceCanvas.height);

	const newImgData = ctx.createImageData(sourceCanvas.width, sourceCanvas.height);
	newImgData.data.set(enhancedRgba);
	ctx.putImageData(newImgData, 0, 0);

	return outCanvas;
}

/**
 * Crops a video stream snapshot to the exact dimensions of the viewfinder reticle.
 */
export function cropVideoToReticle(
	video: HTMLVideoElement,
	containerEl: HTMLElement,
	reticleEl: HTMLElement,
	maxDim = 1600
): HTMLCanvasElement {
	const containerRect = containerEl.getBoundingClientRect();
	const reticleRect = reticleEl.getBoundingClientRect();

	const videoWidth = video.videoWidth || 1920;
	const videoHeight = video.videoHeight || 1080;

	const crop = calculateReticleCrop(
		containerRect.width,
		containerRect.height,
		reticleRect,
		containerRect,
		videoWidth,
		videoHeight,
		0.05
	);

	// Scale down if cropped region is larger than maxDim, preserving aspect ratio
	let targetWidth = crop.sw;
	let targetHeight = crop.sh;

	if (targetWidth > maxDim || targetHeight > maxDim) {
		if (targetWidth > targetHeight) {
			targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
			targetWidth = maxDim;
		} else {
			targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
			targetHeight = maxDim;
		}
	}

	const canvas = document.createElement('canvas');
	canvas.width = targetWidth;
	canvas.height = targetHeight;

	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.drawImage(
			video,
			crop.sx,
			crop.sy,
			crop.sw,
			crop.sh,
			0,
			0,
			targetWidth,
			targetHeight
		);
	}

	return canvas;
}

/**
 * Dual-stream processor for live camera snapshots.
 * Returns:
 * - originalFile: High-quality natural color cropped receipt (for Cloudflare R2 permanent record)
 * - ocrFile: Preprocessed, shadow-free, high-contrast image (for Workers AI OCR extraction)
 * - previewUrl: Blob URL for immediate UI review
 */
export async function processReceiptSnapshot(
	video: HTMLVideoElement,
	containerEl: HTMLElement,
	reticleEl: HTMLElement
): Promise<{ originalFile: File; ocrFile: File; previewUrl: string }> {
	const croppedCanvas = cropVideoToReticle(video, containerEl, reticleEl, 1600);
	const enhancedCanvas = applyOcrFiltersToCanvas(croppedCanvas);

	const timestamp = Date.now();

	// 1. Export clean color photo for R2
	const originalBlob = await new Promise<Blob>((resolve, reject) => {
		croppedCanvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error('Failed to create original image blob'))),
			'image/webp',
			0.85
		);
	});

	// 2. Export high-contrast enhanced image for Workers AI OCR
	const ocrBlob = await new Promise<Blob>((resolve, reject) => {
		enhancedCanvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error('Failed to create OCR image blob'))),
			'image/jpeg',
			0.92
		);
	});

	const originalFile = new File([originalBlob], `receipt_${timestamp}.webp`, { type: 'image/webp' });
	const ocrFile = new File([ocrBlob], `receipt_ocr_${timestamp}.jpg`, { type: 'image/jpeg' });
	const previewUrl = URL.createObjectURL(originalBlob);

	return { originalFile, ocrFile, previewUrl };
}

/**
 * Dual-stream processor for uploaded/dragged receipt images.
 */
export async function processUploadedImageFile(
	file: File,
	maxDim = 1600
): Promise<{ originalFile: File; ocrFile: File; previewUrl: string }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const reader = new FileReader();

		reader.onload = (e) => {
			img.onload = async () => {
				try {
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

					const canvas = document.createElement('canvas');
					canvas.width = w;
					canvas.height = h;

					const ctx = canvas.getContext('2d');
					if (!ctx) throw new Error('Could not get canvas context');

					ctx.drawImage(img, 0, 0, w, h);

					// Apply OCR filters
					const enhancedCanvas = applyOcrFiltersToCanvas(canvas);

					const timestamp = Date.now();

					const originalBlob = await new Promise<Blob>((res, rej) => {
						canvas.toBlob(
							(b) => (b ? res(b) : rej(new Error('Failed to export uploaded image blob'))),
							'image/webp',
							0.85
						);
					});

					const ocrBlob = await new Promise<Blob>((res, rej) => {
						enhancedCanvas.toBlob(
							(b) => (b ? res(b) : rej(new Error('Failed to export OCR image blob'))),
							'image/jpeg',
							0.92
						);
					});

					const originalFile = new File([originalBlob], file.name.replace(/\.[^.]+$/, '.webp'), {
						type: 'image/webp'
					});
					const ocrFile = new File([ocrBlob], `upload_ocr_${timestamp}.jpg`, {
						type: 'image/jpeg'
					});
					const previewUrl = URL.createObjectURL(originalBlob);

					resolve({ originalFile, ocrFile, previewUrl });
				} catch (err) {
					reject(err);
				}
			};

			img.onerror = () => reject(new Error('Failed to decode image file'));
			img.src = e.target?.result as string;
		};

		reader.onerror = () => reject(new Error('Failed to read image file'));
		reader.readAsDataURL(file);
	});
}
