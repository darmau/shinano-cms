import { error, type RequestHandler } from '@sveltejs/kit';
import { getR2Bucket, type CfPlatform } from '$lib/server/r2';

type WorkersAI = { run: (model: string, input: unknown) => Promise<unknown> };
type CfEnv = { AI?: WorkersAI } & Record<string, unknown>;
type CfPlatformWithAI = { env?: CfEnv } | undefined;

const DEFAULT_PROMPT =
	'Generate a caption for this image, do not try to guess the location, just describe the image.';

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

	const bucket = getR2Bucket(platform as CfPlatform);
	if (!bucket) {
		error(500, 'R2 bucket binding not configured');
	}

	const object = await bucket.get(targetKey);
	if (!object) {
		error(404, 'Image not found in storage');
	}

	const blob = await object.arrayBuffer();
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
