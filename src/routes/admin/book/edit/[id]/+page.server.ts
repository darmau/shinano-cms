import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const bookId = params.id;

	const { data: bookData, error: bookError } = await supabase
		.from('book')
		.select(
			`
	  id,
	  title,
	  rate,
	  date,
	  comment,
	  link,
	  cover (id, alt, storage_key)
  `
		)
		.eq('id', bookId)
		.single();

	if (bookError) {
		console.error('Error fetching book data:', bookError);
		error(Number(bookError.code), { message: bookError.message });
	}

	return {
		prefix: URL_PREFIX,
		book: bookData
	};
};
