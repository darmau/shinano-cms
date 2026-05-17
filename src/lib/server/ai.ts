import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConfigRow } from '$lib/types/config';

const REQUIRED_KEYS = ['config_OPENAI', 'ai_GATEWAY_ENDPOINT', 'cf_AIG_TOKEN'] as const;

export async function loadAiConfigMap(
	supabase: SupabaseClient,
	extraKeys: readonly string[] = []
): Promise<Map<string, string>> {
	const keys = [...REQUIRED_KEYS, ...extraKeys];
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', keys);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const rows = (data ?? []) as ConfigRow[];
	return new Map(rows.map(({ key, value }) => [key, value ?? '']));
}

export function createGatewayOpenAI(configMap: Map<string, string>): OpenAI {
	const apiKey = configMap.get('config_OPENAI');
	const baseURL = configMap.get('ai_GATEWAY_ENDPOINT');
	const cfAIGToken = configMap.get('cf_AIG_TOKEN');

	if (!apiKey || !baseURL || !cfAIGToken) {
		error(500, 'AI gateway or OpenAI API key configuration not configured');
	}

	return new OpenAI({
		apiKey,
		baseURL,
		defaultHeaders: {
			'cf-aig-authorization': `Bearer ${cfAIGToken}`
		}
	});
}
