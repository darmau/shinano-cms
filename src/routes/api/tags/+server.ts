import { error, type RequestHandler } from '@sveltejs/kit';
import { createGatewayOpenAI, loadAiConfigMap } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { content } = await request.json();

	const configMap = await loadAiConfigMap(locals.supabase, ['prompt_TAGS', 'model_TAGS']);
	const prompt = configMap.get('prompt_TAGS');
	const model = configMap.get('model_TAGS') ?? 'gpt-5-nano';

	if (!prompt) {
		error(500, 'Tags prompt not configured');
	}

	const openai = createGatewayOpenAI(configMap);

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
