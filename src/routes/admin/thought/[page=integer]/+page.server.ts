import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import { getPagination } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const { page: pageNumber, limit, from, to, path } = getPagination(url, page, 10);

	const [{ count, error: countError }, { data: thoughts, error: fetchError }] = await Promise.all([
		supabase.from('thought').select('id', { count: 'exact', head: true }),
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
			.range(from, to)
			.order('created_at', { ascending: false })
	]);

	if (fetchError) {
		console.error(fetchError);
		error(500, { message: fetchError.message });
	}

	if (countError) {
		error(500, { message: countError.message });
	}

	return {
		page: pageNumber,
		prefix: URL_PREFIX,
		count: count ?? 0,
		thoughts: thoughts ?? [],
		limit,
		path
	};
};
