import type { PageServerLoad } from './$types';
import getDateFormat from '$lib/functions/dateFormat';
import { URL_PREFIX } from '$env/static/private';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
	const copyFromId = url.searchParams.get('from');
	const targetLangId = url.searchParams.get('lang');

	// 判断文章是全新的还是创建的其他语言版本
	const isCompleteNew = !copyFromId && !targetLangId;

	let currentLanguage;
	let articleContent;
	let categories;
	let otherVersions;
	let allLanguages;

	if (isCompleteNew) {
		// allLanguages 与 默认语言 查询互相独立，可并行
		const [allLanguagesRes, defaultLanguage] = await Promise.all([
			supabase.from('language').select('id, lang, locale'),
			supabase
				.from('language')
				.select('id, lang, locale')
				.eq('is_default', true)
				.single()
				.then((res) => res.data)
		]);
		allLanguages = allLanguagesRes.data;
		currentLanguage = defaultLanguage;

		// 根据defaultLanguage.data.id在category表中获取type为article的分类
		const defaultLanguageId = currentLanguage?.id ?? 1;
		categories = await supabase
			.from('category')
			.select('id, title, slug')
			.eq('lang', defaultLanguageId)
			.eq('type', 'article')
			.then((res) => res.data);

		otherVersions = [];

		const dateString = new Date().toISOString();
		articleContent = {
			title: 'title',
			subtitle: '',
			slug: getDateFormat(dateString, false),
			abstract: '',
			is_top: false,
			is_draft: true,
			is_featured: false,
			is_premium: false,
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
								text: '开始书写你的文章吧'
							}
						]
					}
				]
			},
			content_html: '<p>开始书写你的文章吧</p>',
			content_text: '开始书写你的文章吧'
		};
	} else {
		// allLanguages 与 源文章 查询互相独立，可并行
		const [allLanguagesRes, { data: sourceArticle, error: sourceError }] = await Promise.all([
			supabase.from('language').select('id, lang, locale'),
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
				.eq('id', copyFromId)
				.single()
		]);
		allLanguages = allLanguagesRes.data;
		currentLanguage = allLanguages?.find((lang) => lang.id === Number(targetLangId));

		if (sourceError) {
			console.error(sourceError);
			error(sourceError.code === 'PGRST116' ? 404 : 500, { message: sourceError.message });
		}

		articleContent = {
			title: sourceArticle!.title,
			subtitle: sourceArticle!.subtitle,
			slug: sourceArticle!.slug,
			abstract: sourceArticle!.abstract,
			is_top: sourceArticle!.is_top,
			is_draft: sourceArticle!.is_draft,
			is_featured: sourceArticle!.is_featured,
			is_premium: sourceArticle!.is_premium,
			lang: currentLanguage!.id,
			content_json: sourceArticle!.content_json,
			content_html: sourceArticle!.content_html,
			content_text: sourceArticle!.content_text,
			cover: sourceArticle!.cover,
			topic: sourceArticle!.topic,
			category: sourceArticle!.category,
			published_at: sourceArticle!.published_at
		};

		// categories 与 otherVersions 都只依赖 currentLanguage，可并行
		[categories, otherVersions] = await Promise.all([
			supabase
				.from('category')
				.select('id, title, slug')
				.eq('lang', currentLanguage!.id)
				.eq('type', 'article')
				.then((res) => res.data),
			supabase
				.from('article')
				.select('id, lang (id, lang, locale)')
				.eq('slug', articleContent.slug)
				.neq('lang', currentLanguage!.id)
				.then((res) => res.data)
		]);
	}

	return {
		prefix: URL_PREFIX,
		currentLanguage,
		articleContent,
		categories,
		otherVersions,
		allLanguages
	};
};
