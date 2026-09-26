/**
 * Brickwork Receipt AI Extraction & Category Matching Engine
 * Cleans Workers AI OCR payloads and provides category heuristics
 * Authority: docs/ARCHITECTURE.md Section 3 & docs/SPECIFICATION.md Section 3.1
 */

import { parseDecimalStringToCents } from './currency';
import { formatSastIsoDate } from './billing';

export interface ExtractedReceiptData {
	vendorName: string;
	amountCents: number;
	transactionDate: string; // YYYY-MM-DD
	suggestedCategoryId: string | null;
	suggestedAccountId?: string | null;
	detectedCardDigits?: string | null;
	paymentMethod?: string | null;
	confidence: number; // 0.0 to 1.0
	rawJson?: string;
}

export interface CategoryOption {
	id: string;
	name: string;
}

export interface PaymentAccountOption {
	id: string;
	name: string;
	cardNumber?: string | null;
	isDefault?: boolean;
}

/**
 * Generates an optimized, domain-specific prompt for South African receipt extraction
 * with dynamic category injection and till slip disambiguation rules.
 */
export function buildExtractionPrompt(categoryNames: string[] = []): string {
	const todayDate = formatSastIsoDate();
	const currentYear = todayDate.split('-')[0];

	const categoryDirective =
		categoryNames.length > 0
			? `Choose the closest matching category from this list: ${categoryNames.map((c) => `"${c}"`).join(', ')}.`
			: `Assign an appropriate spending category (e.g. "Groceries", "Fuel & Transport", "Dining & Entertainment", "Office Supplies & Tech", "Utilities & Home").`;

	return `
You are an expert financial OCR receipt parser specializing in South African till slips (e.g. Pick n Pay, Checkers, Woolworths, Spar, Engen, Shell, Total, Spur, Makro, Clicks, Dis-Chem, McDonald's, Crave).
Today's date is ${todayDate} (Year ${currentYear}).
Analyze this receipt image and extract the following:
1. "vendor_name": The clean merchant name in title case (e.g. "Woolworths", "Checkers Hyper", "Engen Quickshop", "Crave And Co", "McDonald's South Africa"). Strip prefixes/suffixes like "TAX INVOICE", "CASH SLIP", "WELCOME TO", "(Pty) Ltd", "PTY LTD", "CC".
2. "amount": The final grand total paid in South African Rand (ZAR) as a decimal number (e.g. 35.00, 119.90).
   - CRITICAL: Distinguish the grand total from the subtotal, 15% VAT breakdown, cash tendered, change, and promotional savings.
   - Look for the primary final total line, labeled "TOTAL DUE", "BALANCE DUE", "TOTAL", "AMOUNT DUE", "CARD SALE", "ELECTRONIC PAYMENT", "CASHLESS", "MASTERCARD", "VISA", or the bottom-most grand total.
   - Double check dot-matrix thermal digits carefully: distinguish 9 from 5, 8 from 0, 3 from 8, 1 from 7.
3. "transaction_date": The transaction date in YYYY-MM-DD format. Look for dates in DD/MM/YYYY, DD-MM-YYYY, or Mon DD, YYYY format near the receipt header or register info. Note: The current year is ${currentYear} (verify 2026 vs 2020).
4. "suggested_category": ${categoryDirective}
5. "payment_method": Payment type used if visible, e.g. "Credit Card", "Debit Card", "Visa Credit", "Mastercard", "Cash", "EFT", or null.
6. "card_digits": Any payment card number or last 4 digits visible on the slip (e.g. "0855", "5851", "1357", "9710084035851357", or masked digits like "**** 0855"), or null if cash or not shown.

Output valid JSON only with keys: vendor_name, amount, transaction_date, suggested_category, payment_method, card_digits.
Example JSON:
{"vendor_name": "Crave And Co", "amount": 35.00, "transaction_date": "${todayDate}", "suggested_category": "Dining & Entertainment", "payment_method": "Visa Credit", "card_digits": "0855"}
`.trim();
}

/**
 * Standard South African merchant keywords mapped to category name patterns
 */
