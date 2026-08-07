import { error, type RequestHandler } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';
import { requireAdmin } from '$lib/server/auth';
import { isValidStorageKey } from '$lib/server/media';

type WorkersAI = {
	run: (model: string, input: unknown, options?: { gateway?: { id: string } }) => Promise<unknown>;
};
type CfEnv = { AI?: WorkersAI } & Record<string, unknown>;
type CfPlatformWithAI = { env?: CfEnv } | undefined;

const DEFAULT_PROMPT =
	'Generate a caption for this image, do not try to guess the location, just describe the image.';

// 使用 Cloudflare Image Resizing 的最大宽度，减少内存占用
const MAX_IMAGE_WIDTH = 512;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	await requireAdmin(locals);

	const { storage_key, img_key } = await request.json();
	const targetKey = typeof storage_key === 'string' ? storage_key : img_key;

	// targetKey 会被拼进 /cdn-cgi/image/.../<source> 后由服务端 fetch。
	// Cloudflare 的 image resizing 接受绝对 URL 作为源，`../` 也能改写路径，
	// 所以未经校验的键就是一个 SSRF 原语。先卡格式，再确认它确实是我们自己的对象。
	if (!isValidStorageKey(targetKey)) {
		error(400, 'Invalid image key');
	}

	const supabase = locals.supabase;

	const { data: imageRow, error: lookupError } = await supabase
		.from('image')
		.select('storage_key')
		.eq('storage_key', targetKey)
		.maybeSingle<{ storage_key: string }>();

	if (lookupError) {
		console.error(lookupError);
		error(500, 'Failed to look up image');
	}

	if (!imageRow) {
		error(404, 'Image not found');
	}

	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('value')
		.eq('key', 'prompt_IMAGE_ALT')
		.maybeSingle<{ value: string | null }>();

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const prompt = data?.value ?? DEFAULT_PROMPT;

	const env = (platform as CfPlatformWithAI)?.env;
	const aiBinding = env?.AI;

	if (!aiBinding) {
		error(500, 'Workers AI binding not configured');
	}

	// 使用 Cloudflare Image Resizing 来压缩图片，大幅降低内存使用
	// 格式：https://domain.com/cdn-cgi/image/width=512,format=jpeg/image-key
	const resizedImageUrl = `${URL_PREFIX}/cdn-cgi/image/width=${MAX_IMAGE_WIDTH},format=jpeg/${imageRow.storage_key}`;

	// 通过 fetch 获取压缩后的图片
	let imageResponse: Response;
	try {
		imageResponse = await fetch(resizedImageUrl);
		if (!imageResponse.ok) {
			error(404, 'Image not found in storage');
		}
	} catch (err) {
		console.error('Failed to fetch image:', err);
		error(500, 'Failed to fetch image from storage');
	}

	// 将压缩后的图片转换为字节数组
	const imageBuffer = await imageResponse.arrayBuffer();
	const byteArray = Array.from(new Uint8Array(imageBuffer));

	let aiResult: unknown;
	try {
		aiResult = await aiBinding.run(
			'@cf/unum/uform-gen2-qwen-500m',
			{
				image: byteArray,
				prompt,
				max_tokens: 512
			},
			{
				gateway: {
					id: 'shinano'
				}
			}
		);
	} catch (err) {
		console.error(err);
		error(502, 'Error generating image alt');
	}

	const description =
		typeof aiResult === 'object' && aiResult !== null && 'description' in aiResult
			? ((aiResult as { description?: string }).description ?? '')
			: '';

	if (!description) {
		error(502, 'Empty description from AI');
	}

	return new Response(description, {
		headers: { 'Content-Type': 'text/plain' }
	});
};
