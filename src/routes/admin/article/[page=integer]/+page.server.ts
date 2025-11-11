import { URL_PREFIX } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type {
	ArticleCategory,
	ArticleLanguage,
	ArticleListItem,
	ArticleListPageData
} from '$lib/types/article';
import type { PageServerLoad } from './$types';

const normalizeArticleLanguage = (lang: unknown): ArticleLanguage | null => {
	if (!lang || typeof lang !== 'object') {
		return null;
	}

	const { id, locale } = lang as { id?: unknown; locale?: unknown };
	if (typeof id !== 'number' || typeof locale !== 'string') {
		return null;
	}

	return { id, locale };
};

const normalizeArticleCategory = (category: unknown): ArticleCategory => {
	if (!category || typeof category !== 'object') {
		return null;
	}

	const { id, title } = category as { id?: unknown; title?: unknown };
	if (typeof id !== 'number' || typeof title !== 'string') {
		return null;
	}

	return { id, title };
};

const toArticleListItem = (article: unknown): ArticleListItem | null => {
	if (!article || typeof article !== 'object') {
		return null;
	}

	const { id, title, subtitle, slug, lang, category, is_draft, is_featured, is_top, is_premium } =
		article as Record<string, unknown>;

	if (
		typeof id !== 'number' ||
		typeof title !== 'string' ||
		typeof slug !== 'string' ||
		typeof is_draft !== 'boolean' ||
		typeof is_featured !== 'boolean' ||
		typeof is_top !== 'boolean' ||
		typeof is_premium !== 'boolean'
	) {
		return null;
	}

	const normalizedLang = normalizeArticleLanguage(lang);
	if (!normalizedLang) {
		return null;
	}

	const normalizedCategory = normalizeArticleCategory(category);

	return {
		id,
		title,
		subtitle: typeof subtitle === 'string' ? subtitle : null,
		slug,
		lang: normalizedLang,
		category: normalizedCategory,
		is_draft,
		is_featured,
		is_top,
		is_premium
	};
};

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
		throw error(500, { message: countError.message });
	}

	const { data: articles, error: fetchError } = await supabase
		.from('article')
		.select(
			`id, title, subtitle, lang (id, locale), slug, category (id, title), is_draft, is_featured, is_top, is_premium`
		)
		.range((pageNumber - 1) * limit, pageNumber * limit - 1)
		.order('updated_at', { ascending: false });

	if (fetchError) {
		throw error(500, { message: fetchError.message });
	}

	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	const articleList: ArticleListItem[] = (articles ?? [])
		.map((article) => toArticleListItem(article))
		.filter((item): item is ArticleListItem => item !== null);

	return {
		page: pageNumber,
		prefix: URL_PREFIX,
		count: count ?? 0,
		articles: articleList,
		limit,
		path
	} satisfies ArticleListPageData;
};
