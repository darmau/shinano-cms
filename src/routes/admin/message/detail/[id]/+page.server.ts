import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const messageId = params.id;

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
		error(Number(messageError.code), { message: messageError.message });
	}

	return {
		messageData
	};
};
