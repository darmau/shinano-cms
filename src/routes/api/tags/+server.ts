import { error, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { ConfigRow } from '$lib/types/config';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { content } = await request.json();
	
	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', ['config_OPENAI', 'prompt_TAGS']);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const rows = (data ?? []) as ConfigRow[];
	const configMap = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	const openaiApiKey = configMap.get('config_OPENAI');
	const prompt = configMap.get('prompt_TAGS');

	if (!openaiApiKey) {
		error(500, 'OpenAI API key not configured');
	}

	if (!prompt) {
		error(500, 'Tags prompt not configured');
	}

	const openai = new OpenAI({ apiKey: openaiApiKey });

	let tags = '';
	try {
		const response = await openai.responses.create({
			model: 'gpt-5-nano',
			instructions: prompt,
			input: content,
			text: {
				format: {
					type: 'json_schema',
					name: 'ContentTags',
					schema: {
						type: 'object',
						properties: {
							tags: {
								type: 'array',
								items: {
									type: 'string',
								},
								minItems: 1,
								maxItems: 8,
							},
						},
						required: ['tags'],
						additionalProperties: false,
					},
				},
			},
		});
		tags = response.output_text?.trim() ?? '';
	} catch (err) {
		console.error(err);
		error(502, 'Error generating tags');
	}

	return new Response(tags, {
		headers: { 'Content-Type': 'application/json' }
	});
}
