import { describe, it, expect } from 'vitest';
import {
	getBillingCycleRange,
	calculateCycleWindow,
	isDateInCycle,
	formatDisplayDate
} from '../billing';

describe('Billing Cycle & SAST Temporal Engine', () => {
	describe('getBillingCycleRange', () => {
		it('calculates calendar month cycle when startDay is 1', () => {
			// Ref date: 15 March 2026
			const refDate = new Date('2026-03-15T12:00:00Z');
			const range = getBillingCycleRange(1, refDate);
			expect(range.startDate).toBe('2026-03-01');
			expect(range.endDate).toBe('2026-03-31');
		});

		it('calculates cycle when current day is past startDay (mid-cycle)', () => {
			// Ref date: 26 March 2026, cycle starts on 25th
			const refDate = new Date('2026-03-26T12:00:00Z');
			const range = getBillingCycleRange(25, refDate);
			expect(range.startDate).toBe('2026-03-25');
			expect(range.endDate).toBe('2026-04-24');
		});

		it('calculates cycle when current day is before startDay (started in previous month)', () => {
			// Ref date: 10 March 2026, cycle starts on 25th
			const refDate = new Date('2026-03-10T12:00:00Z');
			const range = getBillingCycleRange(25, refDate);
			expect(range.startDate).toBe('2026-02-25');
			expect(range.endDate).toBe('2026-03-24');
		});

		it('handles year boundary rollover (January date with December start)', () => {
			// Ref date: 5 January 2026, cycle starts on 20th
			const refDate = new Date('2026-01-05T12:00:00Z');
			const range = getBillingCycleRange(20, refDate);
			expect(range.startDate).toBe('2025-12-20');
			expect(range.endDate).toBe('2026-01-19');
		});

		it('handles year boundary rollover (December date with startDay on 25th)', () => {
			// Ref date: 28 December 2025, cycle starts on 25th
			const refDate = new Date('2025-12-28T12:00:00Z');
			const range = getBillingCycleRange(25, refDate);
			expect(range.startDate).toBe('2025-12-25');
			expect(range.endDate).toBe('2026-01-24');
		});

		it('clamps startDay to 1..28 range', () => {
			const refDate = new Date('2026-03-15T12:00:00Z');
			const clampedHigh = getBillingCycleRange(31, refDate);
			expect(clampedHigh.startDate).toBe('2026-02-28'); // day 28 in Feb
			expect(clampedHigh.endDate).toBe('2026-03-27');

			const clampedLow = getBillingCycleRange(0, refDate);
			expect(clampedLow.startDate).toBe('2026-03-01');
		});
	});

	describe('calculateCycleWindow', () => {
		it('provides detailed window metrics and formatted label', () => {
			const refDate = new Date('2026-03-15T12:00:00Z');
			const window = calculateCycleWindow(1, refDate);

			expect(window.startDate).toBe('2026-03-01');
			expect(window.endDate).toBe('2026-03-31');
			expect(window.label).toBe('1 Mar 2026 – 31 Mar 2026');
			expect(window.daysTotal).toBe(31);
			expect(window.daysElapsed).toBe(15);
			expect(window.daysRemaining).toBe(16);
			expect(window.percentElapsed).toBe(48);
		});
	});

	describe('isDateInCycle', () => {
		const range = { startDate: '2026-02-25', endDate: '2026-03-24' };

		it('returns true for dates within cycle boundaries', () => {
			expect(isDateInCycle('2026-02-25', range)).toBe(true);
			expect(isDateInCycle('2026-03-01', range)).toBe(true);
			expect(isDateInCycle('2026-03-24', range)).toBe(true);
		});

		it('returns false for dates outside boundaries', () => {
			expect(isDateInCycle('2026-02-24', range)).toBe(false);
			expect(isDateInCycle('2026-03-25', range)).toBe(false);
			expect(isDateInCycle('2025-12-31', range)).toBe(false);
		});
	});

	describe('formatDisplayDate', () => {
		it('formats ISO dates nicely', () => {
			expect(formatDisplayDate('2026-09-16')).toBe('16 Sep 2026');
			expect(formatDisplayDate('2026-01-01')).toBe('1 Jan 2026');
		});
	});
});
