/**
 * Document Scanner, 4-Point Homography Perspective Dewarping & Auto-Capture Engine
 *
 * Implements Google Drive-style mobile document scanning in the browser:
 * 1. 4-point projective homography dewarping (Paul Heckbert square-to-quad inverse perspective mapping)
 * 2. Real-time quadrilateral paper boundary detection (Otsu binarization + convex hull / polygon approximation)
 * 3. Corner ordering (TL, TR, BR, BL), convexity validation, and aspect ratio checks
 * 4. Temporal exponential smoothing and stability-based auto-capture
 *
 * Pure mathematical algorithms designed with zero external dependencies for 100% testability.
 */

export interface Point {
	x: number;
	y: number;
}

/**
 * 4 ordered points representing:
 * [0]: Top-Left (TL)
 * [1]: Top-Right (TR)
 * [2]: Bottom-Right (BR)
 * [3]: Bottom-Left (BL)
 */
export type Quad = [Point, Point, Point, Point];

/**
 * Calculates Euclidean distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
	const dx = p1.x - p2.x;
	const dy = p1.y - p2.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Orders 4 arbitrary points in clockwise order: Top-Left, Top-Right, Bottom-Right, Bottom-Left.
 * Uses sum and difference of coordinates:
 * - Top-Left: smallest (x + y)
 * - Bottom-Right: largest (x + y)
 * - Top-Right: smallest (y - x) / largest (x - y)
 * - Bottom-Left: largest (y - x) / smallest (x - y)
 */
export function orderQuadPoints(points: Point[]): Quad {
	if (points.length !== 4) {
		throw new Error('orderQuadPoints requires exactly 4 points');
	}

	// Clone to avoid mutating input
	const pts = points.map((p) => ({ x: p.x, y: p.y }));

	// Sort by sum (x + y)
	pts.sort((a, b) => a.x + a.y - (b.x + b.y));
	const tl = pts[0];
	const br = pts[3];

	// The remaining two points are TR and BL.
	// Between the two, TR has larger x (or smaller y - x), and BL has larger y (or larger y - x).
	const rem1 = pts[1];
	const rem2 = pts[2];

	let tr: Point;
	let bl: Point;

	if (rem1.x - rem1.y > rem2.x - rem2.y) {
		tr = rem1;
		bl = rem2;
	} else {
		tr = rem2;
		bl = rem1;
	}

	return [tl, tr, br, bl];
}

/**
 * Calculates polygon area using the Shoelace formula.
 */
export function quadArea(quad: Quad): number {
	const [p0, p1, p2, p3] = quad;
	return (
		0.5 *
		Math.abs(
			p0.x * p1.y - p1.x * p0.y +
			p1.x * p2.y - p2.x * p1.y +
			p2.x * p3.y - p3.x * p2.y +
			p3.x * p0.y - p0.x * p3.y
		)
	);
}

/**
 * Validates that a quadrilateral is strictly convex (no self-intersections, inward darts, or collinear edges).
 */
export function isConvexQuad(quad: Quad): boolean {
	const n = 4;
	let sign = 0;

	for (let i = 0; i < n; i++) {
		const p1 = quad[i];
		const p2 = quad[(i + 1) % n];
		const p3 = quad[(i + 2) % n];

		const dx1 = p2.x - p1.x;
		const dy1 = p2.y - p1.y;
		const dx2 = p3.x - p2.x;
		const dy2 = p3.y - p2.y;

		const cross = dx1 * dy2 - dy1 * dx2;
		// Collinear vertices mean degenerate triangle or straight edge
		if (Math.abs(cross) < 1e-4) return false;

		if (sign === 0) {
			sign = cross > 0 ? 1 : -1;
		} else if ((cross > 0 ? 1 : -1) !== sign) {
			return false;
		}
	}

	return sign !== 0;
}

/**
 * Computes Paul Heckbert's square-to-quad projective transform coefficients.
 * Maps normalized destination coordinates [0,1]^2 back to source quadrilateral coordinates.
 *
 * Given quad [s0, s1, s2, s3], returns coefficients (a, b, c, d, e, f, g, h) such that:
 *   denom = g*u + h*v + 1
 *   x = (a*u + b*v + c) / denom
 *   y = (d*u + e*v + f) / denom
 */
