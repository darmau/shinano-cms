import { error, type RequestHandler } from '@sveltejs/kit';
import { createGatewayOpenAI, loadAiConfigMap } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { content } = await request.json();

	if (!content || typeof content !== 'string') {
		error(400, 'Content is required');
	}

	const configMap = await loadAiConfigMap(locals.supabase, [
		'prompt_SEO',
		'model_ABSTRACT'
	]);
	const prompt = configMap.get('prompt_SEO');
	const model = configMap.get('model_ABSTRACT') ?? 'gpt-5.1';

	if (!prompt) {
		error(500, 'SEO prompt not configured');
	}

	const openai = createGatewayOpenAI(configMap);

	let generatedAbstract = '';
	try {
		const response = await openai.responses.create({
			model,
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
