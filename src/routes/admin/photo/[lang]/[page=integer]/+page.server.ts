import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import type { Language, PhotoListItem, PhotoListPageData } from '$lib/types/photo';

// 同 article 列表：原先的 110 行运行时规范化器已由生成的数据库类型取代。

export const load: PageServerLoad = async ({
	url,
	params: { lang, page },
	locals: { supabase }
}) => {
	const pageNumber = Number(page);
	const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 12;

	// 获取photo表中当前语言的数据条目数
	const { count, error: countError } = await supabase
		.from('photo')
		.select('id, language!inner (lang)', { count: 'exact', head: true })
		.eq('language.lang', lang);

	if (countError) {
		throw error(500, { message: countError.message });
	}

	// 同时获取photo_image表中photo_id为photo表中id的数据数量
	const { data: photos, error: fetchError } = await supabase
		.from('photo')
		.select(
			`
	  id,
	  title,
	  lang (id, lang, locale, is_default),
	  slug,
	  category (id, title, slug),
	  is_draft,
	  is_featured,
	  is_top,
	  cover (id, alt, storage_key, caption),
	  photo_image (count),
	  language!inner (lang)
	  `
		)
		.eq('language.lang', lang)
		.range((pageNumber - 1) * limit, pageNumber * limit - 1)
		.order('updated_at', { ascending: false });

	if (fetchError) {
		throw error(500, { message: fetchError.message });
	}

	const path = url.pathname.substring(0, url.pathname.indexOf(page) - 1);

	const photosList: PhotoListItem[] = (photos ?? []).map((photo) => ({
		id: photo.id,
		title: photo.title,
		slug: photo.slug,
		is_draft: photo.is_draft ?? true,
		is_featured: photo.is_featured ?? false,
		is_top: photo.is_top ?? false,
		lang: photo.lang,
		category: photo.category,
		cover: photo.cover,
		imageCount: photo.photo_image[0]?.count ?? 0
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
		photos: photosList,
		limit,
		path,
		allLanguages,
		currentLanguage
	} satisfies PhotoListPageData & {
		allLanguages: Language[];
		currentLanguage: Language | null;
	};
};
