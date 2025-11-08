import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const id = Number(params.id);

	if (Number.isNaN(id)) {
		return json({ error: 'Invalid category id' }, { status: 400 });
	}

	const { supabase } = locals;
	const { data, error } = await supabase
		.from('category')
		.delete()
		.eq('id', id)
		.select()
		.single();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json(data);
};

