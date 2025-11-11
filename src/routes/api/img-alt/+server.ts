import { error, type RequestHandler } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

type WorkersAI = { run: (model: string, input: unknown) => Promise<unknown> };
type CfEnv = { AI?: WorkersAI } & Record<string, unknown>;
type CfPlatformWithAI = { env?: CfEnv } | undefined;

const DEFAULT_PROMPT =
	'Generate a caption for this image, do not try to guess the location, just describe the image.';

// 使用 Cloudflare Image Resizing 的最大宽度，减少内存占用
const MAX_IMAGE_WIDTH = 512;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const { storage_key, img_key } = await request.json();
	const targetKey = typeof storage_key === 'string' ? storage_key : img_key;

	if (!targetKey) {
		error(400, 'Invalid image key');
	}

	const supabase = locals.supabase;
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
	const resizedImageUrl = `${URL_PREFIX}/cdn-cgi/image/width=${MAX_IMAGE_WIDTH},format=jpeg/${targetKey}`;

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
	const input = { image: byteArray, prompt, max_tokens: 512 };

	let aiResult: unknown;
	try {
		aiResult = await aiBinding.run('@cf/unum/uform-gen2-qwen-500m', input);
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
