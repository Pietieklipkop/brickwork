import { expect, test } from '@playwright/test';

test.describe('PWA Compliance & Assets (AC-13)', () => {
	test('web app manifest should be served with valid configuration', async ({ request }) => {
		const res = await request.get('/manifest.webmanifest');
		expect(res.status()).toBe(200);

		const manifest = await res.json();
		expect(manifest.name).toBe('Brickwork Point-of-Purchase Expense Manager');
		expect(manifest.short_name).toBe('Brickwork');
		expect(manifest.display).toBe('standalone');
		expect(manifest.theme_color).toBe('#0B2240');
		expect(manifest.background_color).toBe('#F8FAFC');
		expect(manifest.orientation).toBe('portrait');
		expect(manifest.icons).toBeInstanceOf(Array);
		expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
	});

	test('pwa icons must be available and return 200 OK', async ({ request }) => {
		const iconSvg = await request.get('/icons/icon.svg');
		expect(iconSvg.status()).toBe(200);

		const icon192 = await request.get('/icons/icon-192.png');
		expect(icon192.status()).toBe(200);

		const icon512 = await request.get('/icons/icon-512.png');
		expect(icon512.status()).toBe(200);
	});

	test('html shell should include manifest and theme color meta tags', async ({ page }) => {
		await page.goto('/login');

		const manifestLink = page.locator('link[rel="manifest"]');
		await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');

		const themeColor = page.locator('meta[name="theme-color"]');
		await expect(themeColor).toHaveAttribute('content', '#0B2240');
	});
});
