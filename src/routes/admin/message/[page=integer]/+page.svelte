<script lang="ts">
	import PageTitle from '$components/PageTitle.svelte';
	import Pagination from '$components/Pagination.svelte';
	import { t } from '$lib/functions/i18n';
	import getDateFormat from '$lib/functions/dateFormat';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { invalidateAll } from '$app/navigation';
	import ArticleIcon from '$assets/icons/document-text.svelte';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	let selectedMessageList = [];
	let deletable = true;

	// 删除选中消息
	async function deleteMessages() {
		try {
			await supabase.from('message').delete().in('id', selectedMessageList);
			selectedMessageList = [];
			deletable = true;
			await invalidateAll();
			toastStore.trigger({
				message: `成功删除消息。`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		} catch (error) {
			console.error('删除消息时出错:', error);
			toastStore.trigger({
				message: error.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		}
	}

	// 直接删除消息
	async function deleteMessage(id: number) {
		const { error: deleteError } = await
			supabase.from('message').delete().eq('id',	id);
		if (deleteError) {
			toastStore.trigger({
				message: deleteError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功删除消息`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 选中所有消息并添加到selectedMessagesList
	function switchSelectAll() {
		const checkboxes = document.querySelectorAll('.message-checkbox');
		if (selectedMessageList.length === data.messages.length) {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = false;
			});
			selectedMessageList = [];
			deletable = true;
		} else {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = true;
			});
			selectedMessageList = data.messages.map((message) => message.id);
			deletable = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('message')}</title>
</svelte:head>

<div class = "">
	<PageTitle title = {$t('message')} />
	<div class = "flex gap-4 items-center justify-between">
		<button
			type = "button"
			disabled = {deletable}
			on:click = {deleteMessages}
			class =
				"inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:bg-gray-300"
		>{$t('delete')}
		</button>
	</div>

	<div class = "mt-8 flow-root">
		{#if data.messages.length > 0}
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
								>{$t('sender')}
								</th>
								<th
									scope = "col"
									class = "hidden lg:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('message')}
								</th>
								<th
									scope = "col"
									class =
										"hidden lg:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('contact_type')}
								</th>
								<th
									scope = "col"
									class =
										"hidden lg:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('contact')}
								</th>
								<th
									scope = "col"
									class = "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('send_time')}
								</th>
								<th scope = "col" class = "relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span class = "sr-only">{$t('edit')}</span>
								</th>
							</tr>
							</thead>
							<tbody class = "divide-y divide-gray-200 bg-white">
							<!--消息数据-->
							{#each data.messages as message (message.id)}
								<tr
									class = "even:bg-gray-50 hover:bg-gray-100 cursor-cell"
								>
									<td class = "px-3 py-4 text-sm text-gray-500">
										<input
											on:change = {() => {
											if (selectedMessageList.includes(message.id)) {
												selectedMessageList = selectedMessageList.filter((id)=> id
												!== message.id);
												deletable = selectedMessageList.length === 0;
											} else {
												selectedMessageList.push(message.id);
												deletable = false;
											}
										}}
											type = "checkbox"
											class =
												"message-checkbox h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
										/>
									</td>
									<td
										class =
											{`${message.is_read ? 'font-normal text-gray-400' :
											'font-bold text-gray-900'
											} break-words py-4 pl-4 pr-3 text-sm`}
									>
										{message.name}
										<dl class = "font-normal lg:hidden">
											<dt class = "sr-only">Content</dt>
											<dd class = "mt-1 truncate text-gray-500">
												{message.message}
											</dd>
										</dl>
									</td>
									<td
										class = {`${message.is_read ? 'font-normal text-gray-400' :
											'font-bold text-gray-900'
											} hidden px-3 py-4 text-sm lg:table-cell`}
									>{message.message.slice(0, 12)}
									</td>
									<td
										class = "hidden px-3 py-4 text-sm text-gray-500 lg:table-cell"
									>{message.contact_type}
									</td>
									<td
										class = "hidden px-3 py-4 text-sm text-gray-500 lg:table-cell"
									>{message.contact_detail}
									</td>
									<td
										class = "px-3 py-4 text-sm text-gray-500"
									>{getDateFormat(message.created_at, true)}</td>

									<td
										class =
											"relative whitespace-nowrap py-4 pl-3 pr-4 space-x-4 text-right text-sm font-medium sm:pr-6"
									>
										<a
											href = {`/admin/message/detail/${message.id}`}
											class = "text-cyan-600 hover:text-cyan-900"
										>{$t('view')}</a>
										<button
											on:click = {() => deleteMessage(message.id)}
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
				<h3 class = "mt-2 text-sm font-semibold text-gray-900">No message</h3>
			</div>

		{/if}
	</div>
</div>

<Pagination
	count = {data.count} page = {data.page} limit = {data.limit}
	path = {data.path}
/>