export function computeHomographyCoefficients(quad: Quad): {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
	g: number;
	h: number;
} {
	const [s0, s1, s2, s3] = quad;

	const x0 = s0.x, y0 = s0.y;
	const x1 = s1.x, y1 = s1.y;
	const x2 = s2.x, y2 = s2.y;
	const x3 = s3.x, y3 = s3.y;

	const dx1 = x1 - x2;
	const dx2 = x3 - x2;
	const sx = x0 - x1 + x2 - x3;

	const dy1 = y1 - y2;
	const dy2 = y3 - y2;
	const sy = y0 - y1 + y2 - y3;

	// Pure affine case
	if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
		return {
			a: x1 - x0,
			b: x2 - x1,
			c: x0,
			d: y1 - y0,
			e: y2 - y1,
			f: y0,
			g: 0,
			h: 0
		};
	}

	const det = dx1 * dy2 - dy1 * dx2;
	if (Math.abs(det) < 1e-9) {
		// Fallback to simple affine
		return {
			a: x1 - x0,
			b: x3 - x0,
			c: x0,
			d: y1 - y0,
			e: y3 - y0,
			f: y0,
			g: 0,
			h: 0
		};
	}

	const g = (sx * dy2 - sy * dx2) / det;
	const h = (dx1 * sy - dy1 * sx) / det;

	const a = x1 - x0 + g * x1;
	const b = x3 - x0 + h * x3;
	const c = x0;

	const d = y1 - y0 + g * y1;
	const e = y3 - y0 + h * y3;
	const f = y0;

	return { a, b, c, d, e, f, g, h };
}

/**
 * Bilinear pixel interpolation from an RGBA buffer.
 */
export function sampleBilinearRGBA(
	src: Uint8ClampedArray | Uint8Array,
	srcWidth: number,
	srcHeight: number,
	x: number,
	y: number
): [number, number, number, number] {
	if (x < 0) x = 0;
	if (y < 0) y = 0;
	if (x > srcWidth - 1) x = srcWidth - 1;
	if (y > srcHeight - 1) y = srcHeight - 1;

	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const x1 = Math.min(x0 + 1, srcWidth - 1);
	const y1 = Math.min(y0 + 1, srcHeight - 1);

	const wx = x - x0;
	const wy = y - y0;
	const w00 = (1 - wx) * (1 - wy);
	const w10 = wx * (1 - wy);
	const w01 = (1 - wx) * wy;
	const w11 = wx * wy;

	const idx00 = (y0 * srcWidth + x0) * 4;
	const idx10 = (y0 * srcWidth + x1) * 4;
	const idx01 = (y1 * srcWidth + x0) * 4;
	const idx11 = (y1 * srcWidth + x1) * 4;

	const r = Math.round(src[idx00] * w00 + src[idx10] * w10 + src[idx01] * w01 + src[idx11] * w11);
	const g = Math.round(src[idx00 + 1] * w00 + src[idx10 + 1] * w10 + src[idx01 + 1] * w01 + src[idx11 + 1] * w11);
	const b = Math.round(src[idx00 + 2] * w00 + src[idx10 + 2] * w10 + src[idx01 + 2] * w01 + src[idx11 + 2] * w11);
	const a = Math.round(src[idx00 + 3] * w00 + src[idx10 + 3] * w10 + src[idx01 + 3] * w01 + src[idx11 + 3] * w11);

	return [r, g, b, a];
}

/**
 * Dewarp an arbitrary quadrilateral region of an image into a rectangular unwarped RGBA buffer.
 */
export function unwarpQuadRGBA(
	srcData: Uint8ClampedArray | Uint8Array,
	srcWidth: number,
	srcHeight: number,
	quad: Quad,
	targetWidth: number,
	targetHeight: number
): Uint8ClampedArray {
	const dstData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
	const { a, b, c, d, e, f, g, h } = computeHomographyCoefficients(quad);

	let dstIdx = 0;
	const invW = 1 / targetWidth;
	const invH = 1 / targetHeight;

	for (let y = 0; y < targetHeight; y++) {
		const v = y * invH;
		for (let x = 0; x < targetWidth; x++) {
			const u = x * invW;

			const denom = g * u + h * v + 1;
			const srcX = (a * u + b * v + c) / denom;
			const srcY = (d * u + e * v + f) / denom;

			const [r, gVal, bVal, aVal] = sampleBilinearRGBA(srcData, srcWidth, srcHeight, srcX, srcY);

			dstData[dstIdx] = r;
			dstData[dstIdx + 1] = gVal;
			dstData[dstIdx + 2] = bVal;
			dstData[dstIdx + 3] = aVal;
			dstIdx += 4;
		}
	}

	return dstData;
}

