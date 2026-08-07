import type { PageServerLoad } from './$types';
import { URL_PREFIX } from '$env/static/private';
import { error } from '@sveltejs/kit';
import { getPagination } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const { page: pageNumber, limit, from, to, path } = getPagination(url, page, 24);

	const [{ data: images, error: fetchError }, { count, error: countError }] = await Promise.all([
		supabase
			.from('image')
			.select(
				'id, storage_key, file_name, alt, folder, caption, location, taken_at, exif, width, height, size'
			)
			.range(from, to)
			.order('id', { ascending: false }),
		supabase.from('image').select('id', { count: 'exact', head: true })
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
		images: images ?? [],
		prefix: URL_PREFIX,
		count: count ?? 0,
		limit,
		path
	};
};
