import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import { parseIdParam } from '$lib/server/params';
import { deleteRows, parseIds } from '$lib/server/actions';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const articleId = parseIdParam(params.id, '文章');

	const [
		{ data: articleData, error: articleError },
		{ data: allLanguages, error: languagesError }
	] = await Promise.all([
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

	if (languagesError) {
		error(500, { message: languagesError.message });
	}

	const currentLanguage = allLanguages.find((lang) => lang.id === articleData.lang);

	// 原来这里是 currentLanguage!.id。文章的 lang 是 RESTRICT 外键，正常情况下语言行
	// 一定在——但"正常情况下"不是断言的理由：真出问题时 ! 换来的是一个没有上下文的
	// 未捕获 500，而不是一句能照着查的错误。
	if (!currentLanguage) {
		error(500, {
			message: `文章 ${articleId} 的语言（lang=${articleData.lang}）在 language 表中不存在`
		});
	}

	const [{ data: categories, error: categoriesError }, { data: otherVersions }] = await Promise.all(
		[
			supabase
				.from('category')
				.select('id, title, slug')
				.eq('lang', currentLanguage.id)
				.eq('type', 'article'),
			// 查询article表中除了当前语言版本的其他语言版本 查询slug相等但lang不等于currentLanguage.id的文章
			supabase
				.from('article')
				.select('id, lang (id, lang, locale)')
				.eq('slug', articleData.slug)
				.neq('lang', currentLanguage.id)
		]
	);

	if (categoriesError) {
		error(500, { message: categoriesError.message });
	}

	return {
		prefix: URL_PREFIX,
		currentLanguage,
		articleContent: articleData,
		categories,
		otherVersions,
		allLanguages
	};
};

export const actions: Actions = {
	delete: async ({ request, locals: { supabase } }) => {
		const ids = parseIds(await request.formData());

		if (!ids) {
			return fail(400, { message: '请求缺少有效的 id。' });
		}

		return deleteRows(supabase, 'article', ids, '文章');
	}
};
