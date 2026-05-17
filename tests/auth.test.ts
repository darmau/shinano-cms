import { expect, test } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

test('home page renders the CMS title', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: '信濃CMS' })).toBeVisible();
});

test('unauthenticated /admin redirects to login', async ({ page }) => {
	const response = await page.goto('/admin');
	// SvelteKit issues a 303 redirect; Playwright follows it and lands on /auth/login.
	expect(response?.ok()).toBe(true);
	await expect(page).toHaveURL(/\/auth\/login$/);
});

test('login page renders email + password inputs', async ({ page }) => {
	await page.goto('/auth/login');
	await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
	await expect(page.locator('input[name="email"]')).toBeVisible();
	await expect(page.locator('input[name="password"]')).toBeVisible();
});

test.describe('authenticated flow', () => {
	test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set');

	test('login then logout', async ({ page }) => {
		await page.goto('/auth/login');
		await page.locator('input[name="email"]').fill(TEST_EMAIL!);
		await page.locator('input[name="password"]').fill(TEST_PASSWORD!);
		await Promise.all([
			page.waitForURL('**/admin'),
			page.getByRole('button', { name: 'Sign in' }).click()
		]);
		await expect(page).toHaveURL(/\/admin$/);

		// Session survives a reload.
		await page.reload();
		await expect(page).toHaveURL(/\/admin$/);

		await Promise.all([
			page.waitForURL('**/auth/login'),
			page.getByRole('button', { name: '退出登录' }).click()
		]);
		await expect(page).toHaveURL(/\/auth\/login$/);
	});
});
