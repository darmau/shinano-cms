import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const supabase = locals.supabase;

	const { data: languages, error: fetchError } = await supabase
		.from('language')
		.select('lang, locale, is_default')
		.order('is_default', { ascending: false });

	if (fetchError) {
		console.error('Error fetching languages:', fetchError);
		error(500, 'Failed to fetch languages');
	}

	return {
		languages: languages ?? []
	};
};

