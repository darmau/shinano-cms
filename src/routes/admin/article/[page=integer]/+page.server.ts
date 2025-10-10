import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async ({ url, params: { page }, locals }) => {
	const { session } = await locals.safeGetSession();
	if (!session) {
		throw error(303, 'Unauthorized');
	}

	const pageNumber = Number(page);
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 12;

	const supabase = locals.supabase;

	const { count, error: countError } = await supabase
		.from('article')
		.select('id', { count: 'exact', head: true });

	if (countError) {
		throw error(countError.status ?? 500, { message: countError.message });
	}

	const { data: articles, error: fetchError } = await supabase
		.from('article')
		.select(`id, title, subtitle, lang (id, locale), slug, category (id, title), is_draft, is_featured, is_top, is_premium`)
		.range((pageNumber - 1) * limit, pageNumber * limit - 1)
		.order('updated_at', { ascending: false });

	if (fetchError) {
		throw error(fetchError.status ?? 500, { message: fetchError.message });
	}

	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	return {
		page: pageNumber,
		prefix: URL_PREFIX,
		count: count ?? 0,
		articles: articles ?? [],
		limit,
		path
	};
};
