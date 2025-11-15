import { error, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { ConfigRow } from '$lib/types/config';
import { DEFAULT_AI_CONFIG } from '$lib/types/prompts';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { content } = await request.json();

	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', ['config_OPENAI', 'prompt_TAGS', 'model_TAGS', 'ai_GATEWAY_ENDPOINT', 'cf_AIG_TOKEN']);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const rows = (data ?? []) as ConfigRow[];
	const configMap = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	const openaiApiKey = configMap.get('config_OPENAI');
	const aiGatewayEndpoint = configMap.get('ai_GATEWAY_ENDPOINT');
	const cfAIGToken = configMap.get('cf_AIG_TOKEN');

	if (!aiGatewayEndpoint || !cfAIGToken || !openaiApiKey) {
		error(500, 'AI gateway or OpenAI API key configuration not configured');
	}
	const prompt = configMap.get('prompt_SEO');

	const model = configMap.get('model_TAGS') ?? 'gpt-5.1';

	if (!prompt) {
		error(500, 'Tags prompt not configured');
	}

	const openai = new OpenAI({
		apiKey: openaiApiKey,
		baseURL: aiGatewayEndpoint,
		defaultHeaders: {
			"cf-aig-authorization": `Bearer ${cfAIGToken}`,
		},
	});

	let tags = '';
	try {
		const response = await openai.responses.create({
			model,
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
									type: 'string'
								},
								minItems: 1,
								maxItems: 8
							}
						},
						required: ['tags'],
						additionalProperties: false
					}
				}
			}
		});
		tags = response.output_text?.trim() ?? '';
	} catch (err) {
		console.error(err);
		error(502, 'Error generating tags');
	}

	return new Response(tags, {
		headers: { 'Content-Type': 'application/json' }
	});
};
