export type Language = {
	id: number;
	lang: string;
	locale: string;
	is_default?: boolean | null;
};

export type Category = {
	id: number;
	title: string;
	slug: string;
};

export type AlbumImage = {
	id: number;
	alt: string | null;
	storage_key: string;
	caption?: string | null;
	prefix?: string;
};

export type AlbumPicture = {
	order: number;
	image: AlbumImage;
};

export type PhotoContent = {
	id?: number;
	title: string;
	slug: string;
	abstract: string;
	is_top: boolean;
	is_draft: boolean;
	is_featured: boolean;
	lang: number;
	topic: string[];
	content_json: Record<string, unknown>;
	content_html: string;
	content_text: string;
	cover: number | null;
	category?: number | null;
	photos: AlbumPicture[];
	published_at?: string | null;
};

export type OtherVersion = {
	id: number;
	lang: Language;
};

export type PageData = {
	prefix: string;
	currentLanguage: Language;
	photoContent: PhotoContent;
	categories: Category[];
	otherVersions: OtherVersion[];
	allLanguages: Language[];
};

export type SelectedImage = AlbumImage & { prefix: string };

export type PhotoImageInsert = {
	photo_id: number;
	image_id: number;
	order: number;
};
