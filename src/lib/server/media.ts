import { error } from '@sveltejs/kit';

/**
 * storage_key 在 schema 里是 UUID，由 uploadToR2 用 crypto.randomUUID() 生成。
 * 校验这一点可以阻止调用方把任意路径（`../`、绝对 URL）当成对象键传下去。
 */
const STORAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// 与 FileDropzone.svelte 的 accept 属性保持一致，另外补上手机常见的 HEIC/HEIF。
// 这里的目的是挡住"任意文件上传"，不是收窄现有的可用格式。
//
// 注意 image/svg+xml：SVG 可以内嵌脚本，是既有行为所以保留，但对象由 URL_PREFIX
// 指向的 CDN 域名提供，与后台不同源，因此不构成后台的 XSS 路径。
// 如果将来把 R2 挂到同源路径下，需要重新评估这一条。
const ALLOWED_UPLOAD_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/avif',
	'image/gif',
	'image/svg+xml',
	'image/heic',
	'image/heif'
]);

export function isValidStorageKey(value: unknown): value is string {
	return typeof value === 'string' && STORAGE_KEY_PATTERN.test(value);
}

export function isAllowedUploadType(mimeType: string): boolean {
	return ALLOWED_UPLOAD_TYPES.has(mimeType);
}

/**
 * 校验一批 storage key，任何一个不合法就整体拒绝。
 * 逐个过滤会让"删 10 个键其中 3 个非法"这种请求静默地部分执行。
 */
export function assertStorageKeys(value: unknown): string[] {
	const keys = Array.isArray(value) ? value : [];

	if (!keys.length) {
		error(400, 'Bad request: Missing `keys`');
	}

	const invalid = keys.filter((key) => !isValidStorageKey(key));

	if (invalid.length) {
		error(400, `Bad request: ${invalid.length} invalid storage key(s)`);
	}

	return keys as string[];
}
