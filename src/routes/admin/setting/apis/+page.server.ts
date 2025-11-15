import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ThirdPartyAPIs } from '$lib/types/thirdPartyApi';
import type { ConfigRow } from '$lib/types/config';

export const load: PageServerLoad = async ({ locals }) => {
	const supabase = locals.supabase;
	const apis = new ThirdPartyAPIs();
	const KEYS = apis.array();

	const { data: rowsResult, error: fetchError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', KEYS);

	if (fetchError) {
		console.error('Error fetching API config:', fetchError);
		error(500, 'Failed to fetch API configuration');
	}

	const rows = (rowsResult ?? []) as ConfigRow[];
	const configMap = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	
	const apiConfig: Record<string, string> = {};
	KEYS.forEach((key) => {
		apiConfig[key] = configMap.get(key) ?? '';
	});

	return {
		apiConfig
	};
};

