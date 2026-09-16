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
}

/**
 * Uploads a receipt image to the private R2 bucket following standard hierarchical layout:
 * receipts/{company_id}/{year}/{month}/{expense_id}.webp
 */
export async function uploadReceiptToR2({
	r2Bucket,
	companyId,
	expenseId,
	imageBytes,
	mimeType = 'image/webp'
}: UploadReceiptParams): Promise<string> {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');

	const extension = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'webp';
	const key = `receipts/${companyId}/${year}/${month}/${expenseId}.${extension}`;

	await r2Bucket.put(key, imageBytes, {
		httpMetadata: {
			contentType: mimeType,
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
	try {
		await r2Bucket.delete(receiptKey);
	} catch (err) {
		console.error(`Failed to delete R2 receipt with key ${receiptKey}:`, err);
	}
}
