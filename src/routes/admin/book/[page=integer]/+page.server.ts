import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import { getPagination } from '$lib/server/pagination';
import { deleteRows, parseIds } from '$lib/server/actions';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const { page: pageNumber, limit, from, to, path } = getPagination(url, page, 24);

	const [{ count, error: countError }, { data: books, error: fetchError }] = await Promise.all([
		supabase.from('book').select('id', { count: 'exact', head: true }),
		supabase
			.from('book')
			.select(
				`
	  id,
	  title,
	  rate,
	  date,
	  cover (id, alt, storage_key)
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
		books: books ?? [],
		limit,
		path
	};
};

export const actions: Actions = {
	// 删除：id 可以出现多次，批量删除与单条删除走同一个 action
	delete: async ({ request, locals: { supabase } }) => {
		const ids = parseIds(await request.formData());

		if (!ids) {
			return fail(400, { message: '请求缺少有效的 id。' });
		}

		return deleteRows(supabase, 'book', ids, '书');
	}
};
