import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { AI } from '$lib/types/prompts';
import type { ConfigRow } from '$lib/types/config';

export const load: PageServerLoad = async ({ locals }) => {
	const supabase = locals.supabase;
	const ai = new AI();
	const KEYS = ai.array();

	const { data: rowsResult, error: fetchError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', KEYS);

	if (fetchError) {
		console.error('Error fetching AI config:', fetchError);
		error(500, 'Failed to fetch AI configuration');
	}

	const rows = (rowsResult ?? []) as ConfigRow[];
	const configMap = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	
	const DEFAULTS = ai.emptyObject();
	const aiConfig: Record<string, string> = {};
	KEYS.forEach((key) => {
		aiConfig[key] = configMap.get(key) ?? DEFAULTS[key];
	});

	return {
		aiConfig
	};
};

