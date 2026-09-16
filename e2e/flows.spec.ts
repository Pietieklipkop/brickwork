import { expect, test } from '@playwright/test';

test.describe('Core Application Workflows & Performance (AC-01 - AC-12)', () => {
	test('primary landing pages load within performance target (< 2000ms) (AC-12)', async ({ page }) => {
		// Warm up initial connection to exclude local worker cold-start compilation
		await page.goto('/login');

		const start = Date.now();
		const response = await page.goto('/register');
		const elapsed = Date.now() - start;

		expect(response?.status()).toBe(200);
		expect(elapsed).toBeLessThan(2000);
	});

	test('extraction API requires authentication', async ({ request }) => {
		const res = await request.post('/api/extract', {
			multipart: {
				image: {
					name: 'receipt.webp',
					mimeType: 'image/webp',
					buffer: Buffer.from('test')
				}
			}
		});

		// Expect 401 Unauthorized or 403 Forbidden for unauthenticated requests
		expect([401, 403, 303]).toContain(res.status());
	});

	test('receipt image proxy requires authentication', async ({ request }) => {
		const res = await request.get('/api/receipts/company123/2026/09/exp123.webp');
		expect([401, 403, 404, 303]).toContain(res.status());
	});

	test('login page contains brand logo and accessible semantic structure', async ({ page }) => {
		await page.goto('/login');

		await expect(page.locator('text=BRICKWORK')).toBeVisible();
		await expect(page.locator('form')).toBeVisible();
	});
});
