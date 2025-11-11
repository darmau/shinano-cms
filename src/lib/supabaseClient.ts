import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createBrowserClient, type SupabaseClient } from '@supabase/ssr';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = (): SupabaseClient => {
	if (!browser) {
		throw new Error('Supabase browser client requested during SSR.');
	}

	if (!supabaseClient) {
		supabaseClient = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}

	return supabaseClient;
};
