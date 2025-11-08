import { error, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { ConfigRow } from '$lib/types/config';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { lang, content } = await request.json();

	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', ['config_OPENAI', 'prompt_TRANSLATION']);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const rows = (data ?? []) as ConfigRow[];
	const configMap = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	const openaiApiKey = configMap.get('config_OPENAI');
	const prompt = configMap.get('prompt_TRANSLATION');

	if (!openaiApiKey) {
		error(500, 'OpenAI API key not configured');
	}

	if (!prompt) {
		error(500, 'Translation prompt not configured');
	}

	const openai = new OpenAI({ apiKey: openaiApiKey });

	let translatedHtml = '';
	try {
		const response = await openai.responses.create({
			model: 'gpt-5',
			instructions: prompt + lang,
			input: content,
			reasoning: { effort: "medium" },
		});
		translatedHtml = response.output_text?.trim() ?? '';
	} catch (err) {
		console.error(err);
		error(502, 'Error generating translation');
	}

	return new Response(translatedHtml, {
		headers: { 'Content-Type': 'text/plain' }
	});
}
