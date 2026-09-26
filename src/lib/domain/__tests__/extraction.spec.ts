import { describe, it, expect } from 'vitest';
import {
	cleanVendorName,
	normalizeDate,
	suggestCategory,
	sanitizeExtractedReceipt,
	buildExtractionPrompt
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

		it('parses conversational markdown without JSON fences (production real-world case)', () => {
			const rawMarkdown = `
Here is the extracted information from the receipt:

**Vendor Name:** Lynnpark Food Hall
**Amount:** 158.39
**Transaction Date:** 2019-09-26
**Suggested Category:** Groceries & Food
**Payment Method:** Credit Card
**Card Number:** **** **** **** 5851
`.trim();

			const sampleAccounts = [
				{ id: 'acc-fnb', name: 'FNB Business Cheque', cardNumber: '1234' },
				{ id: 'acc-credit', name: 'Primary Credit Card', cardNumber: '5851' }
			];

			const result = sanitizeExtractedReceipt(rawMarkdown, sampleCategories, sampleAccounts);
			expect(result.vendorName).toBe('Lynnpark Food Hall');
			expect(result.amountCents).toBe(15839);
			expect(result.transactionDate).toBe('2019-09-26');
			expect(result.suggestedCategoryId).toBe('cat-groceries');
			expect(result.detectedCardDigits).toContain('5851');
			expect(result.suggestedAccountId).toBe('acc-credit');
			expect(result.confidence).toBeGreaterThanOrEqual(0.9);
		});

		it('parses real Crave and Co slip markdown uploaded by user', () => {
			const craveRaw =
				'**Vendor Name:** Crave and Co\n**Amount:** 35.00\n**Transaction Date:** 2026-09-25\n**Suggested Category:** General Groceries';
			const result = sanitizeExtractedReceipt(craveRaw, sampleCategories);
			expect(result.vendorName).toBe('Crave And Co');
			expect(result.amountCents).toBe(3500);
			expect(result.transactionDate).toBe('2026-09-25');
			expect(result.suggestedCategoryId).toBe('cat-groceries');
			expect(result.confidence).toBeGreaterThanOrEqual(0.9);
		});

		it('auto-matches card by long card number last 4 digits (e.g. Checkers slip)', () => {
			const rawJson = {
				vendor_name: 'Checkers',
				amount: 384.97,
				transaction_date: '2026-03-10',
				payment_method: 'Electronic Payment',
				card_digits: '9710084035851357'
			};

			const sampleAccounts = [
				{ id: 'acc-capitec', name: 'Capitec Savings', cardNumber: '9999' },
				{ id: 'acc-checkers-card', name: 'Stefan Cheque Card', cardNumber: '1357' }
			];

			const result = sanitizeExtractedReceipt(rawJson, sampleCategories, sampleAccounts);
			expect(result.vendorName).toBe('Checkers');
			expect(result.amountCents).toBe(38497);
			expect(result.suggestedAccountId).toBe('acc-checkers-card');
		});

		it('falls back to brand/name matching when card digits are absent', () => {
			const rawJson = {
				vendor_name: 'Woolworths',
				amount: 220.0,
				transaction_date: '2026-03-10',
				payment_method: 'Mastercard Credit'
			};

			const sampleAccounts = [
				{ id: 'acc-fnb-debit', name: 'FNB Debit' },
				{ id: 'acc-mc-credit', name: 'Mastercard Credit Card' }
			];

			const result = sanitizeExtractedReceipt(rawJson, sampleCategories, sampleAccounts);
			expect(result.suggestedAccountId).toBe('acc-mc-credit');
		});
	});

	describe('buildExtractionPrompt', () => {
		it('injects user categories and payment card instructions into the prompt', () => {
			const prompt = buildExtractionPrompt(['Groceries & Food', 'Office Tech', 'Fuel']);
			expect(prompt).toContain('Choose the closest matching category from this list: "Groceries & Food", "Office Tech", "Fuel"');
			expect(prompt).toContain('TOTAL DUE');
			expect(prompt).toContain('ELECTRONIC PAYMENT');
			expect(prompt).toContain('card_digits');
			expect(prompt).toContain('payment_method');
			expect(prompt).toContain('Pick n Pay, Checkers, Woolworths');
		});

		it('provides fallback category advice when category list is empty', () => {
			const prompt = buildExtractionPrompt([]);
			expect(prompt).toContain('Assign an appropriate spending category');
			expect(prompt).toContain('TOTAL DUE');
			expect(prompt).toContain('card_digits');
		});
	});
});
