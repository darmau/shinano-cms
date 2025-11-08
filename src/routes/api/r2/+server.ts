import { error, json, type RequestHandler } from '@sveltejs/kit';
import { deleteFromR2, getR2Bucket, type CfPlatform, uploadToR2 } from '$lib/server/r2';

export const POST: RequestHandler = async ({ request, platform }) => {
	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) {
		error(400, 'Bad request: Missing `file`');
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

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const bucket = getR2Bucket(platform as CfPlatform);

	if (!bucket) {
		error(500, 'R2 bucket binding is not configured');
	}

	const payload = await safeJson(request);
	const keys = Array.isArray(payload?.keys) ? payload.keys : [];

	if (!keys.length) {
		error(400, 'Bad request: Missing `keys`');
	}

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
