import { URL_PREFIX } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type { ArticleListItem, ArticleListPageData } from '$lib/types/article';
import type { Language } from '$lib/types/photo';
import type { PageServerLoad } from './$types';

// 这里原本有 65 行手写的运行时规范化器（逐个字段 typeof 校验后重新组装）。
// 客户端加上 Database 泛型之后，select 的返回值从源头就有类型，那些校验既多余
// 又有害：它对任何不合预期的行直接返回 null 并被 filter 掉，于是数据在库里、
// 在后台却不存在。现在缺字段是编译期错误，不是运行时的静默丢弃。

export const load: PageServerLoad = async ({
	url,
	params: { lang, page },
	locals: { supabase }
}) => {
	const pageNumber = Number(page);
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 12;

	const { count, error: countError } = await supabase
		.from('article')
		.select('id, language!inner (lang)', { count: 'exact', head: true })
		.eq('language.lang', lang);

	if (countError) {
		throw error(500, { message: countError.message });
	}

	const { data: articles, error: fetchError } = await supabase
		.from('article')
		.select(
			`id, title, subtitle, lang (id, locale), slug, category (id, title), is_draft, is_featured, is_top, is_premium, language!inner (lang)`
		)
		.eq('language.lang', lang)
		.range((pageNumber - 1) * limit, pageNumber * limit - 1)
		.order('updated_at', { ascending: false });

	if (fetchError) {
		throw error(500, { message: fetchError.message });
	}

	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	const articleList: ArticleListItem[] = (articles ?? []).map((article) => ({
		id: article.id,
		title: article.title,
		subtitle: article.subtitle,
		slug: article.slug,
		lang: article.lang,
		category: article.category,
		is_draft: article.is_draft ?? true,
		is_featured: article.is_featured ?? false,
		is_top: article.is_top ?? false,
		is_premium: article.is_premium ?? false
	}));

	// 获取所有语言列表
	const { data: allLanguages, error: languagesError } = await supabase
		.from('language')
		.select('id, lang, locale, is_default')
		.order('id', { ascending: true });

	if (languagesError) {
		throw error(500, { message: languagesError.message });
	}

	const currentLanguage = allLanguages.find((l) => l.lang === lang) ?? null;

	return {
		page: pageNumber,
		prefix: URL_PREFIX,
		count: count ?? 0,
		articles: articleList,
		limit,
		path,
		allLanguages,
		currentLanguage
	} satisfies ArticleListPageData & {
		allLanguages: Language[];
		currentLanguage: Language | null;
	};
};
