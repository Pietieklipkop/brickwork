import { describe, it, expect } from 'vitest';
import {
	calculateReticleCrop,
	toGrayscale,
	removeShadowsAdaptive,
	autoLevelsContrast,
	applySharpenFilter,
	enhanceReceiptPixels,
	detectDocumentBoundingBox
} from '../image-filters';

describe('Image Preprocessing & OCR Enhancement Pipeline', () => {
	describe('calculateReticleCrop', () => {
		it('calculates exact source coordinates for reticle with CSS object-cover scaling', () => {
			// Container: 400x600 (portrait mobile screen)
			// Video sensor: 1080x1920
			// Reticle centered: 300x400 at (50, 100)
			const containerWidth = 400;
			const containerHeight = 600;
			const videoWidth = 1080;
			const videoHeight = 1920;

			const reticleRect = { left: 50, top: 100, width: 300, height: 400 };
			const containerRect = { left: 0, top: 0 };

			const crop = calculateReticleCrop(
				containerWidth,
				containerHeight,
				reticleRect,
				containerRect,
				videoWidth,
				videoHeight,
				0.05
			);

			// Scale = max(400/1080, 600/1920) = max(0.3703, 0.3125) = 400/1080
			// The crop should be within video bounds
			expect(crop.sx).toBeGreaterThanOrEqual(0);
			expect(crop.sy).toBeGreaterThanOrEqual(0);
			expect(crop.sw).toBeGreaterThan(0);
			expect(crop.sh).toBeGreaterThan(0);
			expect(crop.sx + crop.sw).toBeLessThanOrEqual(videoWidth);
			expect(crop.sy + crop.sh).toBeLessThanOrEqual(videoHeight);
		});

		it('handles degenerate input dimensions safely', () => {
			const crop = calculateReticleCrop(
				0,
				0,
				{ left: 0, top: 0, width: 100, height: 100 },
				{ left: 0, top: 0 },
				1920,
				1080
			);

			expect(crop.sx).toBe(0);
			expect(crop.sy).toBe(0);
			expect(crop.sw).toBe(1920);
			expect(crop.sh).toBe(1080);
		});
	});

	describe('toGrayscale', () => {
		it('converts pure colors to standard perceptual luma values', () => {
			// Red: [255, 0, 0, 255] -> ~76
			// Green: [0, 255, 0, 255] -> ~149
			// Blue: [0, 0, 255, 255] -> ~28
			const rgba = new Uint8ClampedArray([
				255, 0, 0, 255,
				0, 255, 0, 255,
				0, 0, 255, 255,
				255, 255, 255, 255
			]);

			const gray = toGrayscale(rgba, 2, 2);

			expect(gray[0]).toBeCloseTo(76, -1);
			expect(gray[1]).toBeCloseTo(149, -1);
			expect(gray[2]).toBeCloseTo(28, -1);
			expect(gray[3]).toBe(255);
		});
	});

	describe('removeShadowsAdaptive', () => {
		it('normalizes shadowed areas closer to unshadowed paper', () => {
			const width = 64;
			const height = 64;
			const gray = new Uint8Array(width * height);

			// Half the image is lit paper (~220) with text (~60)
			// Half the image is in a phone shadow (~110) with text (~30)
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const idx = y * width + x;
					const isLit = x < width / 2;
					const isText = (x === 10 || x === 40) && y >= 20 && y <= 40;

					if (isLit) {
						gray[idx] = isText ? 60 : 220;
					} else {
						gray[idx] = isText ? 30 : 110;
					}
				}
			}

			const leveled = removeShadowsAdaptive(gray, width, height, 16);

			// The paper in both the lit half and the shadowed half should now be normalized close to 225
			const litPaper = leveled[10 * width + 5]; // lit region paper
			const shadowPaper = leveled[10 * width + 55]; // shadowed region paper

			expect(litPaper).toBeGreaterThan(180);
			expect(shadowPaper).toBeGreaterThan(180);
			// The difference between lit paper and shadow paper should be drastically reduced
			expect(Math.abs(litPaper - shadowPaper)).toBeLessThan(40);
		});
	});

	describe('autoLevelsContrast', () => {
		it('stretches low-contrast thermal text to full dynamic range', () => {
			const width = 10;
			const height = 10;
			const gray = new Uint8Array(width * height);

			// Faint thermal print: paper is 180, text is 120
			for (let i = 0; i < gray.length; i++) {
				gray[i] = i % 5 === 0 ? 120 : 180;
			}

			const stretched = autoLevelsContrast(gray, width, height, 0.05, 0.95);

			// The text (120) should be pulled toward 0 (black)
			// The paper (180) should be pulled toward 255 (white)
			const minVal = Math.min(...stretched);
			const maxVal = Math.max(...stretched);

			expect(minVal).toBeLessThan(50);
			expect(maxVal).toBeGreaterThan(200);
		});
	});

	describe('applySharpenFilter', () => {
		it('accentuates high-contrast character edges', () => {
			const width = 5;
			const height = 5;
			const gray = new Uint8Array(width * height).fill(200);

			// Place a single dark pixel (e.g. dot-matrix text dot) in the center
			const centerIdx = 2 * width + 2;
			gray[centerIdx] = 50;

			const sharpened = applySharpenFilter(gray, width, height);

			// The center should be darkened even more (enhanced contrast)
			expect(sharpened[centerIdx]).toBeLessThanOrEqual(50);
		});
	});

	describe('enhanceReceiptPixels', () => {
		it('processes RGBA input and returns fully opaque RGBA output of matching size', () => {
			const width = 32;
			const height = 32;
			const rgba = new Uint8ClampedArray(width * height * 4);

			for (let i = 0; i < rgba.length; i += 4) {
				rgba[i] = 180; // R
				rgba[i + 1] = 175; // G
				rgba[i + 2] = 170; // B
				rgba[i + 3] = 255; // A
			}

			const enhanced = enhanceReceiptPixels(rgba, width, height);

			expect(enhanced.length).toBe(width * height * 4);
			// Alpha channel must be 255
			expect(enhanced[3]).toBe(255);
			expect(enhanced[7]).toBe(255);
		});
	});

	describe('detectDocumentBoundingBox', () => {
		it('detects a high-contrast receipt on a dark surface', () => {
			const width = 100;
			const height = 100;
			const gray = new Uint8Array(width * height).fill(40); // dark table

			// White receipt in center: x in [25, 75], y in [20, 80]
			for (let y = 20; y <= 80; y++) {
				for (let x = 25; x <= 75; x++) {
					gray[y * width + x] = 220;
				}
			}

			const bbox = detectDocumentBoundingBox(gray, width, height);

			expect(bbox).not.toBeNull();
			if (bbox) {
				expect(bbox.x).toBeLessThanOrEqual(30);
				expect(bbox.y).toBeLessThanOrEqual(25);
				expect(bbox.width).toBeGreaterThanOrEqual(40);
				expect(bbox.height).toBeGreaterThanOrEqual(50);
			}
		});
	});
});
