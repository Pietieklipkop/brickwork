import { describe, it, expect } from 'vitest';
import {
	distance,
	orderQuadPoints,
	quadArea,
	isConvexQuad,
	computeHomographyCoefficients,
	calculateUnwarpedDimensions,
	calculateOtsuThreshold,
	convexHull,
	ramerDouglasPeucker,
	detectReceiptQuad,
	smoothQuad,
	quadMovement,
	denormalizeQuad,
	unwarpQuadRGBA,
	sampleBilinearRGBA,
	findMaxAreaQuadFromHull,
	type Point,
	type Quad
} from '../document-scanner';

describe('Document Scanner & Homography Dewarping', () => {
	it('calculates Euclidean distance accurately', () => {
		expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
		expect(distance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
	});

	it('orders arbitrary scrambled quadrilateral points into clockwise TL, TR, BR, BL order', () => {
		// Scrambled square corners
		const scrambled: Point[] = [
			{ x: 100, y: 100 }, // BR
			{ x: 0, y: 0 },     // TL
			{ x: 0, y: 100 },   // BL
			{ x: 100, y: 0 }    // TR
		];

		const ordered = orderQuadPoints(scrambled);
		expect(ordered[0]).toEqual({ x: 0, y: 0 });     // TL
		expect(ordered[1]).toEqual({ x: 100, y: 0 });   // TR
		expect(ordered[2]).toEqual({ x: 100, y: 100 }); // BR
		expect(ordered[3]).toEqual({ x: 0, y: 100 });   // BL
	});

	it('correctly calculates quadrilateral area using the Shoelace formula', () => {
		const unitSquare: Quad = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 200 },
			{ x: 0, y: 200 }
		];
		expect(quadArea(unitSquare)).toBe(20000);
	});

	it('validates convex vs non-convex quadrilaterals', () => {
		const convexSquare: Quad = [
			{ x: 0, y: 0 },
			{ x: 100, y: 10 },
			{ x: 95, y: 100 },
			{ x: 5, y: 90 }
		];
		expect(isConvexQuad(convexSquare)).toBe(true);

		// Self-intersecting bowtie quadrilateral
		const bowtie: Quad = [
			{ x: 0, y: 0 },
			{ x: 100, y: 100 },
			{ x: 100, y: 0 },
			{ x: 0, y: 100 }
		];
		expect(isConvexQuad(bowtie)).toBe(false);

		// Inward arrow / dart (concave)
		const concave: Quad = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 50, y: 50 }, // dent inwards
			{ x: 0, y: 100 }
		];
		expect(isConvexQuad(concave)).toBe(false);
	});

	it('computes exact Heckbert homography projective coefficients', () => {
		const targetQuad: Quad = [
			{ x: 20, y: 30 },
			{ x: 180, y: 40 },
			{ x: 160, y: 220 },
			{ x: 40, y: 210 }
		];

		const coeffs = computeHomographyCoefficients(targetQuad);
		const { a, b, c, d, e, f, g, h } = coeffs;

		// Map normalized corners (0,0), (1,0), (1,1), (0,1) back to targetQuad
		function map(u: number, v: number): Point {
			const denom = g * u + h * v + 1;
			return {
				x: (a * u + b * v + c) / denom,
				y: (d * u + e * v + f) / denom
			};
		}

		const pTL = map(0, 0);
		expect(pTL.x).toBeCloseTo(targetQuad[0].x, 3);
		expect(pTL.y).toBeCloseTo(targetQuad[0].y, 3);

		const pTR = map(1, 0);
		expect(pTR.x).toBeCloseTo(targetQuad[1].x, 3);
		expect(pTR.y).toBeCloseTo(targetQuad[1].y, 3);

		const pBR = map(1, 1);
		expect(pBR.x).toBeCloseTo(targetQuad[2].x, 3);
		expect(pBR.y).toBeCloseTo(targetQuad[2].y, 3);

		const pBL = map(0, 1);
		expect(pBL.x).toBeCloseTo(targetQuad[3].x, 3);
		expect(pBL.y).toBeCloseTo(targetQuad[3].y, 3);
	});

	it('samples bilinear pixel colors with smooth interpolation', () => {
		// 2x2 image: Red, Green, Blue, White
		const src = new Uint8ClampedArray([
			255, 0, 0, 255,     0, 255, 0, 255,
			0, 0, 255, 255,     255, 255, 255, 255
		]);

		// Sample exact top-left pixel (Red)
		const p00 = sampleBilinearRGBA(src, 2, 2, 0, 0);
		expect(p00[0]).toBe(255);
		expect(p00[1]).toBe(0);

		// Sample exact midpoint (0.5, 0.5)
		const mid = sampleBilinearRGBA(src, 2, 2, 0.5, 0.5);
		expect(mid[0]).toBe(128);
		expect(mid[1]).toBe(128);
	});

	it('unwarps an angled quadrilateral into a rectangular buffer', () => {
		const srcW = 200;
		const srcH = 200;
		const src = new Uint8ClampedArray(srcW * srcH * 4);

		// Fill source with red in center
		for (let i = 0; i < src.length; i += 4) {
			src[i] = 200;     // R
			src[i + 1] = 50;  // G
			src[i + 2] = 50;  // B
			src[i + 3] = 255; // A
		}

		const quad: Quad = [
			{ x: 20, y: 20 },
			{ x: 180, y: 30 },
			{ x: 170, y: 180 },
			{ x: 30, y: 170 }
		];

		const targetW = 100;
		const targetH = 100;
		const unwarped = unwarpQuadRGBA(src, srcW, srcH, quad, targetW, targetH);

		expect(unwarped.length).toBe(targetW * targetH * 4);
		// Check that center pixel has sampled the color correctly
		const centerIdx = (50 * targetW + 50) * 4;
		expect(unwarped[centerIdx]).toBe(200);
		expect(unwarped[centerIdx + 3]).toBe(255);
	});

	it('calculates unwarped dimensions keeping bounds', () => {
		const quad: Quad = [
			{ x: 0, y: 0 },
			{ x: 300, y: 0 },
			{ x: 300, y: 600 },
			{ x: 0, y: 600 }
		];

		const dims = calculateUnwarpedDimensions(quad, 500);
		expect(dims.height).toBe(500);
		expect(dims.width).toBe(250); // Preserved 1:2 aspect ratio
	});

	it('calculates Otsu threshold correctly on bimodal distribution', () => {
		// 100 dark pixels (value 20) and 100 bright pixels (value 200)
		const bimodal = new Uint8Array(200);
		for (let i = 0; i < 100; i++) bimodal[i] = 20;
		for (let i = 100; i < 200; i++) bimodal[i] = 200;

		const threshold = calculateOtsuThreshold(bimodal);
		expect(threshold).toBeGreaterThanOrEqual(20);
		expect(threshold).toBeLessThanOrEqual(200);
	});

	it('computes convex hull of point clusters', () => {
		const points: Point[] = [
			{ x: 10, y: 10 },
			{ x: 90, y: 10 },
			{ x: 90, y: 90 },
			{ x: 10, y: 90 },
			{ x: 50, y: 50 }, // Inside point
			{ x: 40, y: 40 }  // Inside point
		];

		const hull = convexHull(points);
		expect(hull.length).toBe(4);
	});

	it('approximates polygons using Ramer-Douglas-Peucker', () => {
		// A line with minor perturbation
		const lineWithNoise: Point[] = [
			{ x: 0, y: 0 },
			{ x: 25, y: 1 },
			{ x: 50, y: -1 },
			{ x: 75, y: 0.5 },
			{ x: 100, y: 0 }
		];

		const simplified = ramerDouglasPeucker(lineWithNoise, 2.0);
		expect(simplified.length).toBe(2);
		expect(simplified[0]).toEqual({ x: 0, y: 0 });
		expect(simplified[1]).toEqual({ x: 100, y: 0 });
	});

	it('detects a bright receipt polygon against a dark background', () => {
		const w = 100;
		const h = 100;
		const gray = new Uint8Array(w * h);

		// Fill background with dark value 30 (desk/table)
		gray.fill(30);

		// Draw bright receipt in center: from x: 20 to 80, y: 15 to 85 (value 220)
		for (let y = 15; y <= 85; y++) {
			for (let x = 20; x <= 80; x++) {
				gray[y * w + x] = 220;
			}
		}

		const detected = detectReceiptQuad(gray, w, h);
		expect(detected).not.toBeNull();

		if (detected) {
			expect(detected.length).toBe(4);
			// Check normalized coordinates close to [0.2, 0.15] to [0.8, 0.85]
			expect(detected[0].x).toBeCloseTo(0.2, 1);
			expect(detected[0].y).toBeCloseTo(0.15, 1);
			expect(detected[2].x).toBeCloseTo(0.8, 1);
			expect(detected[2].y).toBeCloseTo(0.85, 1);
		}
	});

	it('smooths quads temporally and measures displacement movement', () => {
		const q1: Quad = [
			{ x: 0.1, y: 0.1 },
			{ x: 0.9, y: 0.1 },
			{ x: 0.9, y: 0.9 },
			{ x: 0.1, y: 0.9 }
		];

		const q2: Quad = [
			{ x: 0.12, y: 0.12 },
			{ x: 0.92, y: 0.12 },
			{ x: 0.92, y: 0.92 },
			{ x: 0.12, y: 0.92 }
		];

		const movement = quadMovement(q1, q2);
		expect(movement).toBeGreaterThan(0);
		expect(movement).toBeLessThan(0.05);

		const smoothed = smoothQuad(q2, q1, 0.5);
		expect(smoothed[0].x).toBeCloseTo(0.11, 4);
		expect(smoothed[0].y).toBeCloseTo(0.11, 4);
	});

	it('denormalizes normalized quads to absolute pixel dimensions', () => {
		const norm: Quad = [
			{ x: 0.25, y: 0.25 },
			{ x: 0.75, y: 0.25 },
			{ x: 0.75, y: 0.75 },
			{ x: 0.25, y: 0.75 }
		];

		const denorm = denormalizeQuad(norm, 1000, 800);
		expect(denorm[0]).toEqual({ x: 250, y: 200 });
		expect(denorm[1]).toEqual({ x: 750, y: 200 });
		expect(denorm[2]).toEqual({ x: 750, y: 600 });
		expect(denorm[3]).toEqual({ x: 250, y: 600 });
	});

	it('selects 4 maximal-area corners from complex convex hulls with findMaxAreaQuadFromHull', () => {
		// A 6-sided polygon (rectangle with bevelled corners or small edge points)
		const hexagon: Point[] = [
			{ x: 10, y: 10 },
			{ x: 50, y: 10 },
			{ x: 90, y: 10 },
			{ x: 90, y: 90 },
			{ x: 50, y: 90 },
			{ x: 10, y: 90 }
		];

		const quad = findMaxAreaQuadFromHull(hexagon);
		expect(quad).not.toBeNull();
		if (quad) {
			expect(quad.length).toBe(4);
			expect(isConvexQuad(quad)).toBe(true);
			// Maximal area should pick the extreme 4 corners: (10,10), (90,10), (90,90), (10,90)
			expect(quadArea(quad)).toBe(6400); // 80 * 80
		}
	});

	it('returns null from findMaxAreaQuadFromHull if hull has fewer than 4 points', () => {
		const triangle: Point[] = [
			{ x: 0, y: 0 },
			{ x: 50, y: 100 },
			{ x: 100, y: 0 }
		];
		expect(findMaxAreaQuadFromHull(triangle)).toBeNull();
	});

	it('detects a receipt under dim lighting conditions using adaptive thresholding', () => {
		const w = 80;
		const h = 80;
		const gray = new Uint8Array(w * h);

		// Dim background: value 25
		gray.fill(25);

		// Dim paper in center: value 85 (low contrast difference of 60 levels)
		for (let y = 15; y <= 65; y++) {
			for (let x = 15; x <= 65; x++) {
				gray[y * w + x] = 85;
			}
		}

		const detected = detectReceiptQuad(gray, w, h);
		expect(detected).not.toBeNull();
		if (detected) {
			expect(detected.length).toBe(4);
			expect(isConvexQuad(detected)).toBe(true);
		}
	});
});
