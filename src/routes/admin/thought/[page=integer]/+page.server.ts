import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const pageNumber = Number(page);
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 10;

	const [{ count }, { data: thoughts, error: fetchError }] = await Promise.all([
		supabase.from('thought').select('id', { count: 'exact' }),
		supabase
			.from('thought')
			.select(
				`
	  id,
	  slug,
	  created_at,
	  content_text,
	  thought_image (count)
	`
			)
			.range((pageNumber - 1) * limit, pageNumber * limit - 1)
			.order('created_at', { ascending: false })
	]);

	if (fetchError) {
		console.error(fetchError);
		error(500, { message: fetchError.message });
	}

	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	return {
		page: pageNumber,
		prefix: URL_PREFIX,
		count: count ?? 0,
		thoughts: thoughts ?? [],
		limit,
		path
	};
};