/**
 * Calculates optimal unwarped document width and height given 4 corners,
 * constrained by a maximum dimension.
 */
export function calculateUnwarpedDimensions(
	quad: Quad,
	maxDimension = 1600
): { width: number; height: number } {
	const [s0, s1, s2, s3] = quad;

	const wTop = distance(s0, s1);
	const wBot = distance(s3, s2);
	const hLeft = distance(s0, s3);
	const hRight = distance(s1, s2);

	let w = Math.max(wTop, wBot);
	let h = Math.max(hLeft, hRight);

	if (w <= 0 || h <= 0) {
		return { width: 400, height: 600 };
	}

	if (w > maxDimension || h > maxDimension) {
		if (w > h) {
			h = Math.round((h * maxDimension) / w);
			w = maxDimension;
		} else {
			w = Math.round((w * maxDimension) / h);
			h = maxDimension;
		}
	}

	return {
		width: Math.max(64, Math.round(w)),
		height: Math.max(64, Math.round(h))
	};
}

/**
 * Computes Otsu's optimal threshold for grayscale image binarization.
 */
export function calculateOtsuThreshold(gray: Uint8Array): number {
	const histogram = new Int32Array(256);
	const total = gray.length;
	if (total === 0) return 128;

	for (let i = 0; i < total; i++) {
		histogram[gray[i]]++;
	}

	let sum = 0;
	for (let i = 0; i < 256; i++) {
		sum += i * histogram[i];
	}

	let sumB = 0;
	let wB = 0;
	let wF = 0;
	let maxVariance = 0;
	let threshold = 128;

	for (let t = 0; t < 256; t++) {
		wB += histogram[t];
		if (wB === 0) continue;
		wF = total - wB;
		if (wF === 0) break;

		sumB += t * histogram[t];
		const mB = sumB / wB;
		const mF = (sum - sumB) / wF;

		const variance = wB * wF * (mB - mF) * (mB - mF);
		if (variance > maxVariance) {
			maxVariance = variance;
			threshold = t;
		}
	}

	return threshold;
}

/**
 * Ramer-Douglas-Peucker polygon approximation algorithm.
 */
export function ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
	if (points.length <= 2) return points;

	let dmax = 0;
	let index = 0;
	const end = points.length - 1;

	const p1 = points[0];
	const p2 = points[end];

	const lineDist = distance(p1, p2);

	for (let i = 1; i < end; i++) {
		const p = points[i];
		let d = 0;
		if (lineDist < 1e-6) {
			d = distance(p, p1);
		} else {
			// Perpendicular distance from p to line (p1, p2)
			const num = Math.abs((p2.y - p1.y) * p.x - (p2.x - p1.x) * p.y + p2.x * p1.y - p2.y * p1.x);
			d = num / lineDist;
		}

		if (d > dmax) {
			index = i;
			dmax = d;
		}
	}

	if (dmax > epsilon) {
		const recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
		const recResults2 = ramerDouglasPeucker(points.slice(index), epsilon);
		return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
	} else {
		return [p1, p2];
	}
}

/**
 * Computes Convex Hull of a set of 2D points using the Monotone Chain algorithm.
 */
export function convexHull(points: Point[]): Point[] {
	if (points.length <= 3) return points.slice();

	// Sort points primarily by x, then by y
	const sorted = points.slice().sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

	// Cross product of OA and OB vectors: (A.x - O.x)*(B.y - O.y) - (A.y - O.y)*(B.x - O.x)
	function cross(o: Point, a: Point, b: Point): number {
		return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	}

	// Lower hull
	const lower: Point[] = [];
	for (const p of sorted) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
			lower.pop();
		}
		lower.push(p);
	}

	// Upper hull
	const upper: Point[] = [];
	for (let i = sorted.length - 1; i >= 0; i--) {
		const p = sorted[i];
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
			upper.pop();
		}
		upper.push(p);
	}

	// Pop the last point of each half because it's repeated at the beginning of the other
	lower.pop();
	upper.pop();

	return lower.concat(upper);
}

