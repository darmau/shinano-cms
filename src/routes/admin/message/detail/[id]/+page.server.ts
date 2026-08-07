import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { parseIdParam } from '$lib/server/params';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const messageId = parseIdParam(params.id, '留言');

	const { data: messageData, error: messageError } = await supabase
		.from('message')
		.select(
			`
	  id,
	  message,
	  contact_type,
	  contact_detail,
	  name,
	  created_at,
	  users (source)
	`
		)
		.eq('id', messageId)
		.single();

	if (messageError) {
		console.error('Error fetching message data:', messageError);
		error(messageError.code === 'PGRST116' ? 404 : 500, { message: messageError.message });
	}

	return {
		messageData
	};
};
