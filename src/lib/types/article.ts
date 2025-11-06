import type { Language } from './photo';

export type ArticleLanguage = Pick<Language, 'id' | 'locale'>;

export type ArticleCategory = { id: number; title: string } | null;

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
