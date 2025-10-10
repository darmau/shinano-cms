// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Session, User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/ssr';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session?: Session | null;
			user?: User | null;
		}
		interface PageData {
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
