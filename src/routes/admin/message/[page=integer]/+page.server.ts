import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const pageNumber = Number(page);
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 16;

	const [{ data: messages, error: fetchError }, { count }] = await Promise.all([
		supabase
			.from('message')
			.select('id, name, message, contact_type, contact_detail, created_at, is_read')
			.range((pageNumber - 1) * limit, pageNumber * limit - 1)
			.order('is_read', { ascending: true })
			.order('created_at', { ascending: false }),
		supabase.from('message').select('id', { count: 'exact' })
	]);

	if (fetchError) {
		console.error(fetchError);
		error(500, { message: fetchError.message });
	}

	// 获取url中域名开始到page之间的字符串
	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	return {
		page: pageNumber,
		messages: messages,
		count: count ?? 0,
		limit: limit,
		path: path
	};
};