/**
 * Selects 4 vertices from a convex hull that maximize quadrilateral area.
 * Mathematically guaranteed to find the 4 outermost document corners and form a strictly convex quad.
 */
export function findMaxAreaQuadFromHull(hull: Point[]): Quad | null {
	if (hull.length < 4) return null;
	if (hull.length === 4) {
		const q = orderQuadPoints(hull);
		return isConvexQuad(q) ? q : null;
	}

	// Simplify slightly with RDP if hull has more than 16 points to keep combinatorial search fast (< 0.2ms)
	let candidatePoints = hull;
	if (candidatePoints.length > 16) {
		let perimeter = 0;
		for (let i = 0; i < candidatePoints.length; i++) {
			perimeter += distance(candidatePoints[i], candidatePoints[(i + 1) % candidatePoints.length]);
		}
		const simplified = ramerDouglasPeucker(candidatePoints, perimeter * 0.02);
		if (simplified.length >= 4) {
			candidatePoints = simplified;
		}
	}

	const n = candidatePoints.length;
	let maxArea = 0;
	let bestQuad: Quad | null = null;

	for (let i = 0; i < n - 3; i++) {
		for (let j = i + 1; j < n - 2; j++) {
			for (let k = j + 1; k < n - 1; k++) {
				for (let l = k + 1; l < n; l++) {
					const candidate: Quad = [
						candidatePoints[i],
						candidatePoints[j],
						candidatePoints[k],
						candidatePoints[l]
					];
					const area = quadArea(candidate);
					if (area > maxArea) {
						maxArea = area;
						bestQuad = candidate;
					}
				}
			}
		}
	}

	if (!bestQuad) return null;
	const ordered = orderQuadPoints(bestQuad);
	return isConvexQuad(ordered) ? ordered : null;
}

/**
 * Detects the 4 corners of a receipt in a grayscale image.
 * Uses adaptive multi-threshold Otsu binarization, boundary contouring, and maximal convex quadrilateral fitting.
 * Returns normalized Quad (coordinates in 0.0 to 1.0 range) or null if no valid document found.
 */
export function detectReceiptQuad(
	gray: Uint8Array,
	width: number,
	height: number,
	options: {
		minAreaFraction?: number;
		maxAreaFraction?: number;
		brightnessBias?: number;
	} = {}
): Quad | null {
	if (width < 30 || height < 30 || gray.length < width * height) return null;

	const minAreaFraction = options.minAreaFraction ?? 0.10;
	const maxAreaFraction = options.maxAreaFraction ?? 0.95;

	// Calculate base Otsu threshold on the downscaled frame
	const otsu = calculateOtsuThreshold(gray);
	const candidateThresholds = [
		otsu + (options.brightnessBias ?? 0),
		Math.max(35, otsu - 20),
		Math.min(235, otsu + 20)
	];

	const step = Math.max(2, Math.floor(Math.min(width, height) / 80));
	const totalArea = width * height;
	const invW = 1 / width;
	const invH = 1 / height;

	for (const threshold of candidateThresholds) {
		const edgePoints: Point[] = [];

		for (let y = step; y < height - step; y += step) {
			const row = y * width;
			for (let x = step; x < width - step; x += step) {
				const val = gray[row + x];
				if (val >= threshold) {
					// Check if near boundary (neighbor < threshold)
					const left = gray[row + x - step];
					const right = gray[row + x + step];
					const top = gray[(y - step) * width + x];
					const bottom = gray[(y + step) * width + x];

					if (left < threshold || right < threshold || top < threshold || bottom < threshold) {
						edgePoints.push({ x, y });
					}
				}
			}
		}

		if (edgePoints.length < 16) continue;

		// Compute Convex Hull of the paper edges
		const hull = convexHull(edgePoints);
		if (hull.length < 4) continue;

		// Select 4 maximal-area corners from the convex hull
		const bestQuad = findMaxAreaQuadFromHull(hull);
		if (!bestQuad) continue;

		const area = quadArea(bestQuad);
		const areaFraction = area / totalArea;

		if (areaFraction >= minAreaFraction && areaFraction <= maxAreaFraction) {
			// Found valid document quadrilateral
			return [
				{ x: bestQuad[0].x * invW, y: bestQuad[0].y * invH },
				{ x: bestQuad[1].x * invW, y: bestQuad[1].y * invH },
				{ x: bestQuad[2].x * invW, y: bestQuad[2].y * invH },
				{ x: bestQuad[3].x * invW, y: bestQuad[3].y * invH }
			];
		}
	}

	return null;
}

