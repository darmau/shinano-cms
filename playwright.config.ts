import type { PlaywrightTestConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Make .env.local available to the Playwright test process itself.
// (Vite preview already loads it for the dev server.)
try {
	for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
		const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (match && process.env[match[1]] === undefined) {
			process.env[match[1]] = match[2];
		}
	}
} catch {
	// fine in CI where the vars are injected directly
}

const config: PlaywrightTestConfig = {
	webServer: {
		// vite dev (port 5173) is enough for routing/auth tests and avoids
		// the Cloudflare adapter's wrangler-dev wrapper, which requires a
		// fresh `wrangler login`. Re-uses an already-running pnpm dev server.
		command: 'pnpm dev',
		port: 5173,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
