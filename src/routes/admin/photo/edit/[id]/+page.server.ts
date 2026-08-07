import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import { parseIdParam } from '$lib/server/params';
import { deleteRows, parseIds } from '$lib/server/actions';
import { toEditorContent } from '$lib/functions/editorContent';
import type { AlbumPicture, PageData, PhotoContent } from '$lib/types/photo';

// 这里原本有 115 行运行时规范化器（normalizeLanguage / normalizeCategory /
// normalizeAlbumImage / mapPhotoImages）。生成数据库类型之后它们全部多余——
// 而且它们的失败模式很糟：任何不合预期的行被静默丢弃，编辑器打开后看起来像
// "图片丢了"，实际上数据一直在库里。

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const photoId = parseIdParam(params.id, '相册');

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
		error(photoError.code === 'PGRST116' ? 404 : 500, { message: photoError.message });
	}

	const { data: allLanguages, error: languagesError } = await supabase
		.from('language')
		.select('id, lang, locale, is_default');

	if (languagesError) {
		error(500, { message: languagesError.message });
	}

	const currentLanguage = allLanguages.find((lang) => lang.id === sourcePhoto.lang);

	if (!currentLanguage) {
		error(500, { message: 'Language not found for photo' });
	}

	// photo_image 的 order 可空，排序时按 0 处理，避免顺序随查询结果漂移
	const photos: AlbumPicture[] = (sourcePhoto.photo_image ?? [])
		.map((item) => ({ order: item.order ?? 0, image: item.image }))
		.sort((a, b) => a.order - b.order);

	const photoContent: PhotoContent = {
		id: sourcePhoto.id,
		title: sourcePhoto.title,
		slug: sourcePhoto.slug,
		abstract: sourcePhoto.abstract ?? '',
		is_top: sourcePhoto.is_top ?? false,
		is_draft: sourcePhoto.is_draft ?? true,
		is_featured: sourcePhoto.is_featured ?? false,
		lang: currentLanguage.id,
		content_json: toEditorContent(sourcePhoto.content_json),
		content_html: sourcePhoto.content_html ?? '',
		content_text: sourcePhoto.content_text ?? '',
		cover: sourcePhoto.cover,
		photos,
		topic: sourcePhoto.topic ?? [],
		category: sourcePhoto.category,
		published_at: sourcePhoto.published_at
	};

	const { data: categories, error: categoriesError } = await supabase
		.from('category')
		.select('id, title, slug')
		.eq('lang', currentLanguage.id)
		.eq('type', 'photo');

	if (categoriesError) {
		error(500, { message: categoriesError.message });
	}

	// 查询photo表中除了当前语言版本的其他语言版本 查询slug相等但lang不等于currentLanguage.id的相册
	const { data: otherVersions, error: versionsError } = await supabase
		.from('photo')
		.select('id, lang (id, lang, locale, is_default)')
		.eq('slug', sourcePhoto.slug)
		.neq('lang', currentLanguage.id);

	if (versionsError) {
		error(500, { message: versionsError.message });
	}

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

export const actions: Actions = {
	delete: async ({ request, locals: { supabase } }) => {
		const ids = parseIds(await request.formData());

		if (!ids) {
			return fail(400, { message: '请求缺少有效的 id。' });
		}

		return deleteRows(supabase, 'photo', ids, '相册');
	}
};
