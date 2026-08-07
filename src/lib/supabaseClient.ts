import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/** 带上生成的 Database 泛型，查询结果从源头就有类型 —— 见 supabase/README.md 的 `pnpm db:types` */
export type TypedSupabaseClient = SupabaseClient<Database>;

let supabaseClient: TypedSupabaseClient | null = null;

export const getSupabaseBrowserClient = (): TypedSupabaseClient => {
	if (!browser) {
		throw new Error('Supabase browser client requested during SSR.');
	}

	if (!supabaseClient) {
		supabaseClient = createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}

	return supabaseClient;
};
