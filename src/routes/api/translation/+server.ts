import { error, type RequestHandler } from '@sveltejs/kit';
import { createGatewayOpenAI, loadAiConfigMap } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { lang, content } = await request.json();

	const configMap = await loadAiConfigMap(locals.supabase, [
		'prompt_TRANSLATION',
		'model_TRANSLATION'
	]);
	const prompt = configMap.get('prompt_TRANSLATION');
	const model = configMap.get('model_TRANSLATION') ?? 'gpt-5.1';

	if (!prompt) {
		error(500, 'Translation prompt not configured');
	}

	const openai = createGatewayOpenAI(configMap);

	let translatedHtml = '';
	try {
		const response = await openai.responses.create({
			model,
			instructions: prompt + lang,
			input: content
		});
		translatedHtml = response.output_text?.trim() ?? '';
	} catch (err) {
		console.error(err);
		error(502, 'Error generating translation');
	}

	return new Response(translatedHtml, {
		headers: { 'Content-Type': 'text/plain' }
	});
};
