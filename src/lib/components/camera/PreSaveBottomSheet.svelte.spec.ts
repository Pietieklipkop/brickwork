import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PreSaveBottomSheet from './PreSaveBottomSheet.svelte';

describe('PreSaveBottomSheet.svelte (AC-16 Reimbursable Expenses)', () => {
	const dummyCategories = [
		{ id: 'cat-1', name: 'Meals' },
		{ id: 'cat-2', name: 'Office Supplies' }
	];
	const dummyAccounts = [
		{ id: 'acc-1', name: 'Personal Cheque', isDefault: true }
	];
	const dummyCompanies = [
		{ id: 'comp-1', name: 'Acme Holdings' },
		{ id: 'comp-2', name: 'Stark Industries' }
	];

	it('does not display reimbursable toggle when isPersonal is false (business account)', async () => {
		render(PreSaveBottomSheet, {
			extractedData: {
				vendorName: 'Woolworths',
				amountCents: 15000,
				transactionDate: '2026-09-17',
				suggestedCategoryId: 'cat-1',
				confidence: 1.0
			},
			categories: dummyCategories,
			paymentAccounts: dummyAccounts,
			isPersonal: false,
			businessCompanies: dummyCompanies,
			onsave: vi.fn(),
			oncancel: vi.fn()
		});

		await expect.element(page.getByText('Reimbursable Expense')).not.toBeInTheDocument();
	});

	it('displays reimbursable toggle when isPersonal is true and business companies exist', async () => {
		render(PreSaveBottomSheet, {
			extractedData: {
				vendorName: 'Woolworths',
				amountCents: 15000,
				transactionDate: '2026-09-17',
				suggestedCategoryId: 'cat-1',
				confidence: 1.0
			},
			categories: dummyCategories,
			paymentAccounts: dummyAccounts,
			isPersonal: true,
			businessCompanies: dummyCompanies,
			onsave: vi.fn(),
			oncancel: vi.fn()
		});

		await expect.element(page.getByText('Reimbursable Expense')).toBeInTheDocument();
		await expect.element(page.getByText('Claim back this personal out-of-pocket expense from a business entity.')).toBeInTheDocument();
	});

	it('reveals business entity dropdown when reimbursable toggle is checked', async () => {
		const onsave = vi.fn();
		render(PreSaveBottomSheet, {
			extractedData: {
				vendorName: 'Woolworths',
				amountCents: 15000,
				transactionDate: '2026-09-17',
				suggestedCategoryId: 'cat-1',
				confidence: 1.0
			},
			categories: dummyCategories,
			paymentAccounts: dummyAccounts,
			isPersonal: true,
			businessCompanies: dummyCompanies,
			onsave,
			oncancel: vi.fn()
		});

		const toggle = page.getByRole('checkbox');
		await toggle.click();

		await expect.element(page.getByText('Reimburse from Company')).toBeInTheDocument();
		await expect.element(page.getByText('Acme Holdings')).toBeInTheDocument();
		await expect.element(page.getByText('Stark Industries')).toBeInTheDocument();
	});

	it('pre-selects the default card when multiple payment accounts are available (AC-20)', async () => {
		const multipleAccounts = [
			{ id: 'acc-1', name: 'Personal Cheque', isDefault: false },
			{ id: 'acc-2', name: 'Discovery Credit Card', isDefault: true },
			{ id: 'acc-3', name: 'Capitec Savings', isDefault: false }
		];

		const onsave = vi.fn();
		render(PreSaveBottomSheet, {
			extractedData: {
				vendorName: 'Exclusive Books',
				amountCents: 45000,
				transactionDate: '2026-09-20',
				suggestedCategoryId: 'cat-2',
				confidence: 1.0
			},
			categories: dummyCategories,
			paymentAccounts: multipleAccounts,
			isPersonal: true,
			businessCompanies: dummyCompanies,
			onsave,
			oncancel: vi.fn()
		});

		// Paid With dropdown should exist and render all cards
		await expect.element(page.getByLabelText('Paid With')).toBeInTheDocument();
		await expect.element(page.getByText('Discovery Credit Card (Default)')).toBeInTheDocument();

		// Submit expense and verify default card ID acc-2 was sent
		const submitBtn = page.getByRole('button', { name: 'Save Expense' });
		await submitBtn.click();

		expect(onsave).toHaveBeenCalledWith(
			expect.objectContaining({
				vendorName: 'Exclusive Books',
				amountCents: 45000,
				accountId: 'acc-2'
			})
		);
	});
});
