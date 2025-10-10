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
