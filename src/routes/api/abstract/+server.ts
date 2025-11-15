import { error, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { ConfigRow } from '$lib/types/config';
import { DEFAULT_AI_CONFIG } from '$lib/types/prompts';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { content } = await request.json();

	if (!content || typeof content !== 'string') {
		error(400, 'Content is required');
	}

	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', ['ai_GATEWAY_HOST', 'ai_GATEWAY_ENDPOINT', 'cf_AIG_TOKEN', 'prompt_SEO', 'model_ABSTRACT']);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const rows = (data ?? []) as ConfigRow[];
	const configMap = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	const openaiApiKey = configMap.get('config_OPENAI');
	const host = configMap.get('ai_GATEWAY_HOST');
	const endpoint = configMap.get('ai_GATEWAY_ENDPOINT');
	const token = configMap.get('cf_AIG_TOKEN');
	const prompt = configMap.get('prompt_SEO');

	// 检查配置是否完整
	if (!host || !endpoint || !token) {
		error(500, 'AI configuration is incomplete');
	}

	const model = configMap.get('model_ABSTRACT') ?? DEFAULT_AI_CONFIG.model_ABSTRACT;

	if (!prompt) {
		error(500, 'SEO prompt not configured');
	}

	const openai = new OpenAI({
		baseURL: host + endpoint,
		defaultHeaders: {
			"cf-aig-authorization": `Barear {token}`
		}
	});

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