/**
 * Exponentially smooths a Quad across consecutive frames to prevent UI jitter.
 */
export function smoothQuad(current: Quad, prev: Quad | null, alpha = 0.35): Quad {
	if (!prev) return current;

	return [
		{ x: alpha * current[0].x + (1 - alpha) * prev[0].x, y: alpha * current[0].y + (1 - alpha) * prev[0].y },
		{ x: alpha * current[1].x + (1 - alpha) * prev[1].x, y: alpha * current[1].y + (1 - alpha) * prev[1].y },
		{ x: alpha * current[2].x + (1 - alpha) * prev[2].x, y: alpha * current[2].y + (1 - alpha) * prev[2].y },
		{ x: alpha * current[3].x + (1 - alpha) * prev[3].x, y: alpha * current[3].y + (1 - alpha) * prev[3].y }
	];
}

/**
 * Calculates the average displacement (movement) between two quads.
 */
export function quadMovement(q1: Quad, q2: Quad): number {
	let total = 0;
	for (let i = 0; i < 4; i++) {
		total += distance(q1[i], q2[i]);
	}
	return total / 4;
}

/**
 * Denormalizes a normalized [0..1] Quad to real pixel coordinates.
 */
export function denormalizeQuad(quad: Quad, width: number, height: number): Quad {
	return [
		{ x: quad[0].x * width, y: quad[0].y * height },
		{ x: quad[1].x * width, y: quad[1].y * height },
		{ x: quad[2].x * width, y: quad[2].y * height },
		{ x: quad[3].x * width, y: quad[3].y * height }
	];
}

/**
 * Dewarp an image or video source from an arbitrary Quad (normalized or pixel space)
 * into a rectangular HTMLCanvasElement.
 */
export function dewarpQuadCanvas(
	source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
	quad: Quad,
	isNormalized = true,
	maxDimension = 1600
): HTMLCanvasElement {
	let srcWidth = 0;
	let srcHeight = 0;

	if ('videoWidth' in source && source.videoWidth) {
		srcWidth = source.videoWidth;
		srcHeight = source.videoHeight;
	} else if ('naturalWidth' in source && source.naturalWidth) {
		srcWidth = source.naturalWidth;
		srcHeight = source.naturalHeight;
	} else if ('width' in source) {
		srcWidth = source.width;
		srcHeight = source.height;
	}

	if (!srcWidth || !srcHeight) {
		throw new Error('Invalid source dimensions for dewarping');
	}

	const pixelQuad: Quad = isNormalized ? denormalizeQuad(quad, srcWidth, srcHeight) : quad;
	const { width: targetWidth, height: targetHeight } = calculateUnwarpedDimensions(pixelQuad, maxDimension);

	// Get source RGBA data
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = srcWidth;
	tempCanvas.height = srcHeight;
	const tempCtx = tempCanvas.getContext('2d');
	if (!tempCtx) throw new Error('Could not create 2D canvas context');

	tempCtx.drawImage(source, 0, 0, srcWidth, srcHeight);
	const srcImageData = tempCtx.getImageData(0, 0, srcWidth, srcHeight);

	// Perform 4-point homography projective unwarp
	const unwarpedData = unwarpQuadRGBA(
		srcImageData.data,
		srcWidth,
		srcHeight,
		pixelQuad,
		targetWidth,
		targetHeight
	);

	// Create output canvas
	const outputCanvas = document.createElement('canvas');
	outputCanvas.width = targetWidth;
	outputCanvas.height = targetHeight;
	const outCtx = outputCanvas.getContext('2d');
	if (!outCtx) throw new Error('Could not create output canvas context');

	const outImageData = outCtx.createImageData(targetWidth, targetHeight);
	outImageData.data.set(unwarpedData);
	outCtx.putImageData(outImageData, 0, 0);

	return outputCanvas;
}

