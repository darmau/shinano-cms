import type { JSONContent } from '@tiptap/core';
import type { Language } from './photo';

export type ArticleLanguage = Pick<Language, 'id' | 'locale'>;

export type ArticleCategory = { id: number; title: string } | null;

export type ArticleCoverImage = {
	id: number;
	alt: string | null;
	storage_key: string;
};

export type ArticleContentRecord = {
	id?: number;
	title: string;
	subtitle: string | null;
	slug: string;
	content_json: JSONContent;
	content_html: string;
	content_text: string;
	abstract: string;
	is_top: boolean;
	is_draft: boolean;
	is_featured: boolean;
	is_premium: boolean;
	lang: number;
	topic: string[] | null;
	published_at: string | null;
	category: number | null;
	cover: ArticleCoverImage | null;
	updated_at?: string;
};

export type ArticleContent = Omit<ArticleContentRecord, 'topic' | 'cover'> & {
	topic: string[];
	cover: number | null;
};

export type ArticleVersion = {
	id: number;
	lang: Language;
};

export type ArticleEditorCategory = {
	id: number;
	title: string;
	slug: string;
};

export type ArticleEditorPageData = {
	prefix: string;
	currentLanguage: Language;
	articleContent: ArticleContentRecord;
	categories: ArticleEditorCategory[];
	otherVersions: ArticleVersion[];
	allLanguages: Language[];
};

export type ArticleListItem = {
	id: number;
	title: string;
	subtitle: string | null;
	slug: string;
	lang: ArticleLanguage;
	category: ArticleCategory;
	is_draft: boolean;
	is_featured: boolean;
	is_top: boolean;
	is_premium: boolean;
};

export type ArticleListPageData = {
	prefix: string;
	page: number;
	count: number;
	limit: number;
	path: string;
	articles: ArticleListItem[];
};
