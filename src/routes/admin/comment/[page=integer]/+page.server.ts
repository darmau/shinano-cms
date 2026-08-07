import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { BASE_URL } from '$env/static/private';
import { getPagination } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const { page: pageNumber, limit, from, to, path } = getPagination(url, page);

	const [{ data: comments, error: fetchError }, { count, error: countError }] = await Promise.all([
		supabase
			.from('comment')
			.select(
				`
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
	`
			)
			.range(from, to)
			.order('is_public', { ascending: true })
			.order('created_at', { ascending: false }),
		supabase.from('comment').select('id', { count: 'exact', head: true })
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
		comments,
		count: count ?? 0,
		limit,
		path,
		baseUrl: BASE_URL
	};
};
