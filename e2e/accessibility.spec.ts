import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits & WCAG 2.1 AA Compliance (AC-14)', () => {
	test('login page must have zero detectable WCAG 2.1 AA violations', async ({ page }) => {
		await page.goto('/login');

		// Verify key interactive targets exist
		await expect(page.locator('h1')).toBeVisible();
		const submitButton = page.locator('button[type="submit"]');
		await expect(submitButton).toBeVisible();

		// Run automated axe accessibility audit
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(results.violations).toEqual([]);
	});

	test('register page must have zero detectable WCAG 2.1 AA violations', async ({ page }) => {
		await page.goto('/register');

		await expect(page.locator('h1')).toBeVisible();
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(results.violations).toEqual([]);
	});

	test('forgot password page must have zero detectable WCAG 2.1 AA violations', async ({ page }) => {
		await page.goto('/forgot-password');

		await expect(page.locator('h1')).toBeVisible();
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(results.violations).toEqual([]);
	});

	test('touch targets should have minimum height for mobile usability (AC-13)', async ({ page }) => {
		await page.goto('/login');

		const submitBtn = page.locator('button[type="submit"]');
		const box = await submitBtn.boundingBox();
		expect(box).not.toBeNull();
		if (box) {
			// At least 44-48px height for thumb tap targets
			expect(box.height).toBeGreaterThanOrEqual(44);
		}
	});
});
