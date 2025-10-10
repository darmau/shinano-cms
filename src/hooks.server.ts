import { redirect, type Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { sequence } from '@sveltejs/kit/hooks';

const supabase: Handle = async ({ event, resolve }) => {
	const supabaseClient = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: () => event.cookies
	});

	event.locals.safeGetSession = async () => {
		try {
			const {
				data: { session },
				error
			} = await supabaseClient.auth.getSession();

			if (error) {
				throw error;
			}

			if (!session) {
				return { session: null, user: null };
			}

			const {
				data: { user }
			} = await supabaseClient.auth.getUser();

			return { session, user };
		} catch (error) {
			return { session: null, user: null };
		}
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session ?? undefined;
	event.locals.user = user ?? undefined;

	if (!event.locals.session) {
		if (event.url.pathname.startsWith('/auth/signup') || event.url.pathname.startsWith('/api/auth')) {
			return resolve(event);
		}
		if (!event.url.pathname.startsWith('/auth/login')) {
			return redirect(303, '/auth/login');
		}
	} else if (event.url.pathname.startsWith('/auth')) {
		return redirect(303, '/admin');
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
