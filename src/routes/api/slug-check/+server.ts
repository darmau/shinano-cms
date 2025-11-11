import { type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	const { type, langId, slug, contentId } = await request.json();

	const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

	if (!slugRegex.test(slug)) {
		return new Response(JSON.stringify({ error: 'Invalid slug' }), { status: 400 });
	}

	const { data } = await supabase
		.from(type)
		.select('id, slug')
		.eq('slug', slug)
		.eq('lang', langId)
		.maybeSingle();

	if (!data) {
		return new Response(JSON.stringify({ success: 'Slug is available' }), { status: 200 });
	}

	if (data.id === contentId) {
		return new Response(JSON.stringify({ success: 'Slug is available' }), { status: 200 });
	} else {
		return new Response(JSON.stringify({ error: 'Slug is already in use' }), { status: 200 });
	}
};
