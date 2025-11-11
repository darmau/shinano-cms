import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import type {
	AlbumImage,
	AlbumPicture,
	Category,
	Language,
	PageData,
	PhotoContent
} from '$lib/types/photo';

function normalizeLanguage(lang: unknown): Language | null {
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
}

function normalizeCategory(category: unknown): Category | null {
	if (!category || typeof category !== 'object') {
		return null;
	}

	const { id, title, slug } = category as { id?: number; title?: string; slug?: string };
	if (typeof id !== 'number' || typeof title !== 'string' || typeof slug !== 'string') {
		return null;
	}

	return { id, title, slug };
}

function normalizeAlbumImage(image: unknown): AlbumImage | null {
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
}

function mapPhotoImages(images: unknown): AlbumPicture[] {
	if (!Array.isArray(images)) {
		return [];
	}

	const result: AlbumPicture[] = [];

	for (const item of images) {
		if (!item || typeof item !== 'object') {
			continue;
		}

		const { order, image } = item as {
			order?: number;
			image?: { id?: number; alt?: string | null; storage_key?: string; caption?: string | null };
		};

		if (typeof order !== 'number' || !image || typeof image !== 'object') {
			continue;
		}

		const { id, alt, storage_key, caption } = image as {
			id?: number;
			alt?: string | null;
			storage_key?: string;
			caption?: string | null;
		};

		if (typeof id !== 'number' || typeof storage_key !== 'string') {
			continue;
		}

		const picture: AlbumPicture = {
			order,
			image: {
				id,
				alt: alt ?? null,
				storage_key,
				caption: caption ?? null
			}
		};

		result.push(picture);
	}

	return result;
}

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const photoId = params.id;

	// 获取摄影数据 其中lang来自language表，需展开
	const { data: sourcePhoto, error: photoError } = await supabase
		.from('photo')
		.select(
			`
		  id,
		  title,
		  slug,
		  content_json,
		  content_html,
		  content_text,
		  abstract,
		  is_top,
		  is_draft,
		  is_featured,
		  lang,
		  topic,
		  published_at,
		  cover,
		  category,
		  photo_image (order, image (id, alt, storage_key, caption))
		`
		)
		.eq('id', photoId)
		.single();

	if (photoError) {
		console.error('Error fetching photo data:', photoError);
		error(Number(photoError.code), { message: photoError.message });
	}

	if (!sourcePhoto) {
		error(404, { message: 'Photo not found' });
	}

	const { data: allLanguagesRaw } = await supabase.from('language').select('id, lang, locale');

	const allLanguages = (allLanguagesRaw ?? [])
		.map(normalizeLanguage)
		.filter((lang): lang is Language => lang !== null);

	const currentLanguage = allLanguages.find((lang) => lang.id === sourcePhoto.lang);

	if (!currentLanguage) {
		error(500, { message: 'Language not found for photo' });
	}

	// 从photo_image表获取关联数据
	const photoContent: PhotoContent = {
		id: sourcePhoto.id,
		title: sourcePhoto.title,
		slug: sourcePhoto.slug,
		abstract: sourcePhoto.abstract,
		is_top: sourcePhoto.is_top,
		is_draft: sourcePhoto.is_draft,
		is_featured: sourcePhoto.is_featured,
		lang: currentLanguage.id,
		content_json: sourcePhoto.content_json,
		content_html: sourcePhoto.content_html,
		content_text: sourcePhoto.content_text,
		cover: normalizeAlbumImage(sourcePhoto.cover)?.id ?? null,
		photos: mapPhotoImages(sourcePhoto.photo_image ?? []),
		topic: sourcePhoto.topic ?? [],
		category: typeof sourcePhoto.category === 'number' ? sourcePhoto.category : null,
		published_at: sourcePhoto.published_at ?? null
	};

	const { data: categoriesRaw } = await supabase
		.from('category')
		.select('id, title, slug')
		.eq('lang', currentLanguage.id)
		.eq('type', 'photo');

	const categories = (categoriesRaw ?? [])
		.map(normalizeCategory)
		.filter((category): category is Category => category !== null);

	// 查询article表中除了当前语言版本的其他语言版本 查询slug相等但lang不等于currentLanguage.id的文章
	const { data: otherVersionsRaw } = await supabase
		.from('photo')
		.select('id, lang (id, lang, locale)')
		.eq('slug', sourcePhoto.slug)
		.neq('lang', currentLanguage.id);

	const otherVersions: PageData['otherVersions'] = (otherVersionsRaw ?? [])
		.map((version) => {
			const lang = normalizeLanguage(version.lang);
			return lang
				? {
						id: version.id,
						lang
					}
				: null;
		})
		.filter((version): version is PageData['otherVersions'][number] => version !== null);

	const response: PageData = {
		prefix: URL_PREFIX,
		currentLanguage,
		photoContent,
		categories,
		otherVersions,
		allLanguages
	};

	return response;
};
