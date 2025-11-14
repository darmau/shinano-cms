import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import type {
	AlbumImage,
	Category,
	Language,
	PhotoListItem,
	PhotoListPageData
} from '$lib/types/photo';

const normalizeLanguage = (lang: unknown): Language | null => {
	if (!lang || typeof lang !== 'object') {
		return null;
	}

	const {
		id,
		lang: langCode,
		locale,
		is_default
	} = lang as {
		id?: number;
		lang?: string;
		locale?: string;
		is_default?: boolean | null;
	};

	if (typeof id !== 'number' || typeof langCode !== 'string' || typeof locale !== 'string') {
		return null;
	}

	return {
		id,
		lang: langCode,
		locale,
		is_default: is_default ?? null
	};
};

const normalizeCategory = (category: unknown): Category | null => {
	if (!category || typeof category !== 'object') {
		return null;
	}

	const { id, title, slug } = category as { id?: number; title?: string; slug?: string };
	if (typeof id !== 'number' || typeof title !== 'string' || typeof slug !== 'string') {
		return null;
	}

	return { id, title, slug };
};

const normalizeAlbumImage = (image: unknown): AlbumImage | null => {
	if (!image || typeof image !== 'object') {
		return null;
	}

	const { id, alt, storage_key, caption } = image as {
		id?: number;
		alt?: string | null;
		storage_key?: string;
		caption?: string | null;
	};

	if (typeof id !== 'number' || typeof storage_key !== 'string') {
		return null;
	}

	return {
		id,
		alt: alt ?? null,
		storage_key,
		caption: caption ?? null
	};
};

const toPhotoListItem = (photo: unknown): PhotoListItem | null => {
	if (!photo || typeof photo !== 'object') {
		return null;
	}

	const { id, title, slug, is_draft, is_featured, is_top, lang, category, cover, photo_image } =
		photo as Record<string, unknown>;

	if (
		typeof id !== 'number' ||
		typeof title !== 'string' ||
		typeof slug !== 'string' ||
		typeof is_draft !== 'boolean' ||
		typeof is_featured !== 'boolean' ||
		typeof is_top !== 'boolean'
	) {
		return null;
	}

	const normalizedLang = normalizeLanguage(lang);
	if (!normalizedLang) {
		return null;
	}

	const normalizedCategory = normalizeCategory(category);
	const normalizedCover = normalizeAlbumImage(cover);
	const imageCount =
		Array.isArray(photo_image) && typeof photo_image[0]?.count === 'number'
			? photo_image[0].count
			: 0;

	return {
		id,
		title,
		slug,
		is_draft,
		is_featured,
		is_top,
		lang: normalizedLang,
		category: normalizedCategory,
		cover: normalizedCover,
		imageCount
	};
};

export const load: PageServerLoad = async ({ url, params: { lang, page }, locals: { supabase } }) => {
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
	  lang (id, lang, locale), 
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

	const photosList: PhotoListItem[] = (photos ?? [])
		.map((photo) => toPhotoListItem(photo))
		.filter((photo): photo is PhotoListItem => photo !== null);

	// 获取所有语言列表
	const { data: allLanguages, error: languagesError } = await supabase
		.from('language')
		.select('id, lang, locale')
		.order('id', { ascending: true });

	if (languagesError) {
		console.error('Error fetching languages:', languagesError);
	}

	// 获取当前语言信息
	const currentLanguage = allLanguages?.find((l) => l.lang === lang);

	const response: PhotoListPageData & {
		allLanguages: Array<{ id: number; lang: string; locale: string }>;
		currentLanguage: { id: number; lang: string; locale: string } | null;
	} = {
		page: pageNumber,
		prefix: URL_PREFIX,
		count: count ?? 0,
		photos: photosList,
		limit,
		path,
		allLanguages: allLanguages ?? [],
		currentLanguage: currentLanguage ?? null
	};

	return response;
};
