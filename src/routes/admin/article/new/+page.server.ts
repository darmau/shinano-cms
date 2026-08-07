import type { PageServerLoad } from './$types';
import getDateFormat from '$lib/functions/dateFormat';
import { URL_PREFIX } from '$env/static/private';
import { error } from '@sveltejs/kit';
import { parseIdParam } from '$lib/server/params';

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
				.eq('id', parseIdParam(copyFromId ?? '', '源文章'))
				.single()
		]);
		if (allLanguagesRes.error) {
			error(500, { message: allLanguagesRes.error.message });
		}

		allLanguages = allLanguagesRes.data;

		if (sourceError) {
			console.error(sourceError);
			error(sourceError.code === 'PGRST116' ? 404 : 500, { message: sourceError.message });
		}

		// 目标语言由 ?lang= 指定；缺省或指向一门不存在的语言时退回源文章的语言，
		// 而不是靠 currentLanguage! 断言出一个运行时崩溃
		currentLanguage =
			allLanguages.find((lang) => lang.id === Number(targetLangId)) ??
			allLanguages.find((lang) => lang.id === sourceArticle.lang);

		if (!currentLanguage) {
			error(500, { message: `语言 ${targetLangId ?? sourceArticle.lang} 在 language 表中不存在` });
		}

		articleContent = {
			title: sourceArticle.title,
			subtitle: sourceArticle.subtitle,
			slug: sourceArticle.slug,
			abstract: sourceArticle.abstract,
			is_top: sourceArticle.is_top,
			is_draft: sourceArticle.is_draft,
			is_featured: sourceArticle.is_featured,
			is_premium: sourceArticle.is_premium,
			lang: currentLanguage.id,
			content_json: sourceArticle.content_json,
			content_html: sourceArticle.content_html,
			content_text: sourceArticle.content_text,
			cover: sourceArticle.cover,
			topic: sourceArticle.topic,
			category: sourceArticle.category,
			published_at: sourceArticle.published_at
		};

		// categories 与 otherVersions 都只依赖 currentLanguage，可并行
		const [categoriesRes, versionsRes] = await Promise.all([
			supabase
				.from('category')
				.select('id, title, slug')
				.eq('lang', currentLanguage.id)
				.eq('type', 'article'),
			supabase
				.from('article')
				.select('id, lang (id, lang, locale)')
				.eq('slug', articleContent.slug)
				.neq('lang', currentLanguage.id)
		]);

		if (categoriesRes.error) {
			error(500, { message: categoriesRes.error.message });
		}

		categories = categoriesRes.data;
		otherVersions = versionsRes.data;
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
