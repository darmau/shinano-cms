import OpenAI from 'openai';
import type { ConfigRow } from '$lib/types/config';
import { error, type RequestHandler } from '@sveltejs/kit';

type GenerateImageRequest = {
	prompt?: unknown;
	size?: unknown;
	quality?: unknown;
};

type ImageSize =
	| '1024x1024'
	| '1024x1536'
	| '1536x1024'
	| '512x512'
	| '1792x1024'
	| '1024x1792';
type ImageQuality = 'standard' | 'high';

const DEFAULT_SIZE: ImageSize = '1024x1024';
const DEFAULT_QUALITY: ImageQuality = 'high';

function parseSize(value: unknown): ImageSize {
	if (typeof value !== 'string') {
		return DEFAULT_SIZE;
	}

	const allowedSizes: ImageSize[] = [
		'1024x1024',
		'1024x1536',
		'1536x1024',
		'512x512',
		'1792x1024',
		'1024x1792'
	];
	return allowedSizes.includes(value as ImageSize) ? (value as ImageSize) : DEFAULT_SIZE;
}

function parseQuality(value: unknown): ImageQuality {
	if (typeof value !== 'string') {
		return DEFAULT_QUALITY;
	}

	const allowed: ImageQuality[] = ['standard', 'high'];
	return allowed.includes(value as ImageQuality) ? (value as ImageQuality) : DEFAULT_QUALITY;
}

function parseDimensions(size: ImageSize) {
	const [width, height] = size.split('x').map((dim) => Number.parseInt(dim, 10));
	return {
		width: Number.isFinite(width) ? width : 1024,
		height: Number.isFinite(height) ? height : 1024
	};
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json()) as GenerateImageRequest;
	const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

	if (!prompt) {
		error(400, 'Prompt is required');
	}

	const size = parseSize(body.size);
	const quality = parseQuality(body.quality);

	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.eq('key', 'config_OPENAI');

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const rows = (data ?? []) as ConfigRow[];
	const apiKey = rows[0]?.value ?? '';

	if (!apiKey) {
		error(500, 'OpenAI API key not configured');
	}

	const openai = new OpenAI({ apiKey });

	try {
		const response = await openai.images.generate({
			model: 'gpt-image-1',
			prompt,
			n: 1,
			size,
			quality
		});

		const image = response.data?.[0];

		if (!image?.b64_json) {
			console.error('OpenAI response missing image payload', response);
			error(502, 'Image generation failed');
		}

		const { width, height } = parseDimensions(size);

		return new Response(
			JSON.stringify({
				image: {
					b64_json: image.b64_json,
					revised_prompt: image.revised_prompt ?? null,
					width,
					height,
					mime_type: 'image/png'
				},
				created: response.created
			}),
			{
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('OpenAI image generation failed', err);
		error(502, 'Image generation failed');
	}
};