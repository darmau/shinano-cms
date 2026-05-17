import { describe, expect, it, vi } from 'vitest';
import { createGatewayOpenAI, loadAiConfigMap } from '../ai';

function fakeSupabase(rows: Array<{ key: string; value: string | null }>, err: unknown = null) {
	return {
		from: () => ({
			select: () => ({
				in: () => Promise.resolve({ data: err ? null : rows, error: err })
			})
		})
	};
}

describe('loadAiConfigMap', () => {
	it('returns a Map of key -> value for stored rows', async () => {
		const supabase = fakeSupabase([
			{ key: 'config_OPENAI', value: 'sk-test' },
			{ key: 'ai_GATEWAY_ENDPOINT', value: 'https://gateway' },
			{ key: 'cf_AIG_TOKEN', value: 'token' },
			{ key: 'prompt_SLUG', value: 'slugify this' }
		]);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const map = await loadAiConfigMap(supabase as any, ['prompt_SLUG']);
		expect(map.get('config_OPENAI')).toBe('sk-test');
		expect(map.get('prompt_SLUG')).toBe('slugify this');
	});

	it('treats null stored values as empty strings', async () => {
		const supabase = fakeSupabase([{ key: 'config_OPENAI', value: null }]);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const map = await loadAiConfigMap(supabase as any);
		expect(map.get('config_OPENAI')).toBe('');
	});

	it('throws via SvelteKit error when the supabase query fails', async () => {
		const supabase = fakeSupabase([], { message: 'boom' });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await expect(loadAiConfigMap(supabase as any)).rejects.toBeDefined();
	});
});

describe('createGatewayOpenAI', () => {
	it('builds an OpenAI client when all three required keys are present', () => {
		const map = new Map<string, string>([
			['config_OPENAI', 'sk-test'],
			['ai_GATEWAY_ENDPOINT', 'https://gateway'],
			['cf_AIG_TOKEN', 'token']
		]);
		const client = createGatewayOpenAI(map);
		expect(client).toBeDefined();
		expect(client.baseURL).toContain('gateway');
	});

	it.each([
		[['ai_GATEWAY_ENDPOINT', 'cf_AIG_TOKEN']],
		[['config_OPENAI', 'cf_AIG_TOKEN']],
		[['config_OPENAI', 'ai_GATEWAY_ENDPOINT']]
	])('throws when a required key is missing', (presentKeys) => {
		const map = new Map<string, string>(presentKeys.map((k) => [k, 'x']));
		expect(() => createGatewayOpenAI(map)).toThrow();
	});

	it('treats an empty-string value the same as a missing key', () => {
		const map = new Map<string, string>([
			['config_OPENAI', ''],
			['ai_GATEWAY_ENDPOINT', 'https://gateway'],
			['cf_AIG_TOKEN', 'token']
		]);
		expect(() => createGatewayOpenAI(map)).toThrow();
	});
});

// Suppress noisy console.error during the error-path test.
vi.spyOn(console, 'error').mockImplementation(() => {});
