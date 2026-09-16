import { describe, it, expect } from 'vitest';
import {
	formatZAR,
	formatZARCompact,
	parseDecimalStringToCents,
	parseKeypadToCents,
	calculateBudgetPercentage,
	getBudgetStatus
} from '../currency';

describe('Currency Domain Engine', () => {
	describe('formatZAR', () => {
		it('formats zero cents correctly', () => {
			expect(formatZAR(0)).toBe('R 0.00');
		});

		it('formats standard amounts with two decimal places', () => {
			expect(formatZAR(34950)).toBe('R 349.50');
			expect(formatZAR(50)).toBe('R 0.50');
			expect(formatZAR(5)).toBe('R 0.05');
		});

		it('formats large thousands amounts with proper grouping', () => {
			expect(formatZAR(1250000)).toMatch(/R\s?12\s?500\.00/);
		});

		it('handles negative cents', () => {
			expect(formatZAR(-4500)).toBe('-R 45.00');
		});

		it('gracefully handles NaN or non-finite inputs', () => {
			expect(formatZAR(NaN)).toBe('R 0.00');
			expect(formatZAR(Infinity)).toBe('R 0.00');
		});
	});

	describe('formatZARCompact', () => {
		it('formats small amounts compactly', () => {
			expect(formatZARCompact(45000)).toBe('R 450');
		});

		it('formats thousands amounts with k suffix', () => {
			expect(formatZARCompact(1500000)).toBe('R 15k');
		});

		it('formats millions amounts with M suffix', () => {
			expect(formatZARCompact(250000000)).toBe('R 2.5M');
		});
	});

	describe('parseDecimalStringToCents', () => {
		it('converts clean decimal strings to integer cents without floating point errors', () => {
			expect(parseDecimalStringToCents('349.50')).toBe(34950);
			expect(parseDecimalStringToCents('12.99')).toBe(1299);
			expect(parseDecimalStringToCents('0.05')).toBe(5);
		});

		it('handles comma as decimal separator (South African standard)', () => {
			expect(parseDecimalStringToCents('450,75')).toBe(45075);
			expect(parseDecimalStringToCents('R 1 250,50')).toBe(125050);
		});

		it('handles integer rand strings without decimals', () => {
			expect(parseDecimalStringToCents('150')).toBe(15000);
			expect(parseDecimalStringToCents('R 200')).toBe(20000);
		});

		it('handles 1 decimal place properly (e.g. 12.5 -> 1250 cents)', () => {
			expect(parseDecimalStringToCents('12.5')).toBe(1250);
		});

		it('handles numeric input', () => {
			expect(parseDecimalStringToCents(349.5)).toBe(34950);
			expect(parseDecimalStringToCents(100)).toBe(10000);
		});

		it('handles empty or invalid strings gracefully', () => {
			expect(parseDecimalStringToCents('')).toBe(0);
			expect(parseDecimalStringToCents(null)).toBe(0);
			expect(parseDecimalStringToCents(undefined)).toBe(0);
			expect(parseDecimalStringToCents('invalid')).toBe(0);
		});
	});

	describe('parseKeypadToCents', () => {
		it('accumulates keystrokes as cents', () => {
			expect(parseKeypadToCents('1')).toBe(1);
			expect(parseKeypadToCents('15')).toBe(15);
			expect(parseKeypadToCents('150')).toBe(150);
			expect(parseKeypadToCents('1500')).toBe(1500);
			expect(parseKeypadToCents('15000')).toBe(15000); // R 150.00
		});

		it('strips non-digits', () => {
			expect(parseKeypadToCents('R 12.50')).toBe(1250);
		});
	});

	describe('calculateBudgetPercentage & getBudgetStatus', () => {
		it('calculates correct percentages', () => {
			expect(calculateBudgetPercentage(25000, 100000)).toBe(25);
			expect(calculateBudgetPercentage(80000, 100000)).toBe(80);
			expect(calculateBudgetPercentage(120000, 100000)).toBe(120);
			expect(calculateBudgetPercentage(0, 100000)).toBe(0);
			expect(calculateBudgetPercentage(5000, 0)).toBe(100);
		});

		it('returns correct status thresholds', () => {
			expect(getBudgetStatus(79000, 100000)).toBe('normal');
			expect(getBudgetStatus(80000, 100000)).toBe('warning');
			expect(getBudgetStatus(100000, 100000)).toBe('warning');
			expect(getBudgetStatus(100001, 100000)).toBe('exceeded');
			expect(getBudgetStatus(150000, 100000)).toBe('exceeded');
		});
	});
});
