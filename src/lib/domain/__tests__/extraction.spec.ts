import { describe, it, expect } from 'vitest';
import {
	cleanVendorName,
	normalizeDate,
	suggestCategory,
	sanitizeExtractedReceipt
} from '../extraction';

describe('Receipt AI Extraction & Category Matching Engine', () => {
	const sampleCategories = [
		{ id: 'cat-groceries', name: 'Groceries & Food' },
		{ id: 'cat-fuel', name: 'Fuel & Transport' },
		{ id: 'cat-dining', name: 'Dining & Entertainment' },
		{ id: 'cat-office', name: 'Office Supplies & Tech' },
		{ id: 'cat-software', name: 'Software & SaaS' },
		{ id: 'cat-general', name: 'General / Ad Hoc' }
	];

	describe('cleanVendorName', () => {
		it('strips tax invoice and receipt noise headers', () => {
			expect(cleanVendorName('TAX INVOICE: WOOLWORTHS')).toBe('Woolworths');
			expect(cleanVendorName('CASH SLIP - ENGEN QUICKSHOP')).toBe('Engen Quickshop');
			expect(cleanVendorName('WELCOME TO CHECKERS HYPER')).toBe('Checkers Hyper');
		});

		it('strips proprietary limited suffixes', () => {
			expect(cleanVendorName('PICK N PAY RETAILERS (PTY) LTD')).toBe('Pick N Pay Retailers');
			expect(cleanVendorName('SPUR STEAK RANCHES PTY LTD')).toBe('Spur Steak Ranches');
		});

		it('formats to clean title case', () => {
			expect(cleanVendorName('SHELL ULTRA CITY')).toBe('Shell Ultra City');
		});

		it('handles empty input gracefully', () => {
			expect(cleanVendorName('')).toBe('Unknown Vendor');
		});
	});

	describe('normalizeDate', () => {
		it('preserves valid past ISO dates', () => {
			expect(normalizeDate('2026-05-10')).toBe('2026-05-10');
		});

		it('converts DD/MM/YYYY dates to ISO', () => {
			expect(normalizeDate('14/02/2026')).toBe('2026-02-14');
			expect(normalizeDate('05-08-2025')).toBe('2025-08-05');
		});

		it('falls back to today if date is empty or invalid', () => {
			const result = normalizeDate('');
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});

	describe('suggestCategory', () => {
		it('suggests groceries for supermarket merchants', () => {
			expect(suggestCategory('Woolworths Food', sampleCategories)).toBe('cat-groceries');
			expect(suggestCategory('Checkers', sampleCategories)).toBe('cat-groceries');
			expect(suggestCategory('SuperSpar', sampleCategories)).toBe('cat-groceries');
		});

		it('suggests fuel for petrol station merchants', () => {
			expect(suggestCategory('Engen 1-Stop', sampleCategories)).toBe('cat-fuel');
			expect(suggestCategory('Shell Service Station', sampleCategories)).toBe('cat-fuel');
			expect(suggestCategory('Uber Trip', sampleCategories)).toBe('cat-fuel');
		});

		it('suggests dining for restaurant and cafe brands', () => {
			expect(suggestCategory("Nando's Sandton", sampleCategories)).toBe('cat-dining');
			expect(suggestCategory('Vida E Caffe', sampleCategories)).toBe('cat-dining');
			expect(suggestCategory('Seattle Coffee Co', sampleCategories)).toBe('cat-dining');
		});

		it('suggests software for digital vendors', () => {
			expect(suggestCategory('GitHub Inc', sampleCategories)).toBe('cat-software');
			expect(suggestCategory('Cloudflare', sampleCategories)).toBe('cat-software');
		});

		it('falls back to general category for unknown vendors', () => {
			expect(suggestCategory('Random Corner Stall', sampleCategories)).toBe('cat-general');
		});
	});

	describe('sanitizeExtractedReceipt', () => {
		it('parses structured JSON object from Workers AI', () => {
			const raw = {
				vendor: 'Woolworths Nicolway',
				amount: 452.8,
				date: '2026-06-12'
			};

			const result = sanitizeExtractedReceipt(raw, sampleCategories);
			expect(result.vendorName).toBe('Woolworths Nicolway');
			expect(result.amountCents).toBe(45280);
			expect(result.transactionDate).toBe('2026-06-12');
			expect(result.suggestedCategoryId).toBe('cat-groceries');
			expect(result.confidence).toBeGreaterThanOrEqual(0.9);
		});

		it('parses markdown-fenced JSON string', () => {
			const rawString = '```json\n{"vendor_name": "ENGEN QUICKSHOP", "total": "R 150,00", "date": "2026-05-01"}\n```';

			const result = sanitizeExtractedReceipt(rawString, sampleCategories);
			expect(result.vendorName).toBe('Engen Quickshop');
			expect(result.amountCents).toBe(15000);
			expect(result.transactionDate).toBe('2026-05-01');
			expect(result.suggestedCategoryId).toBe('cat-fuel');
		});

		it('handles malformed or empty payloads gracefully', () => {
			const result = sanitizeExtractedReceipt('invalid text', sampleCategories);
			expect(result.vendorName).toBe('Unknown Vendor');
			expect(result.amountCents).toBe(0);
			expect(result.confidence).toBeLessThan(0.7);
		});
	});
});
