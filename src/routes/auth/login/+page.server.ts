import { error, redirect } from '@sveltejs/kit';

import type { Actions } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

		if (authError) {
			throw error(authError.status ?? 400, { message: authError.message });
		}

		throw redirect(303, '/admin');
	}
};
