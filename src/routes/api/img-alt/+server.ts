import { error, type RequestHandler } from '@sveltejs/kit';

type WorkersAI = { run: (model: string, input: unknown) => Promise<unknown> };
type CfEnv = { AI?: WorkersAI } & Record<string, unknown>;
type CfPlatform = { env?: CfEnv } | undefined;
type CfImageTransform = {
	width?: number;
	height?: number;
	format?: 'jpeg' | 'png' | 'webp';
	quality?: number;
	fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' | 'scale-down';
};

const DEFAULT_PROMPT =
	'Generate a caption for this image, do not try to guess the location, just describe the image.';

const IMAGE_TRANSFORM: CfImageTransform = {
	width: 384,
	format: 'webp',
	quality: 75,
	fit: 'scale-down'
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const { prefix, img_key } = await request.json();

	if (!prefix || !img_key) {
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

	const env = (platform as CfPlatform)?.env;
	const aiBinding = env?.AI;

	if (!aiBinding) {
		error(500, 'Workers AI binding not configured');
	}

	const storageUrl = `${prefix}/${img_key}`;
	const requestInit: RequestInit & { cf?: { image?: CfImageTransform } } = {
		cf: {
			image: IMAGE_TRANSFORM
		}
	};

	const imageResponse = await fetch(storageUrl, requestInit);

	if (!imageResponse.ok) {
		console.error('Failed to fetch image from storage', storageUrl, imageResponse.status, imageResponse.statusText);
		error(502, 'Failed to fetch image');
	}

	const blob = await imageResponse.arrayBuffer();
	const byteArray = Array.from(new Uint8Array(blob));
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
			? (aiResult as { description?: string }).description ?? ''
			: '';

	if (!description) {
		error(502, 'Empty description from AI');
	}

	return new Response(description, {
		headers: { 'Content-Type': 'text/plain' }
	});
}
