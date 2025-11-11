import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const categoryId = params.id;

	const { data: categoryData, error: categoryError } = await supabase
		.from('category')
		.select(
			`
	  id,
	  title,
	  slug,
	  description,
	  lang,
	  cover (id, alt, storage_key),
	  type`
		)
		.eq('id', categoryId)
		.single();

	const { data: languageData, error: languageError } = await supabase
		.from('language')
		.select('id, locale')
		.order('id', { ascending: true });

	if (categoryError || languageError) {
		const errorCode = Number(categoryError?.code || languageError?.code);
		const errorMessage = categoryError?.message || languageError?.message || 'Error';
		error(errorCode, { message: errorMessage });
	}

	return {
		prefix: URL_PREFIX,
		category: categoryData,
		languages: languageData
	};
};
