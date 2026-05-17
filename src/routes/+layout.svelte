<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../app.css';
	import { initializeStores, Toast } from '$lib/toast';
	import { createBrowserClient } from '@supabase/ssr';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
	import type { LayoutData } from './$types';

	initializeStores();

	export let data: LayoutData;
	let { session, user } = data;
	let supabase: SupabaseClient | undefined;

	if (browser) {
		supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}

	onMount(() => {
		if (!supabase) return;

		const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => authListener.subscription.unsubscribe();
	});

	$: ({ session, user } = data);
</script>

<Toast position="t" />
<slot {session} {user} />
