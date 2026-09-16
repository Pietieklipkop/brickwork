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
	confidence: number; // 0.0 to 1.0
	rawJson?: string;
}

export interface CategoryOption {
	id: string;
	name: string;
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
 * Cleans, validates, and enhances raw JSON from Workers AI vision model
 */
export function sanitizeExtractedReceipt(
	raw: any,
	categories: CategoryOption[] = []
): ExtractedReceiptData {
	let parsed = raw;

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
			parsed = {};
		}
	}

	if (!parsed || typeof parsed !== 'object') {
		parsed = {};
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

	const suggestedCategoryId = suggestCategory(vendorName, categories);

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
		confidence,
		rawJson: typeof raw === 'string' ? raw : JSON.stringify(raw)
	};
}
