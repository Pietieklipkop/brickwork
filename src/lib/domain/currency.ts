/**
 * Brickwork Currency & Financial Arithmetic Engine
 * Enforces Zero Floating-Point Financial Mathematics (Integer ZAR Cents)
 * Authority: docs/ENTERPRISE_SYSTEM_SPECIFICATION.md Section 4.3
 */

/**
 * Formats integer cents into South African Rand currency display.
 * Example: 34950 -> "R 349.50"
 */
export function formatZAR(cents: number): string {
	if (!Number.isFinite(cents) || isNaN(cents)) {
		return 'R 0.00';
	}
	const isNegative = cents < 0;
	const absoluteCents = Math.abs(Math.round(cents));
	const rands = Math.floor(absoluteCents / 100);
	const remainderCents = absoluteCents % 100;

	// Format rands with standard space or comma thousand separator
	const formattedRands = new Intl.NumberFormat('en-ZA', {
		useGrouping: true
	}).format(rands);

	const formattedCents = remainderCents.toString().padStart(2, '0');
	const sign = isNegative ? '-' : '';

	return `${sign}R ${formattedRands}.${formattedCents}`;
}

/**
 * Formats integer cents into a compact human-readable format for cards/dashboards.
 * Example: 1540000 -> "R 15.4k", 45000 -> "R 450"
 */
export function formatZARCompact(cents: number): string {
	const rands = Math.round(cents / 100);
	if (Math.abs(rands) >= 1_000_000) {
		return `R ${(rands / 1_000_000).toFixed(1)}M`;
	}
	if (Math.abs(rands) >= 10_000) {
		return `R ${(rands / 1_000).toFixed(0)}k`;
	}
	return formatZAR(cents).replace(/\.00$/, '');
}

/**
 * Converts a decimal monetary string (e.g. from OCR or text input "349.50", "R 349,50")
 * into exact integer cents without floating-point precision loss.
 */
export function parseDecimalStringToCents(input: string | number | null | undefined): number {
	if (input === null || input === undefined) return 0;
	if (typeof input === 'number') {
		if (!Number.isFinite(input) || isNaN(input)) return 0;
		return Math.round(input * 100);
	}

	const cleaned = input.trim().replace(/^R\s?/, '').replace(/\s+/g, '');
	if (!cleaned) return 0;

	const isNegative = cleaned.startsWith('-');
	const positiveStr = isNegative ? cleaned.slice(1) : cleaned;

	// Normalize comma decimal separator to dot
	const normalized = positiveStr.replace(',', '.');

	if (!normalized.includes('.')) {
		const randsOnly = parseInt(normalized.replace(/[^\d]/g, ''), 10);
		if (isNaN(randsOnly)) return 0;
		const totalCents = randsOnly * 100;
		return isNegative ? -totalCents : totalCents;
	}

	const parts = normalized.split('.');
	const randsPart = parseInt(parts[0].replace(/[^\d]/g, '') || '0', 10);
	const centsPartStr = (parts[1] || '').replace(/[^\d]/g, '');

	// Ensure 2-digit cents precision (e.g. "5" -> 50, "50" -> 50, "505" -> 51)
	let centsPart = 0;
	if (centsPartStr.length === 0) {
		centsPart = 0;
	} else if (centsPartStr.length === 1) {
		centsPart = parseInt(centsPartStr, 10) * 10;
	} else if (centsPartStr.length === 2) {
		centsPart = parseInt(centsPartStr, 10);
	} else {
		// Round sub-cent fractional digits
		centsPart = Math.round(parseInt(centsPartStr.slice(0, 3), 10) / 10);
	}

	const totalCents = randsPart * 100 + centsPart;
	return isNegative ? -totalCents : totalCents;
}

/**
 * Keypad accumulator parser: converts raw keystrokes to cents.
 * e.g. typing "3" -> 3 cents (R 0.03)
 * typing "34" -> 34 cents (R 0.34)
 * typing "349" -> 349 cents (R 3.49)
 * typing "34950" -> 34950 cents (R 349.50)
 */
export function parseKeypadToCents(rawDigits: string): number {
	const clean = rawDigits.replace(/[^\d]/g, '');
	if (!clean) return 0;
	return parseInt(clean, 10);
}

/**
 * Calculates budget percentage (spent vs target).
 * Returns integer 0..100+
 */
export function calculateBudgetPercentage(spentCents: number, targetCents: number): number {
	if (targetCents <= 0) return spentCents > 0 ? 100 : 0;
	if (spentCents <= 0) return 0;
	return Math.round((spentCents / targetCents) * 100);
}

export type BudgetStatus = 'normal' | 'warning' | 'exceeded';

/**
 * Evaluates budget threshold status:
 * - normal: <= 80%
 * - warning: > 80% and <= 100%
 * - exceeded: > 100%
 */
export function getBudgetStatus(spentCents: number, targetCents: number): BudgetStatus {
	if (targetCents <= 0) return spentCents > 0 ? 'exceeded' : 'normal';
	const percentage = (spentCents / targetCents) * 100;
	if (percentage > 100) return 'exceeded';
	if (percentage >= 80) return 'warning';
	return 'normal';
}

/**
 * Convenience alias for formatZAR
 */
export const centsToZar = formatZAR;

/**
 * Calculates budget status and percentage together
 */
export function calculateBudgetStatus(
	spentCents: number,
	targetCents: number
): { percentage: number; status: BudgetStatus } {
	return {
		percentage: calculateBudgetPercentage(spentCents, targetCents),
		status: getBudgetStatus(spentCents, targetCents)
	};
}
