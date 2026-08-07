<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../app.css';
	import { initializeStores, Toast } from '$lib/toast';
	import { getSupabaseBrowserClient, type TypedSupabaseClient } from '$lib/supabaseClient';
	import type { LayoutData } from './$types';

	initializeStores();

	export let data: LayoutData;
	let { session, user } = data;
	// 复用 $lib/supabaseClient 里的单例：此处原先自己又建了一个浏览器客户端，
	// 于是同一个页面里跑着两个各自持有会话状态的实例
	let supabase: TypedSupabaseClient | undefined;

	if (browser) {
		supabase = getSupabaseBrowserClient();
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
