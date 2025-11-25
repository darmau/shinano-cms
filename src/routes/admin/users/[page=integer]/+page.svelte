<script lang="ts">
	import Pagination from '$components/Pagination.svelte';
	import PageTitle from '$components/PageTitle.svelte';
	import getDateFormat from '$lib/functions/dateFormat';
	import { getToastStore } from '$lib/toast';
	import { invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	// 封禁用户
	async function blockUser(id) {
		const { error: blockError } = await supabase
			.from('users')
			.update({ role: 'banned' })
			.eq('id', id);
		if (blockError) {
			toastStore.trigger({
				message: blockError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功封禁用户`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 解封用户
	async function unBlockUser(id) {
		const { error: unBlockError } = await supabase
			.from('users')
			.update({ role: 'reader' })
			.eq('id', id);
		if (unBlockError) {
			toastStore.trigger({
				message: unBlockError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功解封用户`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>用户</title>
</svelte:head>

<div>
	<PageTitle title="用户" />

	<div class="mt-8 flow-root">
		<div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
			<div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
				<div class="overflow-hidden shadow ring-1 ring-gray-200 sm:rounded-lg">
					<table class="min-w-full divide-y divide-gray-300">
						<thead class="bg-zinc-100">
							<tr>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>id
								</th>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>name
								</th>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>user id
								</th>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>source
								</th>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>created at
								</th>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>role
								</th>
								<th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span class="sr-only">block</span>
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							<!--文章数据-->
							{#each data.users as user (user.id)}
								<tr class="even:bg-gray-50 hover:bg-gray-100 cursor-cell">
									<td class="px-3 py-4 text-sm text-gray-500 line-clamp-2">{user.id} </td>
									<td class="px-3 py-4 text-sm text-gray-500">{user.name} </td>
									<td class="font-mono px-3 py-4 text-sm text-gray-500">{user.user_id}</td>
									<td class="px-3 py-4 text-sm text-gray-500">{user.source}</td>
									<td class="px-3 py-4 text-sm text-gray-500">{getDateFormat(user.created_at)}</td>
									<td class="px-3 py-4 text-sm text-gray-500">{user.role}</td>

									<td
										class="relative whitespace-nowrap py-4 pl-3 pr-4 space-x-4 text-right text-sm font-medium sm:pr-6"
									>
										{#if user.role === 'banned'}
											<button
												class="text-green-600 hover:text-green-900"
												on:click={() => unBlockUser(user.id)}
												>解封用户
											</button>
										{:else if user.role === 'reader'}
											<button
												class="text-red-600 hover:text-red-900"
												on:click={() => blockUser(user.id)}
												>封禁用户
											</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>

<Pagination count={data.count} page={data.page} limit={data.limit} path={data.path} />
