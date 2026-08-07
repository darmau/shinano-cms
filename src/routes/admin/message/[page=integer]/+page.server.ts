import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getPagination } from '$lib/server/pagination';
import { deleteRows, parseIds } from '$lib/server/actions';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const { page: pageNumber, limit, from, to, path } = getPagination(url, page);

	const [{ data: messages, error: fetchError }, { count, error: countError }] = await Promise.all([
		supabase
			.from('message')
			.select('id, name, message, contact_type, contact_detail, created_at, is_read')
			.range(from, to)
			.order('is_read', { ascending: true })
			.order('created_at', { ascending: false }),
		supabase.from('message').select('id', { count: 'exact', head: true })
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
		messages,
		count: count ?? 0,
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

		return deleteRows(supabase, 'message', ids, '留言');
	}
};