const VENDOR_CATEGORY_KEYWORDS: Record<string, string[]> = {
	'groceries|food|market': [
		'woolworths',
		'checkers',
		'pick n pay',
		'pnp',
		'spar',
		'superspar',
		'food lovers',
		'shoprite',
		'usave',
		'boxer'
	],
	'fuel|transport|travel|petrol': [
		'engen',
		'shell',
		'bp',
		'sasol',
		'total',
		'totalenergies',
		'caltex',
		'astron',
		'uber',
		'bolt',
		'gautrain',
		'airlink',
		'safair'
	],
	'dining|restaurant|entertainment|coffee|takeaway': [
		'spur',
		'nando',
		'nandos',
		'vida e caffe',
		'vida',
		'seattle coffee',
		'starbucks',
		'mcdonald',
		'mcdonalds',
		'kfc',
		'steers',
		'debonairs',
		'wimpy',
		'roco mamas',
		'ocean basket',
		'mug & bean',
		'mugg & bean',
		'doppio zero',
		'col\'cacchio',
		'primi'
	],
	'office|supplies|hardware|stationery': [
		'makro',
		'takealot',
		'game',
		'incredible connection',
		'waltons',
		'officebox',
		'leroy merlin',
		'builders warehouse',
		'builders express',
		'chamberlains',
		'hardware'
	],
	'utilities|telecom|home|internet': [
		'vodacom',
		'mtn',
		'telkom',
		'cell c',
		'rain',
		'afrihost',
		'webafrica',
		'cool ideas',
		'eskom',
		'city of',
		'municipality'
	],
	'software|hosting|technology|saas': [
		'github',
		'cloudflare',
		'google',
		'microsoft',
		'aws',
		'adobe',
		'openai',
		'anthropic',
		'jetbrains',
		'cursor',
		'apple'
	]
};

/**
 * Normalizes vendor names by removing noise, legal prefixes/suffixes, and invoice headers
 */
