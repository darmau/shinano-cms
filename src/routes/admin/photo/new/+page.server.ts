import type { PageServerLoad } from './$types';
import getDateFormat from '$lib/functions/dateFormat';
import { URL_PREFIX } from '$env/static/private';
import { error } from '@sveltejs/kit';
import { parseIdParam } from '$lib/server/params';
import { toEditorContent } from '$lib/functions/editorContent';
import type { AlbumPicture, Language, PageData, PhotoContent } from '$lib/types/photo';

// 运行时规范化器已由生成的数据库类型取代，见 photo/edit/[id]/+page.server.ts 的说明。

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
	const copyFromId = url.searchParams.get('from');
	const targetLangId = url.searchParams.get('lang');

	// 判断摄影是全新的还是创建的其他语言版本
	const isCompleteNew = !copyFromId && !targetLangId;

	const { data: allLanguages, error: languagesError } = await supabase
		.from('language')
		.select('id, lang, locale, is_default');

	if (languagesError) {
		error(500, { message: languagesError.message });
	}

	if (!allLanguages.length) {
		error(500, { message: 'No languages configured.' });
	}

	let currentLanguage: Language | undefined;
	let photoContent: PhotoContent;
	let categories: PageData['categories'] = [];
	let otherVersions: PageData['otherVersions'] = [];

	if (isCompleteNew) {
		// 默认语言直接从已经拉到的列表里挑，省一次往返；库里保证只有一条 is_default
		currentLanguage = allLanguages.find((lang) => lang.is_default) ?? allLanguages[0];

		const defaultLanguageId = currentLanguage.id;
		const { data: categoryList, error: categoryError } = await supabase
			.from('category')
			.select('id, title, slug')
			.eq('lang', defaultLanguageId)
			.eq('type', 'photo');

		if (categoryError) {
			error(500, { message: categoryError.message });
		}

		categories = categoryList;

		const dateString = new Date().toISOString();

		photoContent = {
			title: 'title',
			slug: getDateFormat(dateString, false),
			abstract: '',
			is_top: false,
			is_draft: true,
			is_featured: false,
			lang: defaultLanguageId,
			topic: [],
			content_json: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: '添加关于摄影的介绍'
							}
						]
					}
				]
			},
			content_html: '<p>添加关于摄影的介绍</p>',
			content_text: '添加关于摄影的介绍',
			photos: [],
			cover: null,
			category: null,
			published_at: null
		};
	} else {
		currentLanguage = allLanguages.find((lang) => lang.id === Number(targetLangId));

		// 从photo表获取数据
		const { data: sourcePhoto, error: sourceError } = await supabase
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
			.eq('id', parseIdParam(copyFromId ?? '', '源相册'))
			.single();

		if (sourceError) {
			console.error(sourceError);
			error(sourceError.code === 'PGRST116' ? 404 : 500, { message: sourceError.message });
		}

		if (!currentLanguage) {
			currentLanguage = allLanguages.find((lang) => lang.id === sourcePhoto.lang);
		}

		if (!currentLanguage) {
			error(500, { message: 'Language not found for photo' });
		}

		const photos: AlbumPicture[] = (sourcePhoto.photo_image ?? [])
			.map((item) => ({ order: item.order ?? 0, image: item.image }))
			.sort((a, b) => a.order - b.order);

		photoContent = {
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

		// 查询category表中type为photo，lang为currentLanguage.id的分类
		const { data: categoryList, error: categoryError } = await supabase
			.from('category')
			.select('id, title, slug')
			.eq('lang', currentLanguage.id)
			.eq('type', 'photo');

		if (categoryError) {
			error(500, { message: categoryError.message });
		}

		categories = categoryList;

		// 查询photo表中除了当前语言版本的其他语言版本 查询slug相等但lang不等于currentLanguage.id的相册
		const { data: versions, error: versionsError } = await supabase
			.from('photo')
			.select('id, lang (id, lang, locale, is_default)')
			.eq('slug', photoContent.slug)
			.neq('lang', currentLanguage.id);

		if (versionsError) {
			error(500, { message: versionsError.message });
		}

		otherVersions = versions;
	}

	const response: PageData = {
		prefix: URL_PREFIX,
		currentLanguage: currentLanguage ?? allLanguages[0],
		photoContent,
		categories,
		otherVersions,
		allLanguages
	};

	return response;
};
