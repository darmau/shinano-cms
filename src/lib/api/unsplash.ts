import type { SupabaseClient } from '@supabase/supabase-js';

export type UnsplashUser = {
	name?: string;
	username?: string;
	links?: {
		html?: string;
	};
};

export type UnsplashPhoto = {
	id: string;
	alt_description?: string | null;
	description?: string | null;
	urls: {
		raw: string;
		full: string;
		regular: string;
		small: string;
		thumb: string;
	};
	links: {
		download?: string;
		download_location: string;
		html?: string;
	};
	user: UnsplashUser;
	width?: number;
	height?: number;
};

export type UnsplashConfig = {
	accessKey: string;
	secretKey: string;
};

export type UploadedImageRecord = {
	id: number;
	storage_key: string;
	alt: string | null;
	caption?: string | null;
	width?: number | null;
	height?: number | null;
};

const CONFIG_ACCESS_KEY = 'config_UNSPLASH_ACCESS_KEY';
const CONFIG_SECRET_KEY = 'config_UNSPLASH_SECRET_KEY';

type ConfigRow = {
	key: string;
	value: string | null;
};

function toUniqueArray<T>(array: T[] | null | undefined) {
	if (!array) {
		return [];
	}
	return Array.from(new Set(array));
}

export async function loadUnsplashConfig(
	supabase: SupabaseClient | null
): Promise<UnsplashConfig> {
	if (!supabase) {
		return { accessKey: '', secretKey: '' };
	}

	const { data, error } = await supabase
		.from('config')
		.select('key, value')
		.in('key', [CONFIG_ACCESS_KEY, CONFIG_SECRET_KEY]);

	if (error) {
		console.error('Failed to load Unsplash config', error);
		return { accessKey: '', secretKey: '' };
	}

	const rows = (data ?? []) as ConfigRow[];
	const map = new Map(rows.map((row) => [row.key, row.value ?? '']));

	return {
		accessKey: map.get(CONFIG_ACCESS_KEY) ?? '',
		secretKey: map.get(CONFIG_SECRET_KEY) ?? ''
	};
}

type FetchPhotosParams = {
	accessKey: string;
	query?: string;
	perPage?: number;
};

type UnsplashSearchResponse = {
	results: UnsplashPhoto[];
	total: number;
	total_pages: number;
};

function buildUnsplashUrl(endpoint: string, params: Record<string, string | number | undefined>) {
	const url = new URL(endpoint);
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			url.searchParams.set(key, String(value));
		}
	});
	return url.toString();
}

export async function fetchUnsplashPhotos({
	accessKey,
	query,
	perPage = 24
}: FetchPhotosParams): Promise<UnsplashPhoto[]> {
	if (!accessKey) {
		throw new Error('Missing Unsplash access key');
	}

	const base =
		query && query.trim().length
			? buildUnsplashUrl('https://api.unsplash.com/search/photos', {
					query: query.trim(),
					per_page: perPage
				})
			: buildUnsplashUrl('https://api.unsplash.com/photos', {
					per_page: perPage,
					order_by: 'popular'
				});

	const url = new URL(base);
	url.searchParams.set('client_id', accessKey);

	const response = await fetch(url.toString());

	if (!response.ok) {
		throw new Error(`Unsplash request failed: ${response.status}`);
	}

	const payload = await response.json();

	if (query && query.trim().length) {
		const { results } = payload as UnsplashSearchResponse;
		return toUniqueArray(results);
	}

	return toUniqueArray(payload as UnsplashPhoto[]);
}

function deriveAltText(photo: UnsplashPhoto): string | null {
	const altCandidates = [
		photo.alt_description,
		photo.description,
		photo.user?.name ? `Photo by ${photo.user.name}` : undefined
	];

	for (const candidate of altCandidates) {
		if (candidate && candidate.trim().length) {
			return candidate.trim();
		}
	}

	return null;
}

function deriveCaption(photo: UnsplashPhoto): string | null {
	const { user } = photo;
	if (!user) {
		return null;
	}

	const name = user.name ?? user.username;
	if (!name) {
		return null;
	}

	const profileLink = user.links?.html ?? (user.username ? `https://unsplash.com/@${user.username}` : '');
	if (profileLink) {
		return `Photo by ${name} on Unsplash (${profileLink})`;
	}

	return `Photo by ${name} on Unsplash`;
}

function guessExtension(mimeType: string | undefined) {
	if (!mimeType) {
		return 'jpg';
	}

	if (mimeType === 'image/png') {
		return 'png';
	}

	if (mimeType === 'image/webp') {
		return 'webp';
	}

	if (mimeType === 'image/avif') {
		return 'avif';
	}

	return 'jpg';
}

type ImportParams = {
	photo: UnsplashPhoto;
	accessKey: string;
	supabase: SupabaseClient | null;
};

export async function importUnsplashPhoto({
	photo,
	accessKey,
	supabase
}: ImportParams): Promise<UploadedImageRecord> {
	if (!accessKey) {
		throw new Error('Missing Unsplash access key');
	}

	const downloadLocation = new URL(photo.links.download_location);
	downloadLocation.searchParams.set('client_id', accessKey);
	// Track download per Unsplash requirements, ignore response body
	await fetch(downloadLocation.toString()).catch((err) => {
		console.warn('Failed to notify Unsplash download', err);
	});

	const rawUrl = new URL(photo.urls.raw ?? photo.urls.full);
	rawUrl.searchParams.set('fm', 'jpg');
	rawUrl.searchParams.set('q', '90');

	const imageResponse = await fetch(rawUrl.toString());

	if (!imageResponse.ok) {
		throw new Error(`Failed to download Unsplash image: ${imageResponse.status}`);
	}

	const blob = await imageResponse.blob();
	const fileExtension = guessExtension(blob.type);
	const fileName = `${photo.id}.${fileExtension}`;
	const file = new File([blob], fileName, {
		type: blob.type || 'image/jpeg'
	});

	const formData = new FormData();
	formData.append('file', file);
	if (photo.width) {
		formData.append('width', String(photo.width));
	}
	if (photo.height) {
		formData.append('height', String(photo.height));
	}

	const uploadResponse = await fetch('/api/image', {
		method: 'POST',
		body: formData
	});

	if (!uploadResponse.ok) {
		throw new Error(`Failed to upload image to media library: ${uploadResponse.status}`);
	}

	const uploadPayload = await uploadResponse.json();
	const [record] = Array.isArray(uploadPayload) ? uploadPayload : [];

	if (!record?.id) {
		throw new Error('Upload succeeded but no image record was returned');
	}

	const alt = deriveAltText(photo);
	const caption = deriveCaption(photo);

	let finalRecord: UploadedImageRecord = {
		id: record.id,
		storage_key: record.storage_key,
		alt: alt ?? null,
		caption: caption ?? null,
		width: record.width ?? null,
		height: record.height ?? null
	};

	if (supabase) {
		const { data, error } = await supabase
			.from('image')
			.update({
				alt: alt ?? null,
				caption: caption ?? null
			})
			.eq('id', record.id)
			.select()
			.maybeSingle();

		if (error) {
			console.error('Failed to update image metadata with Unsplash info', error);
		} else if (data) {
			finalRecord = {
				id: data.id,
				storage_key: data.storage_key,
				alt: (data.alt as string | null) ?? finalRecord.alt,
				caption: (data.caption as string | null) ?? finalRecord.caption,
				width: (data.width as number | null) ?? finalRecord.width,
				height: (data.height as number | null) ?? finalRecord.height
			};
		}
	}

	return finalRecord;
}

