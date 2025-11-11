import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: categories, error: fetchError } = await supabase
		.from('category')
		.select(
			`id, title, slug, description, lang (id, locale), type, cover (id, alt, storage_key), article (count), photo (count)`
		)
		.order('id', { ascending: false });

	if (fetchError) {
		console.error(error);
		error(Number(fetchError.code), { message: fetchError.message });
	}

	return {
		prefix: URL_PREFIX,
		categories: categories ?? []
	};
};
