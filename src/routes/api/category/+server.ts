import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const { supabase } = locals;
	const body = await request.json();

	const ids = Array.isArray(body?.ids) ? body.ids : [];

	if (!ids.length) {
		return json({ error: 'No category ids provided' }, { status: 400 });
	}

	const { error } = await supabase.from('category').delete().in('id', ids);

	if (error) {
		return json({ error: error.message }, { status: error.status ?? 500 });
	}

	return json({ success: true });
};

