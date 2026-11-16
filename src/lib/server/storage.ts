/**
 * Brickwork Cloudflare R2 Storage Management
 * Handles receipt vouchers upload, cryptographic layout, and lifecycle deletion
 * Authority: docs/ARCHITECTURE.md Section 4 & docs/SPECIFICATION.md AC-03 / AC-04
 */

export interface UploadReceiptParams {
	r2Bucket: R2Bucket;
	companyId: string;
	expenseId: string;
	imageBytes: ArrayBuffer | Uint8Array;
	mimeType?: string;
	variant?: 'original' | 'ocr';
}

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/webp', 'image/jpeg', 'image/jpg', 'image/png']);

/**
 * Uploads a receipt image to the private R2 bucket following standard hierarchical layout:
 * receipts/{company_id}/{year}/{month}/{expense_id}.webp (or -ocr.jpg)
 */
export async function uploadReceiptToR2({
	r2Bucket,
	companyId,
	expenseId,
	imageBytes,
	mimeType = 'image/webp',
	variant = 'original'
}: UploadReceiptParams): Promise<string> {
	const normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
	const safeMime = ALLOWED_IMAGE_MIME_TYPES.has(normalizedMime)
		? normalizedMime === 'image/jpg'
			? 'image/jpeg'
			: normalizedMime
		: 'image/webp';

	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');

	const extension =
		safeMime === 'image/png' ? 'png' : safeMime === 'image/jpeg' ? 'jpg' : 'webp';
	const suffix = variant === 'ocr' ? '-ocr' : '';
	const key = `receipts/${companyId}/${year}/${month}/${expenseId}${suffix}.${extension}`;

	await r2Bucket.put(key, imageBytes, {
		httpMetadata: {
			contentType: safeMime,
			cacheControl: 'private, max-age=31536000, immutable'
		}
	});

	return key;
}

/**
 * Deletes a receipt image from Cloudflare R2 atomically when an expense is deleted.
 */
export async function deleteReceiptFromR2(
	r2Bucket: R2Bucket,
	receiptKey: string
): Promise<void> {
	if (!receiptKey) return;
	await r2Bucket.delete(receiptKey);
}

/**
 * Deletes a batch of receipt keys from Cloudflare R2 (chunked to <= 1000 keys per call).
 */
export async function deleteReceiptsFromR2(
	r2Bucket: R2Bucket,
	receiptKeys: string[]
): Promise<void> {
	const cleanKeys = receiptKeys.filter((k) => Boolean(k));
	for (let i = 0; i < cleanKeys.length; i += 1000) {
		await r2Bucket.delete(cleanKeys.slice(i, i + 1000));
	}
}
