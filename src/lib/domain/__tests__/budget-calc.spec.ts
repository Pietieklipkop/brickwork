import { describe, it, expect } from 'vitest';
import {
	formatZAR,
	formatZARCompact,
	parseDecimalStringToCents,
	calculateBudgetPercentage,
	getBudgetStatus,
	calculateBudgetStatus,
	centsToZar
} from '../currency';
import {
	getBillingCycleRange,
	calculateCycleWindow,
	isDateInCycle,
	formatSastIsoDate,
	formatDisplayDate
} from '../billing';

describe('Comprehensive Financial & Budget Arithmetic (Integer ZAR Cents)', () => {
	it('should format cents to South African Rand accurately', () => {
		expect(formatZAR(0)).toBe('R 0.00');
		expect(formatZAR(99)).toBe('R 0.99');
		expect(formatZAR(100)).toBe('R 1.00');
		expect(formatZAR(45280)).toBe('R 452.80');
		expect(formatZAR(100000000).replace(/\s+/g, ' ')).toBe('R 1 000 000.00');
	});

	it('should handle negative currency values cleanly', () => {
		expect(formatZAR(-5000)).toBe('-R 50.00');
		expect(formatZAR(-45280)).toBe('-R 452.80');
	});

	it('should provide consistent alias centsToZar', () => {
		expect(centsToZar(12500)).toBe(formatZAR(12500));
	});

	it('should produce compact human-readable display', () => {
		expect(formatZARCompact(45000)).toBe('R 450');
		expect(formatZARCompact(1500000)).toBe('R 15k');
		expect(formatZARCompact(250000000)).toBe('R 2.5M');
	});

	it('should accurately calculate budget status and thresholds', () => {
		// Normal (0 - 79%)
		const normal = calculateBudgetStatus(50000, 100000);
		expect(normal.percentage).toBe(50);
		expect(normal.status).toBe('normal');

		// Warning (80% - 100%)
		const warning = calculateBudgetStatus(85000, 100000);
		expect(warning.percentage).toBe(85);
		expect(warning.status).toBe('warning');

		// Exceeded (> 100%)
		const exceeded = calculateBudgetStatus(120000, 100000);
		expect(exceeded.percentage).toBe(120);
		expect(exceeded.status).toBe('exceeded');
	});

	it('should gracefully handle zero target without NaN or throwing', () => {
		const zeroTarget = calculateBudgetStatus(5000, 0);
		expect(zeroTarget.status).toBe('exceeded');
		expect(zeroTarget.percentage).toBe(100);

		const zeroBoth = calculateBudgetStatus(0, 0);
		expect(zeroBoth.status).toBe('normal');
		expect(zeroBoth.percentage).toBe(0);
	});
});

describe('Temporal SAST (UTC+2) Cycle Boundaries & Leap Years', () => {
	it('should compute exact 28-day cycle for leap years', () => {
		// 2028 is a leap year (Feb has 29 days)
		const refDate = new Date(Date.UTC(2028, 1, 15)); // 15 Feb 2028
		const cycle = getBillingCycleRange(15, refDate);
		expect(cycle.startDate).toBe('2028-02-15');
		expect(cycle.endDate).toBe('2028-03-14');
	});

	it('should compute exact cycle for non-leap year February', () => {
		// 2026 is non-leap (Feb has 28 days)
		const refDate = new Date(Date.UTC(2026, 1, 15)); // 15 Feb 2026
		const cycle = getBillingCycleRange(15, refDate);
		expect(cycle.startDate).toBe('2026-02-15');
		expect(cycle.endDate).toBe('2026-03-14');
	});

	it('should clamp user cycle start days to 1–28', () => {
		const clampHigh = getBillingCycleRange(31, new Date(Date.UTC(2026, 0, 10)));
		expect(clampHigh.startDate).toBe('2025-12-28');

		const clampLow = getBillingCycleRange(0, new Date(Date.UTC(2026, 0, 10)));
		expect(clampLow.startDate).toBe('2026-01-01');
	});

	it('should accurately determine if dates are inside cycle', () => {
		const range = { startDate: '2026-09-15', endDate: '2026-10-14' };
		expect(isDateInCycle('2026-09-15', range)).toBe(true);
		expect(isDateInCycle('2026-10-01', range)).toBe(true);
		expect(isDateInCycle('2026-10-14', range)).toBe(true);
		expect(isDateInCycle('2026-09-14', range)).toBe(false);
		expect(isDateInCycle('2026-10-15', range)).toBe(false);
	});
});
