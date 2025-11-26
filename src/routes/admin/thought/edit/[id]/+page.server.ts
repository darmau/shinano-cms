import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const thoughtId = params.id;

	const { data: thoughtData, error: thoughtError } = await supabase
		.from('thought')
		.select(
			`
	  id,
	  content_json,
	  content_html,
	  content_text,
	  push_to_gallery,
	  thought_image (order, image (id, alt, storage_key))
  `
		)
		.eq('id', thoughtId)
		.single();

	if (thoughtError) {
		console.error('Error fetching thought data:', thoughtError);
		error(Number(thoughtError.code), { message: thoughtError.message });
	}

	const thoughtContent = {
		id: thoughtData!.id,
		content_json: thoughtData!.content_json,
		content_html: thoughtData!.content_html,
		content_text: thoughtData!.content_text,
		push_to_gallery: thoughtData!.push_to_gallery ?? false,
		images: thoughtData?.thought_image
	};

	return {
		prefix: URL_PREFIX,
		thoughtContent
	};
};
