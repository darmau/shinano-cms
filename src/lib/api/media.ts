import type { SupabaseClient } from '@supabase/supabase-js';

export type MediaImageRecord = {
	id: number;
	storage_key: string;
	alt: string | null;
	caption?: string | null;
	width?: number | null;
	height?: number | null;
};

type UploadParams = {
	file: File;
	width?: number | null;
	height?: number | null;
};

export async function uploadImageFile({
	file,
	width,
	height
}: UploadParams): Promise<MediaImageRecord> {
	const formData = new FormData();
	formData.append('file', file);

	if (width != null) {
		formData.append('width', String(width));
	}

	if (height != null) {
		formData.append('height', String(height));
	}

	const response = await fetch('/api/image', {
		method: 'POST',
		body: formData
	});

	if (!response.ok) {
		const message = await response.text().catch(() => 'Failed to upload image');
		throw new Error(message || 'Failed to upload image');
	}

	const payload = await response.json();
	const [record] = Array.isArray(payload) ? payload : [];

	if (!record?.id) {
		throw new Error('Upload succeeded but no image record was returned');
	}

	return {
		id: record.id,
		storage_key: record.storage_key,
		alt: (record.alt as string | null) ?? null,
		caption: (record.caption as string | null) ?? null,
		width: (record.width as number | null) ?? null,
		height: (record.height as number | null) ?? null
	};
}

export async function updateImageMetadata(
	supabase: SupabaseClient | null,
	imageId: number,
	metadata: Partial<Pick<MediaImageRecord, 'alt' | 'caption'>>
): Promise<MediaImageRecord | null> {
	if (!supabase) {
		return null;
	}

	const { data, error } = await supabase
		.from('image')
		.update(metadata)
		.eq('id', imageId)
		.select()
		.maybeSingle();

	if (error) {
		console.error('Failed to update image metadata', error);
		return null;
	}

	if (!data) {
		return null;
	}

	return {
		id: data.id,
		storage_key: data.storage_key,
		alt: (data.alt as string | null) ?? null,
		caption: (data.caption as string | null) ?? null,
		width: (data.width as number | null) ?? null,
		height: (data.height as number | null) ?? null
	};
}
