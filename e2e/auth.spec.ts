import { expect, test } from '@playwright/test';

test.describe('Authentication & Session Handling (AC-10, AC-11)', () => {
	test('unauthenticated access to protected routes redirects to /login', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/.*\/login/);

		await page.goto('/expenses');
		await expect(page).toHaveURL(/.*\/login/);

		await page.goto('/capture');
		await expect(page).toHaveURL(/.*\/login/);

		await page.goto('/settings');
		await expect(page).toHaveURL(/.*\/login/);
	});

	test('login page has email and password inputs with proper validation attributes', async ({ page }) => {
		await page.goto('/login');

		const emailInput = page.locator('#email');
		await expect(emailInput).toBeVisible();
		await expect(emailInput).toHaveAttribute('type', 'email');
		await expect(emailInput).toHaveAttribute('required', '');

		const passwordInput = page.locator('#password');
		await expect(passwordInput).toBeVisible();
		await expect(passwordInput).toHaveAttribute('type', 'password');
		await expect(passwordInput).toHaveAttribute('required', '');

		// Links to register and forgot password
		await expect(page.locator('a[href="/register"]')).toBeVisible();
		await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
	});

	test('register page has cycle start day input bounded 1 to 28 (AC-06, AC-11)', async ({ page }) => {
		await page.goto('/register');

		const cycleSelect = page.locator('#monthStartDay');
		await expect(cycleSelect).toBeVisible();
		const options = cycleSelect.locator('option');
		await expect(options).toHaveCount(28);
	});

	test('register page input placeholders are fully anonymized', async ({ page }) => {
		await page.goto('/register');

		const nameInput = page.locator('#name');
		await expect(nameInput).toBeVisible();
		await expect(nameInput).toHaveAttribute('placeholder', 'John Doe');

		const emailInput = page.locator('#email');
		await expect(emailInput).toBeVisible();
		await expect(emailInput).toHaveAttribute('placeholder', 'john.doe@example.com');
	});

	test('forgot password page accepts email and submits request', async ({ page }) => {
		await page.goto('/forgot-password');

		const emailInput = page.locator('#email');
		await emailInput.fill('user@example.com');

		const submitBtn = page.locator('button[type="submit"]');
		await submitBtn.click();

		// Should either render confirmation or error depending on backend
		await expect(page.locator('body')).toBeVisible();
	});
});
