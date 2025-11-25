<script lang="ts">
	import { getToastStore } from '$lib/toast';
	import Pagination from '$components/Pagination.svelte';
	import { invalidateAll } from '$app/navigation';
	import { localTime } from '$lib/functions/localTime';
	import PageTitle from '$components/PageTitle.svelte';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import { CountryChineseName, CountryFlagEmoji } from '$lib/types/country.js';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	// 设为公开
	async function setPublic(id: number) {
		const { error: publicError } = await supabase
			.from('comment')
			.update({ is_public: true })
			.eq('id', id);
		if (publicError) {
			toastStore.trigger({
				message: publicError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: '成功设为公开',
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 设为屏蔽
	async function setBlock(id: number) {
		const { error: blockError } = await supabase
			.from('comment')
			.update({ is_blocked: true })
			.eq('id', id);
		if (blockError) {
			toastStore.trigger({
				message: blockError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: '成功封禁评论',
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 取消屏蔽
	async function cancelBlock(id: number) {
		const { error: cancelError } = await supabase
			.from('comment')
			.update({ is_blocked: false })
			.eq('id', id);
		if (cancelError) {
			toastStore.trigger({
				message: cancelError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: '成功解封评论',
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 删除评论（带确认）
	async function deleteComment(id: number, content: string) {
		const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
		const confirmed = confirm(`确认删除这条评论吗？\n\n"${preview}"`);

		if (!confirmed) return;

		const { error: deleteError } = await supabase.from('comment').delete().eq('id', id);

		if (deleteError) {
			toastStore.trigger({
				message: deleteError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: '成功删除评论',
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}

		await invalidateAll();
	}
</script>

<svelte:head>
	<title>评论</title>
</svelte:head>

<PageTitle title="评论" />
<div class="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8">
	{#each data.comments as comment}
		<div
			class="overflow-hidden rounded-xl outline outline-gray-200 flex flex-col"
			data-comment-id={comment.id}
		>
			<div
				class="flex items-center justify-between gap-x-4 border-b border-gray-900/5 bg-gray-50 p-6"
			>
				<div class="text-base font-medium text-gray-900 dark:text-white">
					{comment.is_anonymous ? comment.name : comment.user_id.name}
				</div>
				<div class="flex flex-col gap-y-1 items-end">
					{#if comment.is_anonymous}
						<p class="text-sm text-gray-700 font-medium">{comment.email}</p>
					{/if}

					{#if comment.website}
						<a href={comment.website} target="_blank" class="text-sm text-cyan-600 font-medium"
							>{comment.website}</a
						>
					{/if}
				</div>
			</div>

			<div class="p-4 grow space-y-4">
				<p class="text-lg text-zinc-800">{comment.content_text}</p>

				{#if comment.to_article}
					<a
						target="_blank"
						href={`${data.baseUrl}/${comment.to_article.language.lang}/article/${comment.to_article.slug}`}
						class="block font-medium text-cyan-600 text-base">{comment.to_article.title}</a
					>
				{:else if comment.to_photo}
					<a
						target="_blank"
						href={`${data.baseUrl}/${comment.to_photo.language.lang}/album/${comment.to_photo.slug}`}
						class="block font-medium text-cyan-600 text-base">{comment.to_photo.title}</a
					>
				{:else if comment.to_thought}
					<a
						target="_blank"
						href={`${data.baseUrl}/zh/thought/${comment.to_thought.slug}`}
						class="block font-medium text-cyan-600 text-base">{comment.to_thought.content_text}</a
					>
				{/if}

				<time class="text-sm text-zinc-500">{localTime(comment.created_at)}</time>
			</div>

			{#if comment.ip_info}
				<div class="p-4 flex items-center gap-x-2">
					<p class="flex items-center gap-x-2">
						{CountryFlagEmoji.get(comment.ip_info.countryCode)}
					</p>
					<p class="text-sm text-zinc-500">{CountryChineseName.get(comment.ip_info.countryCode)}</p>
					<p class="text-sm text-zinc-500">{comment.ip_info.regionName}</p>
					<p class="text-sm text-zinc-500">{comment.ip_info.city}</p>
				</div>
			{/if}

			<div class="bg-gray-50 px-4 py-4 sm:px-6 space-x-3">
				{#if comment.is_public === false}
					<button
						class="text-violet-500 text-sm font-medium"
						on:click={() => setPublic(comment.id)}
					>
						设为公开
					</button>
				{/if}
				{#if comment.is_blocked === false}
					<button class="text-sm font-medium text-yellow-500" on:click={() => setBlock(comment.id)}>
						封禁评论
					</button>
				{:else}
					<button
						class="text-sm font-medium text-green-500"
						on:click={() => cancelBlock(comment.id)}
					>
						解封评论
					</button>
				{/if}
				<button
					class="text-sm font-medium text-red-500"
					on:click={() => deleteComment(comment.id, comment.content_text)}
				>
					删除评论
				</button>
			</div>
		</div>
	{/each}
</div>

<Pagination count={data.count} page={data.page} limit={data.limit} path={data.path} />
