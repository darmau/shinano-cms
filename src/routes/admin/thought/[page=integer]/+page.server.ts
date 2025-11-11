import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const pageNumber = Number(page);
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 10;

	// 获取thought表中数据的条目数
	const { count } = await supabase.from('thought').select('id', { count: 'exact' });

	const { data: thoughts, error: fetchError } = await supabase
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
		.order('created_at', { ascending: false });

	if (fetchError) {
		console.error(error);
		error(Number(fetchError.code), { message: fetchError.message });
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
