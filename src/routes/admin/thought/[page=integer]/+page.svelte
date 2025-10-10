<script lang="ts">
	import Pagination from '$components/Pagination.svelte';
	import { t } from '$lib/functions/i18n';
	import PageTitle from '$components/PageTitle.svelte';
	import { invalidateAll } from '$app/navigation';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import ArticleIcon from '$assets/icons/document-text.svelte';
	import getDateFormat from '$lib/functions/dateFormat';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	let selectedThoughtList = [];
	let deletable = true;

	// 删除选中想法
	async function deleteThoughts() {
		try {
			await supabase.from('thought').delete().in('id', selectedThoughtList);
			selectedThoughtList = [];
			deletable = true;
			await invalidateAll();
			toastStore.trigger({
				message: `成功删除想法。`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		} catch (error) {
			console.error('删除想法时出错:', error);
			toastStore.trigger({
				message: error.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		}
	}

	// 直接删除想法
	async function deleteThought(id: number) {
		const { error: deleteError } = await
			supabase.from('thought').delete().eq('id',	id);
		if (deleteError) {
			toastStore.trigger({
				message: deleteError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功删除想法`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 选中所有想法并添加到selectedThoughtList
	function switchSelectAll() {
		const checkboxes = document.querySelectorAll('.thought-checkbox');
		if (selectedThoughtList.length === data.thoughts.length) {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = false;
			});
			selectedThoughtList = [];
			deletable = true;
		} else {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = true;
			});
			selectedThoughtList = data.thoughts.map((thought) => thought.id);
			deletable = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('thought')}</title>
</svelte:head>

<div>
	<PageTitle title={$t('thought')} />

	<div class = "flex gap-4 items-center justify-between">
		<button
			type = "button"
			disabled = {deletable}
			on:click = {deleteThoughts}
			class =
				"inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:bg-gray-300"
		>{$t('delete')}
		</button>
		<a
			href = "/admin/thought/new"
			class =
				"inline-flex justify-between gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
		>
			{$t('add-new')}
		</a>
	</div>

	<div class = "mt-8 flow-root">
		{#if data.thoughts.length > 0}
			<div class = "-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
				<div
					class = "inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8"
				>
					<div
						class = "overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg"
					>
						<table class = "min-w-full divide-y divide-gray-300">
							<thead class = "bg-zinc-100">
							<tr>
								<th
									scope = "col"
									class = "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									<input
										on:click = {switchSelectAll}
										type = "checkbox"
										class = "h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
									/>
								</th>
								<th
									scope = "col"
									class = "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('content')}
								</th>
								<th
									scope = "col"
									class = "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('photos-count')}
								</th>
								<th
									scope = "col"
									class = "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('publish-time')}
								</th>
								<th scope = "col" class = "relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span class = "sr-only">{$t('edit')}</span>
								</th>
							</tr>
							</thead>
							<tbody class = "divide-y divide-gray-200 bg-white">
							<!--文章数据-->
							{#each data.thoughts as thought (thought.id)}
								<tr
									class = "even:bg-gray-50 hover:bg-gray-100 cursor-cell"
								>
									<td class = "px-3 py-4 text-sm text-gray-500">
										<input
											on:change = {() => {
											if (selectedThoughtList.includes(thought.id)) {
												selectedThoughtList = selectedThoughtList.filter((id)=> id !== thought.id);
												deletable = selectedThoughtList.length === 0;
											} else {
												selectedThoughtList.push(thought.id);
												deletable = false;
											}
										}}
											type = "checkbox"
											class =
												"thought-checkbox h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
										/>
									</td>
									<td
										class = "px-3 py-4 text-sm text-gray-500 line-clamp-2"
									>{thought.content_text}
									</td>
									<td
										class =
											"font-mono px-3 py-4 text-sm text-gray-500"
									>{thought.thought_image[0].count}
									</td>
									<td
										class = "px-3 py-4 text-sm text-gray-500"
									>{getDateFormat(thought.created_at, true)}</td>

									<td
										class =
											"relative whitespace-nowrap py-4 pl-3 pr-4 space-x-4 text-right text-sm font-medium sm:pr-6"
									>
										<a
											href = {`/admin/thought/edit/${thought.id}`}
											class = "text-cyan-600 hover:text-cyan-900"
										>{$t('edit')}</a>
										<button
											on:click = {() => deleteThought(thought.id)}
											class = "text-red-600 hover:text-red-900"
										>
											{$t('delete')}
										</button>
									</td>
								</tr>
							{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{:else}
			<div class = "flex flex-col items-center justify-center text-center min-h-80">
				<ArticleIcon classList="mx-auto h-12 w-12 text-gray-400" />
				<h3 class = "mt-2 text-sm font-semibold text-gray-900">No thoughts</h3>
				<div class = "mt-6">
					<a
						href = "/admin/thought/new"
						class = "inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
					>
						{$t('add-new')}
					</a>
				</div>
			</div>

		{/if}
	</div>
</div>

<Pagination
	count = {data.count} page = {data.page} limit = {data.limit}
	path = {data.path}
/>
