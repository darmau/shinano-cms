import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: languageData, error: languageError } = await supabase
		.from('language')
		.select('id, locale')
		.order('id', { ascending: true });

	if (languageError) {
		error(Number(languageError.code), { message: languageError.message });
	}

	return {
		prefix: URL_PREFIX,
		languages: languageData
	};
};
