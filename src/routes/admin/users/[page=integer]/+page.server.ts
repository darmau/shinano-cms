import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const pageNumber = Number(page);
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 16;

	const { data: users, error: fetchError } = await supabase
		.from('users')
		.select('*')
		.range((pageNumber - 1) * limit, pageNumber * limit - 1)
		.order('created_at', { ascending: false });

	// 获取image表中数据的条目数
	const { count } = await supabase.from('users').select('id', { count: 'exact' });

	if (fetchError) {
		console.error(error);
		error(Number(fetchError.code), { message: fetchError.message });
	}

	// 获取url中域名开始到page之间的字符串
	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	return {
		page: pageNumber,
		users: users,
		count: count ?? 0,
		limit: limit,
		path: path
	};
};
