import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import { parseIdParam } from '$lib/server/params';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const articleId = parseIdParam(params.id, '文章');

	const [{ data: articleData, error: articleError }, { data: allLanguages }] = await Promise.all([
		supabase
			.from('article')
			.select(
				`
		  id,
		  title,
		  subtitle,
		  slug,
		  content_json,
		  content_html,
		  content_text,
		  abstract,
		  is_top,
		  is_draft,
		  is_featured,
		  is_premium,
		  lang,
		  topic,
		  published_at,
		  category,
		  cover (id, alt, storage_key)
		`
			)
			.eq('id', articleId)
			.single(),
		supabase.from('language').select('id, lang, locale')
	]);

	if (articleError) {
		console.error('Error fetching article data:', articleError);
		error(articleError.code === 'PGRST116' ? 404 : 500, { message: articleError.message });
	}

	const currentLanguage = allLanguages?.find((lang) => lang.id === articleData.lang);

	const [categories, otherVersions] = await Promise.all([
		supabase
			.from('category')
			.select('id, title, slug')
			.eq('lang', currentLanguage!.id)
			.eq('type', 'article')
			.then((res) => res.data),
		// 查询article表中除了当前语言版本的其他语言版本 查询slug相等但lang不等于currentLanguage.id的文章
		supabase
			.from('article')
			.select('id, lang (id, lang, locale)')
			.eq('slug', articleData.slug)
			.neq('lang', currentLanguage!.id)
			.then((res) => res.data)
	]);

	return {
		prefix: URL_PREFIX,
		currentLanguage,
		articleContent: articleData,
		categories,
		otherVersions,
		allLanguages
	};
};
