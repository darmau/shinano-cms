import { error, json, type RequestHandler } from '@sveltejs/kit';
import { resolveLocationWithSupabase, type LocationPayload } from '$lib/server/location';

export const POST: RequestHandler = async ({ request, locals }) => {
	const payload = await safeReadPayload(request);

	if (!payload) {
		error(400, 'Invalid payload');
	}

	try {
		const location = await resolveLocationWithSupabase(payload, locals.supabase);
		return json({ location });
	} catch (err) {
		console.error(err);
		error(500, 'Failed to resolve location');
	}
};

async function safeReadPayload(request: Request) {
	try {
		const body = (await request.json()) as LocationPayload;
		if (body && typeof body === 'object') {
			return body;
		}
		return null;
	} catch {
		return null;
	}
}
