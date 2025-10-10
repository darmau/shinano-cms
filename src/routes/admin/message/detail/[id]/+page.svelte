<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import getDateFormat from '$lib/functions/dateFormat';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;
	const toastStore = getToastStore();

	const message = data.messageData;

	// 进入该页面，将该数据的is_read字段设为true
	const setRead = async () => {
		const { error } = await supabase
			.from('message')
			.update({ is_read: true })
			.eq('id', message.id);

		if (error) {
			console.error(error);
			toastStore.trigger({
				message: `读取消息失败。${error.message}`,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			return;
		}
	};

	onMount(() => {
		setRead();
	});
</script>

<div class = "max-w-3xl mx-auto space-y-4 my-12">
	<h1 class="font-medium text-gray-800 text-xl">{message.name}</h1>
	<p class="text-base space-x-2">
		<span class="capitalize text-cyan-700 font-medium">{message.contact_type}
			: </span>
		<span>{message.contact_detail}</span>
	</p>
	<p class="text-lg text-gray-800">{message.message}</p>
	<p class="text-sm text-gray-500">{getDateFormat(message.created_at, true)}</p>
</div>
