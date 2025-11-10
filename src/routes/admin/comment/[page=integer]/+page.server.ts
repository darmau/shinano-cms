import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { BASE_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ url,params: { page }, locals: { supabase } }) => {
	const pageNumber = Number(page)
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 16

	const { data: comments, error: fetchError } = await supabase
	.from('comment')
	.select(`
	  id,
	  user_id (name),
	  name,
	  email,
	  website,
	  content_text,
	  is_public,
	  is_blocked,
	  is_anonymous,
	  created_at,
	  to_article (title, slug, language!inner (lang)),
	  to_photo (title, slug, language!inner (lang)),
	  to_thought (content_text, slug),
		ip_info
	`)
	.range((pageNumber - 1) * limit, pageNumber * limit - 1)
	.order('is_public', { ascending: true })
	.order('created_at', { ascending: false });

	// 获取image表中数据的条目数
	const { count } = await supabase.from('comment').select('id', { count: 'exact' });

	if (fetchError) {
		console.error(error);
		error(Number(fetchError.code), { message: fetchError.message })
	}

	// 获取url中域名开始到page之间的字符串
	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	return {
		page: pageNumber,
		comments: comments,
		count: count ?? 0,
		limit: limit,
		path: path,
		baseUrl: BASE_URL,
	};
};
