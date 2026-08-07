// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session?: Session | null;
			user?: User | null;
			/** 由 hooks.server.ts 的 authGuard 在 /admin 与 /api 路由上解析并缓存 */
			isAdmin?: boolean;
			supabase: import('@supabase/supabase-js').SupabaseClient;
		}
		interface PageData {
			session: Session | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
