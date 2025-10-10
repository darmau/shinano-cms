<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import Pagination from '$components/Pagination.svelte';
	import { invalidateAll } from '$app/navigation';
	import { localTime } from '$lib/functions/localTime';
	import { t } from '$lib/functions/i18n';
	import PageTitle from '$components/PageTitle.svelte';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	// 设为公开
	async function setPublic(id) {
		const { error: publicError } = await
			supabase.from('comment').update({ is_public: true }).eq('id', id);
		if (publicError) {
			toastStore.trigger({
				message: publicError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功设为公开`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 设为屏蔽
	async function setBlock(id) {
		const { error: blockError } = await
			supabase.from('comment').update({ is_blocked: true }).eq('id', id);
		if (blockError) {
			toastStore.trigger({
				message: blockError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功设为屏蔽`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 取消屏蔽
	async function cancelBlock(id) {
		const { error: cancelError } = await
			supabase.from('comment').update({ is_blocked: false }).eq('id', id);
		if (cancelError) {
			toastStore.trigger({
				message: cancelError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功取消屏蔽`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{$t('comment')}</title>
</svelte:head>

<PageTitle title = {$t('comment')} />
<div class = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
	{#each data.comments as comment}
		<div class = "rounded-lg bg-white shadow flex flex-col" data-comment-id =
			{comment.id}>
			<div class="p-4 grow space-y-4">
				{#if comment.is_anonymous}
					<p class="text-sm text-cyan-700 font-medium">{$t('anonymous_comment')}</p>
				{/if}
				<h2
					class="text-base font-medium text-zinc-800">{comment.is_anonymous ?
				comment.name : comment.user_id.name}</h2>
				<p class="text-lg text-zinc-800">{comment.content_text}</p>

				{#if comment.is_anonymous}
					<p class="text-sm text-gray-700 font-medium">{comment.email}</p>
				{/if}

				{#if comment.website}
					<a
						href={comment.website}
						target="_blank"
						class="text-sm text-cyan-600 font-medium">{comment.website}</a>
				{/if}

				{#if comment.to_article}
					<a
						target="_blank"
						href={`${data.baseUrl}/${comment.to_article.language.lang}/article/${comment.to_article.slug}`}
						class="block font-medium text-cyan-600 text-base">{comment.to_article.title}</a>
				{:else if comment.to_photo}
					<a
						target="_blank"
						href={`${data.baseUrl}/${comment.to_photo.language.lang}/album/${comment.to_photo.slug}`}
						class="block font-medium text-cyan-600 text-base">{comment.to_photo.title}</a>
				{:else if comment.to_thought}
					<a
						target="_blank"
						href={`${data.baseUrl}/zh/thought/${comment.to_thought.slug}`}
						class="block font-medium text-cyan-600 text-base">{comment.to_thought.content_text}</a>
				{/if}

				<time class="text-sm text-zinc-500">{localTime(comment.created_at)}</time>
			</div>
			<div class="bg-gray-50 px-4 py-4 sm:px-6 space-x-3">
				{#if comment.is_public === false}
					<button
						class="text-violet-500 text-sm font-medium"
						on:click = {() => setPublic(comment.id)}
					>
						{$t('set_public')}
					</button>
				{/if}
				{#if comment.is_blocked === false}
					<button
						class="text-sm font-medium text-red-500"
						on:click = {() => setBlock(comment.id)}
					>
						{$t('block_comment')}
					</button>
				{:else}
					<button
						class="text-sm font-medium text-green-500"
						on:click = {() => cancelBlock(comment.id)}
					>
						{$t('unblock_comment')}
					</button>
				{/if}
			</div>

		</div>
	{/each}
</div>

<Pagination
	count = {data.count} page = {data.page} limit = {data.limit}
	path = {data.path}
/>
