import type { AlbumImage } from './photo';

export type ThoughtImage = {
	order: number;
	image: AlbumImage;
};

export type ThoughtContentBase = {
	id?: number;
	content_json: Record<string, unknown>;
	content_html: string;
	content_text: string;
	topic?: string[];
	images?: ThoughtImage[];
};

export type ThoughtContent = ThoughtContentBase & {
	topic: string[];
	images: ThoughtImage[];
};

export type ThoughtPageData = {
	prefix: string;
	thoughtContent: ThoughtContentBase;
};

export type ThoughtEditPageData = ThoughtPageData;

export type ThoughtImageInsert = {
	thought_id: number;
	image_id: number;
	order: number;
};

export type ThoughtListItem = {
	id: number;
	slug: string | null;
	created_at: string;
	content_text: string;
	thought_image: Array<{ count: number }>;
};

export type ThoughtListPageData = {
	prefix: string;
	page: number;
	count: number;
	thoughts: ThoughtListItem[];
	limit: number;
	path: string;
};
