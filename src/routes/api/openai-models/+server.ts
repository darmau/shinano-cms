import { json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { ConfigRow } from '$lib/types/config';

const FALLBACK_MODELS = ['gpt-5-nano', 'gpt-5', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'];
const EXCLUDED_MODELS = new Set([
	'omni-moderation-latest',
	'omni-moderation-sfw',
	'omni-moderation-pro',
	'omni-moderation-pii',
	'omni-moderation-md'
]);
const MODEL_PREFIX_WHITELIST = ['gpt', 'o', 'omni', 'text'];

export const GET: RequestHandler = async ({ locals }) => {
	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.eq('key', 'config_OPENAI')
		.single();

	if (supabaseError) {
		console.error('Failed to fetch OpenAI API key from config', supabaseError);
		return json({ source: 'fallback', models: FALLBACK_MODELS });
	}

	const configRow = (data ?? null) as ConfigRow | null;
	const apiKey = configRow?.value ?? '';

	if (!apiKey) {
		return json({ source: 'fallback', models: FALLBACK_MODELS });
	}

	try {
		const openai = new OpenAI({ apiKey });
		const list = await openai.models.list();

		const models = list.data
			.map((model) => model?.id)
			.filter((id): id is string => !!id)
			.filter((id) => !EXCLUDED_MODELS.has(id))
			.filter((id) => MODEL_PREFIX_WHITELIST.some((prefix) => id.startsWith(prefix)))
			.sort((a, b) => a.localeCompare(b));

		const responseList = models.length > 0 ? models : FALLBACK_MODELS;

		return json({
			source: models.length > 0 ? 'openai' : 'fallback',
			models: responseList
		});
	} catch (err) {
		console.error('Failed to list OpenAI models', err);
		return json({ source: 'fallback', models: FALLBACK_MODELS });
	}
};
