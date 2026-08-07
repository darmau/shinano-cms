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
 * ⚠️ 临时类型垫片：`pnpm db:types` 是对着生产库生成的，在迁移应用到生产库之前，
 *    database.ts 里还没有 save_photo_with_images。应用迁移后重新跑一次
 *    `pnpm db:types`，就可以把下面这个 cast 删掉，直接 supabase.rpc(...) 即可。
 */
export async function savePhotoWithImages(
	supabase: TypedSupabaseClient,
	params: {
		photo: TablesInsert<'photo'>;
		images: AlbumImageInput[];
		photoId?: number | null;
	}
): Promise<SavePhotoResult> {
	const rpc = supabase.rpc as unknown as (
		fn: 'save_photo_with_images',
		args: { p_photo: Json; p_images: Json; p_photo_id: number | null }
	) => PromiseLike<{ data: number | null; error: { message: string } | null }>;

	const { data, error } = await rpc('save_photo_with_images', {
		p_photo: params.photo as unknown as Json,
		p_images: params.images as unknown as Json,
		p_photo_id: params.photoId ?? null
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
