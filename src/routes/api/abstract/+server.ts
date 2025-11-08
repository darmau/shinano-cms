import { error, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { ConfigRow } from '$lib/types/config';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { content } = await request.json();

	if (!content || typeof content !== 'string') {
		error(400, 'Content is required');
	}

	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', ['config_OPENAI', 'prompt_SEO']);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const rows = (data ?? []) as ConfigRow[];
	const configMap = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	const openaiApiKey = configMap.get('config_OPENAI');
	const prompt = configMap.get('prompt_SEO');

	if (!openaiApiKey) {
		error(500, 'OpenAI API key not configured');
	}

	if (!prompt) {
		error(500, 'SEO prompt not configured');
	}

	const openai = new OpenAI({ apiKey: openaiApiKey });

	let generatedAbstract = '';
	try {
		const response = await openai.responses.create({
			model: 'gpt-5-nano',
			instructions: prompt,
			input: content
		});

		generatedAbstract = response.output_text?.trim() ?? '';
	} catch (err) {
		console.error(err);
		error(502, 'Error generating abstract');
	}

	return new Response(generatedAbstract, {
		headers: { 'Content-Type': 'text/plain' }
	});
};
