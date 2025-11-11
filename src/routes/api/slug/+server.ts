import { error, type RequestHandler } from '@sveltejs/kit';
import type { ConfigRow } from '$lib/types/config';
import OpenAI from 'openai';
import { DEFAULT_AI_CONFIG } from '$lib/types/prompts';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { title } = await request.json();

	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', ['config_OPENAI', 'prompt_SLUG', 'model_SLUG']);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const rows = (data ?? []) as ConfigRow[];
	const configMap = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	const openaiApiKey = configMap.get('config_OPENAI');
	const prompt = configMap.get('prompt_SLUG');
	const model = configMap.get('model_SLUG') ?? DEFAULT_AI_CONFIG.model_SLUG;

	if (!openaiApiKey) {
		error(500, 'OpenAI API key not configured');
	}

	if (!prompt) {
		error(500, 'Slug prompt not configured');
	}

	const openai = new OpenAI({ apiKey: openaiApiKey });

	let slug = '';
	try {
		const response = await openai.responses.create({
			model,
			instructions: prompt,
			input: title
		});
		slug = response.output_text?.trim() ?? '';
	} catch (err) {
		console.error(err);
		error(502, 'Error generating slug');
	}

	return new Response(slug, {
		headers: { 'Content-Type': 'text/plain' }
	});
};
