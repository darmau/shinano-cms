import type { TypedSupabaseClient } from '$lib/supabaseClient';
import type { Json, TablesInsert } from '$lib/types/database';

export type AlbumImageInput = {
	image_id: number;
	order: number;
};

export type SavePhotoResult = { ok: true; photoId: number } | { ok: false; message: string };

/**
 * 保存相册（含图片与排序），整个过程在数据库端的一个事务里完成。
 *
 * 见 supabase/migrations/20260807040000_p2_save_photo_atomically.sql：
 * 此前是三次独立请求（改 photo → 删光 photo_image → 重新插入），
 * 删成功而插失败会让相册的图片和排序永久消失。
 *
 * p_photo / p_images 走 jsonb，所以这里要把行对象转成 Json —— 两者结构上一致，
 * 只是 TS 证不出来。
 */
export async function savePhotoWithImages(
	supabase: TypedSupabaseClient,
	params: {
		photo: TablesInsert<'photo'>;
		images: AlbumImageInput[];
		photoId?: number | null;
	}
): Promise<SavePhotoResult> {
	const { data, error } = await supabase.rpc('save_photo_with_images', {
		p_photo: params.photo as unknown as Json,
		p_images: params.images as unknown as Json,
		// 新建相册时不传 p_photo_id，函数的默认值是 null
		...(params.photoId ? { p_photo_id: params.photoId } : {})
	});

	if (error) {
		console.error('save_photo_with_images failed:', error);
		return { ok: false, message: error.message };
	}

	if (typeof data !== 'number') {
		return { ok: false, message: '保存相册失败：数据库没有返回相册 id。' };
	}

	return { ok: true, photoId: data };
}
