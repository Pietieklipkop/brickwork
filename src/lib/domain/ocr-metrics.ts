/**
 * Brickwork Receipt AI Extraction Accuracy & Audit Metrics Engine
 * Authority: docs/SPECIFICATION.md AC-23 & docs/ARCHITECTURE.md Section 3.3
 */

export type OcrAccuracyStatus = 'full_success' | 'partial_fail' | 'total_fail';

export interface ExtractedValues {
	vendorName?: string | null;
	amountCents?: number | null;
	transactionDate?: string | null;
	suggestedCategoryId?: string | null;
	rawJson?: string | null;
}

export interface FinalSavedValues {
	vendorName: string;
	amountCents: number;
	transactionDate: string;
	categoryId: string;
}

export interface OcrFieldComparison {
	vendorChanged: boolean;
	amountChanged: boolean;
	dateChanged: boolean;
	categoryChanged: boolean;
	fieldsChangedCount: number;
	totalFieldsCount: 4;
	status: OcrAccuracyStatus;
}

export interface OcrAccuracyRecord {
	id: string;
	expenseId?: string | null;
	companyId: string;
	userId: string;
	status: OcrAccuracyStatus;
	fieldsChangedCount: number;
	vendorExtracted?: string | null;
	vendorFinal: string;
	vendorChanged: boolean;
	amountExtractedCents?: number | null;
	amountFinalCents: number;
	amountChanged: boolean;
	dateExtracted?: string | null;
	dateFinal: string;
	dateChanged: boolean;
	categoryExtractedId?: string | null;
	categoryFinalId: string;
	categoryChanged: boolean;
	rawOcrPayload?: string | null;
	createdAt: Date | number;
}

export interface OcrAccuracySummary {
	totalScans: number;
	fullSuccessCount: number;
	fullSuccessRate: number; // 0 to 100
	partialFailCount: number;
	partialFailRate: number; // 0 to 100
	totalFailCount: number;
	totalFailRate: number; // 0 to 100
	vendorAccuracyRate: number; // 0 to 100
	amountAccuracyRate: number; // 0 to 100
	dateAccuracyRate: number; // 0 to 100
	categoryAccuracyRate: number; // 0 to 100
}

/**
 * Normalizes vendor strings for semantic equality comparison
 */
function normalizeVendor(v: string | null | undefined): string {
	return (v || '')
		.toLowerCase()
		.replace(/[^\w\s]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Evaluates whether the user modified AI-extracted receipt fields before persisting.
 * - 0 fields changed: "full_success" (Accurate)
 * - 1 to 3 fields changed: "partial_fail" (Partially Modified)
 * - All 4 fields changed: "total_fail" (Total Fail)
 */
export function compareOcrExtraction(
	extracted: ExtractedValues,
	finalData: FinalSavedValues
): OcrFieldComparison {
	const normExtractedVendor = normalizeVendor(extracted.vendorName);
	const normFinalVendor = normalizeVendor(finalData.vendorName);

	// Vendor is considered changed if extracted was missing, unknown, or differs from final
	const isVendorUnknown = !normExtractedVendor || normExtractedVendor === 'unknown vendor' || normExtractedVendor === 'unknown';
	const vendorChanged = isVendorUnknown || normExtractedVendor !== normFinalVendor;

	// Amount is considered changed if extracted was 0 or differs from final
	const extAmount = extracted.amountCents ?? 0;
	const amountChanged = extAmount <= 0 || extAmount !== finalData.amountCents;

	// Date comparison (ISO YYYY-MM-DD)
	const extDate = (extracted.transactionDate || '').trim();
	const finalDate = (finalData.transactionDate || '').trim();
	const dateChanged = !extDate || extDate !== finalDate;

	// Category comparison
	const extCat = (extracted.suggestedCategoryId || '').trim();
	const finalCat = (finalData.categoryId || '').trim();
	const categoryChanged = !extCat || extCat !== finalCat;

	let fieldsChangedCount = 0;
	if (vendorChanged) fieldsChangedCount++;
	if (amountChanged) fieldsChangedCount++;
	if (dateChanged) fieldsChangedCount++;
	if (categoryChanged) fieldsChangedCount++;

	let status: OcrAccuracyStatus = 'full_success';
	if (fieldsChangedCount === 4) {
		status = 'total_fail';
	} else if (fieldsChangedCount > 0) {
		status = 'partial_fail';
	}

	return {
		vendorChanged,
		amountChanged,
		dateChanged,
		categoryChanged,
		fieldsChangedCount,
		totalFieldsCount: 4,
		status
	};
}

/**
 * Computes aggregated accuracy statistics across an array of accuracy log records.
 */
export function calculateOcrSummaryStats(
	records: Array<{
		status: string;
		vendorChanged: boolean | number;
		amountChanged: boolean | number;
		dateChanged: boolean | number;
		categoryChanged: boolean | number;
	}>
): OcrAccuracySummary {
	const total = records.length;
	if (total === 0) {
		return {
			totalScans: 0,
			fullSuccessCount: 0,
			fullSuccessRate: 0,
			partialFailCount: 0,
			partialFailRate: 0,
			totalFailCount: 0,
			totalFailRate: 0,
			vendorAccuracyRate: 0,
			amountAccuracyRate: 0,
			dateAccuracyRate: 0,
			categoryAccuracyRate: 0
		};
	}

	let fullSuccess = 0;
	let partialFail = 0;
	let totalFail = 0;

	let vendorCorrect = 0;
	let amountCorrect = 0;
	let dateCorrect = 0;
	let categoryCorrect = 0;

	for (const r of records) {
		if (r.status === 'full_success') fullSuccess++;
		else if (r.status === 'total_fail') totalFail++;
		else partialFail++;

		if (!r.vendorChanged) vendorCorrect++;
		if (!r.amountChanged) amountCorrect++;
		if (!r.dateChanged) dateCorrect++;
		if (!r.categoryChanged) categoryCorrect++;
	}

	return {
		totalScans: total,
		fullSuccessCount: fullSuccess,
		fullSuccessRate: Math.round((fullSuccess / total) * 100),
		partialFailCount: partialFail,
		partialFailRate: Math.round((partialFail / total) * 100),
		totalFailCount: totalFail,
		totalFailRate: Math.round((totalFail / total) * 100),
		vendorAccuracyRate: Math.round((vendorCorrect / total) * 100),
		amountAccuracyRate: Math.round((amountCorrect / total) * 100),
		dateAccuracyRate: Math.round((dateCorrect / total) * 100),
		categoryAccuracyRate: Math.round((categoryCorrect / total) * 100)
	};
}
