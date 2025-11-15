import { error, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { ConfigRow } from '$lib/types/config';
import { DEFAULT_AI_CONFIG } from '$lib/types/prompts';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { lang, content } = await request.json();

	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', ['config_OPENAI', 'prompt_TRANSLATION', 'model_TRANSLATION', 'ai_GATEWAY_ENDPOINT', 'cf_AIG_TOKEN']);

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

	const prompt = configMap.get('prompt_TRANSLATION');

	const model = configMap.get('model_TRANSLATION') ?? 'gpt-5.1';

	if (!prompt) {
		error(500, 'Translation prompt not configured');
	}

	const openai = new OpenAI({
		apiKey: openaiApiKey,
		baseURL: aiGatewayEndpoint,
		defaultHeaders: {
			"cf-aig-authorization": `Bearer ${cfAIGToken}`,
		},
	});

	let translatedHtml = '';
	try {
		const response = await openai.responses.create({
			model,
			instructions: prompt + lang,
			input: content,
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
