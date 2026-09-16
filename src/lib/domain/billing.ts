/**
 * Brickwork Billing Cycle & Temporal Domain Engine (SAST UTC+2)
 * Authority: docs/DATABASE_SCHEMA.md Section 4 & docs/ENTERPRISE_SYSTEM_SPECIFICATION.md
 */

export interface DateRange {
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
}

export interface CycleWindow extends DateRange {
	label: string; // e.g., "25 Feb – 24 Mar 2026"
	startDay: number;
	daysTotal: number;
	daysElapsed: number;
	daysRemaining: number;
	percentElapsed: number;
}

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

/**
 * Returns current date/time converted to SAST (UTC+2) Date object
 */
export function getSastDate(refDate: Date = new Date()): Date {
	return new Date(refDate.getTime() + SAST_OFFSET_MS);
}

/**
 * Formats a Date object to YYYY-MM-DD string in SAST
 */
export function formatSastIsoDate(date: Date = new Date()): string {
	const sast = getSastDate(date);
	const year = sast.getUTCFullYear();
	const month = String(sast.getUTCMonth() + 1).padStart(2, '0');
	const day = String(sast.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO date string into a friendly localized display.
 * Example: "2026-09-16" -> "16 Sep 2026"
 */
export function formatDisplayDate(isoDate: string): string {
	if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
		return isoDate || '';
	}
	const [year, month, day] = isoDate.split('-').map(Number);
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	return `${day} ${months[month - 1]} ${year}`;
}

/**
 * Computes active billing cycle boundaries in SAST (UTC+2).
 * @param startDay Day of the month cycle starts (clamped 1-28)
 * @param refDate Reference date (defaults to current time)
 */
export function getBillingCycleRange(startDay: number, refDate: Date = new Date()): DateRange {
	// Clamp startDay to 1..28 to guarantee consistency across February & leap years
	const clampedStartDay = Math.min(Math.max(Math.floor(startDay || 1), 1), 28);

	const sastNow = getSastDate(refDate);
	const currentYear = sastNow.getUTCFullYear();
	const currentMonth = sastNow.getUTCMonth(); // 0 = Jan, 11 = Dec
	const currentDay = sastNow.getUTCDate();

	let startYear: number;
	let startMonth: number;

	if (currentDay >= clampedStartDay) {
		// Current cycle began this calendar month
		startYear = currentYear;
		startMonth = currentMonth;
	} else {
		// Current cycle began in previous calendar month
		if (currentMonth === 0) {
			startYear = currentYear - 1;
			startMonth = 11;
		} else {
			startYear = currentYear;
			startMonth = currentMonth - 1;
		}
	}

	// Cycle start in UTC coordinates representing SAST calendar date
	const cycleStart = new Date(Date.UTC(startYear, startMonth, clampedStartDay));

	// Cycle end: 1 month later minus 1 day
	let endYear = startYear;
	let endMonth = startMonth + 1;
	if (endMonth > 11) {
		endYear += 1;
		endMonth = 0;
	}
	const nextCycleStart = new Date(Date.UTC(endYear, endMonth, clampedStartDay));
	const cycleEnd = new Date(nextCycleStart.getTime() - 24 * 60 * 60 * 1000);

	const formatIso = (d: Date) => d.toISOString().split('T')[0];

	return {
		startDate: formatIso(cycleStart),
		endDate: formatIso(cycleEnd)
	};
}

/**
 * Computes full detailed cycle window metrics including days remaining and progress percentage.
 */
export function calculateCycleWindow(startDay: number, refDate: Date = new Date()): CycleWindow {
	const range = getBillingCycleRange(startDay, refDate);
	const clampedStartDay = Math.min(Math.max(Math.floor(startDay || 1), 1), 28);

	const currentDateIso = formatSastIsoDate(refDate);
	const startUtc = new Date(`${range.startDate}T00:00:00Z`).getTime();
	const endUtc = new Date(`${range.endDate}T00:00:00Z`).getTime();
	const todayUtc = new Date(`${currentDateIso}T00:00:00Z`).getTime();

	const oneDayMs = 24 * 60 * 60 * 1000;
	const daysTotal = Math.round((endUtc - startUtc) / oneDayMs) + 1;

	// Elapsed days from start (inclusive of today)
	const diffStart = Math.max(0, todayUtc - startUtc);
	const daysElapsed = Math.min(daysTotal, Math.floor(diffStart / oneDayMs) + 1);
	const daysRemaining = Math.max(0, daysTotal - daysElapsed);

	const percentElapsed = Math.min(100, Math.max(0, Math.round((daysElapsed / daysTotal) * 100)));

	// Friendly label: e.g. "25 Feb – 24 Mar 2026"
	const startDisplay = formatDisplayDate(range.startDate);
	const endDisplay = formatDisplayDate(range.endDate);
	const label = `${startDisplay} – ${endDisplay}`;

	return {
		...range,
		label,
		startDay: clampedStartDay,
		daysTotal,
		daysElapsed,
		daysRemaining,
		percentElapsed
	};
}

/**
 * Checks whether a given ISO date (YYYY-MM-DD) falls within the cycle range (inclusive).
 */
export function isDateInCycle(dateIso: string, range: DateRange): boolean {
	if (!dateIso || !range.startDate || !range.endDate) return false;
	return dateIso >= range.startDate && dateIso <= range.endDate;
}
