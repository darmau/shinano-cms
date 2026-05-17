import { error, type RequestHandler } from '@sveltejs/kit';
import { createGatewayOpenAI, loadAiConfigMap } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { title } = await request.json();

	const configMap = await loadAiConfigMap(locals.supabase, ['prompt_SLUG', 'model_SLUG']);
	const prompt = configMap.get('prompt_SLUG');
	const model = configMap.get('model_SLUG') ?? 'gpt-5.1';

	if (!prompt) {
		error(500, 'Slug prompt not configured');
	}

	const openai = createGatewayOpenAI(configMap);

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
