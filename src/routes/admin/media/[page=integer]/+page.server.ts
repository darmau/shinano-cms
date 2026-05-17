import type { PageServerLoad } from './$types';
import { URL_PREFIX } from '$env/static/private';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const pageNumber = Number(page);
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 24;

	const [{ data: images, error: fetchError }, { count }] = await Promise.all([
		supabase
			.from('image')
			.select(
				'id, storage_key, file_name, alt, folder, caption, location, taken_at, exif, width, height, size'
			)
			.range((pageNumber - 1) * limit, pageNumber * limit - 1)
			.order('id', { ascending: false }),
		supabase.from('image').select('id', { count: 'exact' })
	]);

	if (fetchError) {
		console.error(fetchError);
		error(500, { message: fetchError.message });
	}

	// 获取url中域名开始到page之间的字符串
	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	return {
		page: pageNumber,
		images: images ?? [],
		prefix: URL_PREFIX,
		count: count ?? 0,
		limit: limit,
		path: path
	};
};
