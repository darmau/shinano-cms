import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPagination } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const { page: pageNumber, limit, from, to, path } = getPagination(url, page);

	const [{ data: users, error: fetchError }, { count, error: countError }] = await Promise.all([
		supabase
			.from('users')
			.select('id, name, user_id, source, created_at, role')
			.range(from, to)
			.order('created_at', { ascending: false }),
		supabase.from('users').select('id', { count: 'exact', head: true })
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
		users,
		count: count ?? 0,
		limit,
		path
	};
};
