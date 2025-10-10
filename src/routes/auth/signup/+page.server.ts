import { error, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

export const actions: Actions = {
	signup: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const name = formData.get('name') as string;

		const { error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					name
				}
			}
		});

		if (authError) {
			console.error(authError);
			throw error(authError.status ?? 400, authError.message);
		}

		throw redirect(303, '/auth/confirm');
	}
};