export function cleanVendorName(raw: string): string {
	if (!raw) return 'Unknown Vendor';

	let name = raw.trim();

	// Remove common South African till slip noise headers
	const noiseHeaders = [
		/^TAX\s+INVOICE\s*[:\-]?\s*/i,
		/^CASH\s+SLIP\s*[:\-]?\s*/i,
		/^RECEIPT\s*[:\-]?\s*/i,
		/^WELCOME\s+TO\s+/i,
		/^THANK\s+YOU\s+FOR\s+SHOPPING\s+AT\s+/i
	];

	for (const pattern of noiseHeaders) {
		name = name.replace(pattern, '');
	}

	// Remove legal entities and suffixes (e.g. (Pty) Ltd, PTY LTD, CC, Ltd)
	name = name
		.replace(/[\(\[\{]/g, ' ')
		.replace(/[\)\]\}]/g, ' ')
		.replace(/\s+(pty\s*ltd|pyl\s*ltd|proprietary\s*limited|ltd|cc)\b.*$/i, '')
		.replace(/[^\w\s&'\-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (!name) return 'Unknown Vendor';

	// Title case formatting
	return name
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

/**
 * Validates and normalizes date strings to ISO YYYY-MM-DD
 */
export function normalizeDate(dateStr: string | null | undefined): string {
	const today = formatSastIsoDate();
	if (!dateStr) return today;

	const trimmed = dateStr.trim();

	// Check standard YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		// Prevent future dates beyond today
		return trimmed > today ? today : trimmed;
	}

	// Try DD/MM/YYYY or DD-MM-YYYY
	const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
	if (dmyMatch) {
		const day = dmyMatch[1].padStart(2, '0');
		const month = dmyMatch[2].padStart(2, '0');
		const year = dmyMatch[3];
		const parsedIso = `${year}-${month}-${day}`;
		return parsedIso > today ? today : parsedIso;
	}

	// Attempt standard Date parse
	const timestamp = Date.parse(trimmed);
	if (!isNaN(timestamp)) {
		const parsed = new Date(timestamp);
		const parsedIso = parsed.toISOString().split('T')[0];
		return parsedIso > today ? today : parsedIso;
	}

	return today;
}

/**
 * Matches a vendor name against available user categories using fuzzy keyword heuristics
 */
export function suggestCategory(vendorName: string, categories: CategoryOption[]): string | null {
	if (!categories || categories.length === 0 || !vendorName) return null;

	const lowerVendor = vendorName.toLowerCase();

	// 1. Check known South African merchant keywords
	for (const [categoryPattern, merchants] of Object.entries(VENDOR_CATEGORY_KEYWORDS)) {
		const matchesVendor = merchants.some((m) => lowerVendor.includes(m));
		if (matchesVendor) {
			const patternRegex = new RegExp(categoryPattern, 'i');
			const matchedCat = categories.find((c) => patternRegex.test(c.name));
			if (matchedCat) return matchedCat.id;
		}
	}

	// 2. Direct string similarity with category names
	for (const cat of categories) {
		const lowerCat = cat.name.toLowerCase();
		if (lowerVendor.includes(lowerCat) || lowerCat.includes(lowerVendor)) {
			return cat.id;
		}
	}

	// 3. Fallback to first general or miscellaneous category
	const defaultCat = categories.find((c) => /general|other|ad hoc|misc/i.test(c.name));
	if (defaultCat) return defaultCat.id;

	return categories[0]?.id || null;
}

/**
 * Matches detected receipt payment info (card digits, payment type) to available company payment accounts.
 */
export function suggestPaymentAccount(
	detectedCardDigits: string | null | undefined,
	paymentMethod: string | null | undefined,
	accounts: PaymentAccountOption[] = []
): string | null {
	if (!accounts || accounts.length === 0) return null;

	// 1. Direct match on card digits / number
	if (detectedCardDigits) {
		const cleanDigits = detectedCardDigits.replace(/\D/g, '');
		if (cleanDigits.length >= 4) {
			const last4 = cleanDigits.slice(-4);
			for (const acc of accounts) {
				if (acc.cardNumber) {
					const cleanAccDigits = acc.cardNumber.replace(/\D/g, '');
					if (cleanAccDigits.length >= 4) {
						const accLast4 = cleanAccDigits.slice(-4);
						if (accLast4 === last4 || cleanAccDigits.includes(cleanDigits) || cleanDigits.includes(cleanAccDigits)) {
							return acc.id;
						}
					} else if (cleanAccDigits === cleanDigits || cleanDigits.endsWith(cleanAccDigits)) {
						return acc.id;
					}
				}
			}
		}
	}

	// 2. Text heuristics against account name and card brand/method
	const paymentText = `${paymentMethod || ''} ${detectedCardDigits || ''}`.toLowerCase();
	if (paymentText.trim()) {
		for (const acc of accounts) {
			const accName = acc.name.toLowerCase();
			if (
				(accName.includes('credit') && paymentText.includes('credit')) ||
				(accName.includes('debit') && paymentText.includes('debit')) ||
				(accName.includes('visa') && paymentText.includes('visa')) ||
				(accName.includes('mastercard') && (paymentText.includes('mastercard') || paymentText.includes('master card') || paymentText.includes('mc'))) ||
				(accName.includes('fnb') && paymentText.includes('fnb')) ||
				(accName.includes('capitec') && paymentText.includes('capitec')) ||
				(accName.includes('standard') && paymentText.includes('standard')) ||
				(accName.includes('nedbank') && paymentText.includes('nedbank')) ||
				(accName.includes('absa') && paymentText.includes('absa'))
			) {
				return acc.id;
			}
		}
	}

	return null;
}

/**
 * Parses key-value pairs from conversational Markdown when the vision model omits JSON fences
 */
export function parseMarkdownReceiptFallback(text: string): Record<string, any> {
	const result: Record<string, any> = {};

	for (const rawLine of text.split('\n')) {
		const cleanLine = rawLine.replace(/[\*#_`]/g, ' ').replace(/\s+/g, ' ').trim();
		if (!cleanLine) continue;

		// Vendor Name
		const vendorMatch = cleanLine.match(/^(?:vendor(?:\s*name)?|merchant)\s*[:\-]\s*(.+)$/i);
		if (vendorMatch && !result.vendor_name) result.vendor_name = vendorMatch[1].trim();

		// Amount / Grand Total
		const amountMatch = cleanLine.match(
			/^(?:amount|total(?:\s*due)?|balance(?:\s*due)?|grand\s*total|card\s*sale|electronic\s*payment)\s*[:\-]?\s*(?:R\s*)?([0-9.,]+)$/i
		);
		if (amountMatch && !result.amount) result.amount = amountMatch[1].trim();

		// Transaction Date
		const dateMatch = cleanLine.match(/^(?:transaction\s*date|date|receipt\s*date)\s*[:\-]\s*(.+)$/i);
		if (dateMatch && !result.transaction_date) result.transaction_date = dateMatch[1].trim();

		// Suggested Category
		const catMatch = cleanLine.match(/^(?:suggested\s*category|category)\s*[:\-]\s*(.+)$/i);
		if (catMatch && !result.suggested_category) result.suggested_category = catMatch[1].trim();

		// Payment Method
		const payMatch = cleanLine.match(/^(?:payment\s*method|payment\s*type|tender)\s*[:\-]\s*(.+)$/i);
		if (payMatch && !result.payment_method) result.payment_method = payMatch[1].trim();

		// Card Number / Digits
		const cardMatch = rawLine.match(
			/(?:card(?:\s*number)?|card\s*digits|last\s*4(?:\s*digits)?|card\s*no|account)[\s*:]+([0-9*X\s]{4,20})/i
		);
		if (cardMatch && !result.card_digits) result.card_digits = cardMatch[1].trim();
	}

	return result;
}

/**
 * Cleans, validates, and enhances raw JSON from Workers AI vision model
 */
export function sanitizeExtractedReceipt(
	raw: any,
	categories: CategoryOption[] = [],
	paymentAccounts: PaymentAccountOption[] = []
): ExtractedReceiptData {
	let parsed: Record<string, any> = {};

	if (typeof raw === 'string') {
		try {
			// Extract JSON object if model outputs markdown code blocks
			const jsonMatch = raw.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				parsed = JSON.parse(jsonMatch[0]);
			} else {
				parsed = JSON.parse(raw);
			}
		} catch {
			// If JSON parsing fails, fallback to line-by-line / Markdown key-value extraction
			parsed = parseMarkdownReceiptFallback(raw);
		}
	} else if (raw && typeof raw === 'object') {
		parsed = raw;
	}

	// If parsed object has empty vendor or amount, but raw was string, try fallback enhancement
	if (typeof raw === 'string' && (!parsed.vendor_name && !parsed.vendor && !parsed.merchant)) {
		const fallback = parseMarkdownReceiptFallback(raw);
		parsed = { ...fallback, ...parsed };
	}

	const rawVendor = parsed.vendor || parsed.vendor_name || parsed.merchant || '';
	const vendorName = cleanVendorName(rawVendor);

	const rawAmount = parsed.amount || parsed.total || parsed.total_amount || parsed.amount_cents;
	let amountCents = 0;

	if (typeof rawAmount === 'number') {
		// If amount is already in cents (> 500 without decimals on a receipt might still be rands or cents)
		// We treat raw numeric amount from model as standard Rands unless explicitly named amount_cents
		if ('amount_cents' in parsed) {
			amountCents = Math.round(parsed.amount_cents);
		} else {
			amountCents = Math.round(rawAmount * 100);
		}
	} else if (typeof rawAmount === 'string') {
		amountCents = parseDecimalStringToCents(rawAmount);
	}

	const rawDate = parsed.date || parsed.transaction_date || parsed.receipt_date;
	const transactionDate = normalizeDate(rawDate);

	// Prioritize model's direct category classification if it matches a user category
	let suggestedCategoryId: string | null = null;
	const rawModelCat = parsed.suggested_category || parsed.category;
	if (rawModelCat && typeof rawModelCat === 'string') {
		const cleanModelCat = rawModelCat.toLowerCase().trim();
		// 1. Exact or substring match
		let directMatch = categories.find((c) => {
			const catName = c.name.toLowerCase();
			return catName === cleanModelCat || catName.includes(cleanModelCat) || cleanModelCat.includes(catName);
		});

		// 2. Token overlap match (e.g. "General Groceries" matching "Groceries & Food")
		if (!directMatch) {
			const tokens = cleanModelCat
				.split(/[\s&/,\-]+/)
				.filter((t) => t.length > 3 && !['general', 'other', 'misc'].includes(t));
			if (tokens.length > 0) {
				directMatch = categories.find((c) => {
					const catName = c.name.toLowerCase();
					return tokens.some((token) => catName.includes(token));
				});
			}
		}

		if (directMatch) {
			suggestedCategoryId = directMatch.id;
		}
	}

	if (!suggestedCategoryId) {
		suggestedCategoryId = suggestCategory(vendorName, categories);
	}

	// Extract card digits and payment method
	let rawCardDigits = parsed.card_digits || parsed.card_number || parsed.last_4 || parsed.card || null;
	if (!rawCardDigits && typeof raw === 'string') {
		// Look for common slip patterns: "Card Number: 9710084035851357" or "**** 5851"
		const slipCardMatch = raw.match(/(?:card\s*(?:number|no|#)?|card\s*digits)[\s:]*([0-9*X\s]{4,20})/i);
		if (slipCardMatch) {
			rawCardDigits = slipCardMatch[1].trim();
		}
	}

	const detectedCardDigits = rawCardDigits ? String(rawCardDigits).trim() : null;
	const paymentMethod = parsed.payment_method || parsed.payment_type ? String(parsed.payment_method || parsed.payment_type).trim() : null;

	const suggestedAccountId = suggestPaymentAccount(detectedCardDigits, paymentMethod, paymentAccounts);

	// Compute confidence based on presence of essential fields
	let confidence = 0.5;
	if (vendorName && vendorName !== 'Unknown Vendor') confidence += 0.25;
	if (amountCents > 0) confidence += 0.2;
	if (rawDate) confidence += 0.05;
	confidence = Math.min(1.0, confidence);

	return {
		vendorName,
		amountCents,
		transactionDate,
		suggestedCategoryId,
		suggestedAccountId,
		detectedCardDigits,
		paymentMethod,
		confidence,
		rawJson: typeof raw === 'string' ? raw : JSON.stringify(raw)
	};
}
