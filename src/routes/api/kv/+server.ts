import { error, json, type RequestHandler } from '@sveltejs/kit';

// POST body: { keys: string[] }
export const POST: RequestHandler = async ({ request, locals }) => {
	const { keys }: { keys: string[] } = await request.json();
 	if (!Array.isArray(keys) || keys.length === 0) {
		return json([]);
	}

	const supabase = locals.supabase;
	const { data, error: supabaseError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', keys);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to fetch configuration');
	}

	const keyValues = keys.map((key) => {
		const match = data?.find((row) => row.key === key);
		return { [key]: match?.value ?? '' };
	});

	return json(keyValues);
};

// PUT body: { kv: {key: value}[] }
export const PUT: RequestHandler = async ({ request, locals }) => {
	const { kv }: { kv: Record<string, string>[] } = await request.json();

	if (!Array.isArray(kv)) {
		error(400, 'Invalid payload');
	}

	const entries = kv
		.map((item) => {
			const [key, value] = Object.entries(item)[0] ?? [];
			if (!key) return null;
			return { key, value: typeof value === 'string' ? value : String(value ?? '') };
		})
		.filter(Boolean) as { key: string; value: string }[];

	if (entries.length === 0) {
		error(400, 'No configuration entries provided');
	}

	const supabase = locals.supabase;
	const { error: supabaseError } = await supabase
		.from('config')
		.upsert(entries, { onConflict: 'key' });

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to update configuration');
	}

	return new Response('Configuration updated successfully', {
		headers: { 'Content-Type': 'text/plain' }
	});
};

// DELETE body: { keys: string[] }
export const DELETE: RequestHandler = async ({ request, locals }) => {
	const { keys }: { keys: string[] } = await request.json();

	if (!Array.isArray(keys) || keys.length === 0) {
		error(400, 'No keys provided');
	}

	const supabase = locals.supabase;
	const { error: supabaseError } = await supabase
		.from('config')
		.delete()
		.in('key', keys);

	if (supabaseError) {
		console.error(supabaseError);
		error(500, 'Failed to delete configuration');
	}

	return new Response('Configuration deleted successfully', {
		headers: { 'Content-Type': 'text/plain' }
	});
};
