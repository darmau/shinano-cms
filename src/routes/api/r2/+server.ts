import { error, json, type RequestHandler } from '@sveltejs/kit';
import { deleteFromR2, getR2Bucket, type CfPlatform, uploadToR2 } from '$lib/server/r2';
import { requireAdmin } from '$lib/server/auth';
import { MAX_UPLOAD_BYTES, assertStorageKeys, isAllowedUploadType } from '$lib/server/media';

// 注意：这两个 handler 在应用内没有任何调用方，是 "Remove workers (#58)" 迁移
// 留下的脚手架 —— 实际上传走的是 /api/image。它们不接触数据库，因此 RLS 对其
// 完全无效，只能靠这里的显式校验。确认前台也不依赖后可以整个删掉。

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	await requireAdmin(locals);

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) {
		error(400, 'Bad request: Missing `file`');
	}

	if (!isAllowedUploadType(file.type)) {
		error(415, `Unsupported media type: ${file.type || 'unknown'}`);
	}

	if (file.size > MAX_UPLOAD_BYTES) {
		error(413, `File too large: ${file.size} bytes (max ${MAX_UPLOAD_BYTES})`);
	}

	const width = toOptionalString(formData.get('width'));
	const height = toOptionalString(formData.get('height'));
	const bucket = getR2Bucket(platform as CfPlatform);

	if (!bucket) {
		error(500, 'R2 bucket binding is not configured');
	}

	const { storageKey } = await uploadToR2({
		bucket,
		file,
		metadata: {
			width,
			height
		}
	});

	return json({ storage_key: storageKey });
};

export const DELETE: RequestHandler = async ({ request, locals, platform }) => {
	await requireAdmin(locals);

	const bucket = getR2Bucket(platform as CfPlatform);

	if (!bucket) {
		error(500, 'R2 bucket binding is not configured');
	}

	const payload = await safeJson(request);
	const keys = assertStorageKeys(payload?.keys);

	await deleteFromR2(bucket, keys);

	return json({
		message: `Successfully deleted ${keys.length} files`,
		deleted: keys.length
	});
};

function toOptionalString(value: FormDataEntryValue | null) {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	return undefined;
}

async function safeJson(request: Request) {
	try {
		return await request.json();
	} catch {
		return null;
	}
}
