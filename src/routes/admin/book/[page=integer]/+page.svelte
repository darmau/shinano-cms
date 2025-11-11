<script lang="ts">
	import { getToastStore } from '$lib/toast';
	import PageTitle from '$components/PageTitle.svelte';
	import { t } from '$lib/functions/i18n';
	import Pagination from '$components/Pagination.svelte';
	import getDateFormat from '$lib/functions/dateFormat';
	import ArticleIcon from '$assets/icons/document-text.svelte';
	import { invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	let selectedBookList = [];
	let deletable = true;

	// 删除选中书籍
	async function deleteBooks() {
		try {
			await supabase.from('book').delete().in('id', selectedBookList);
			selectedBookList = [];
			deletable = true;
			await invalidateAll();
			toastStore.trigger({
				message: `成功删除图书。`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		} catch (error) {
			console.error('删除图书时出错:', error);
			toastStore.trigger({
				message: error.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		}
	}

	// 直接删除书籍
	async function deleteBook(id: number) {
		const { error: deleteError } = await supabase.from('book').delete().eq('id', id);
		if (deleteError) {
			toastStore.trigger({
				message: deleteError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功删除书籍`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 选中所有书籍并添加到selectedBookList
	function switchSelectAll() {
		const checkboxes = document.querySelectorAll('.book-checkbox');
		if (selectedBookList.length === data.books.length) {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = false;
			});
			selectedBookList = [];
			deletable = true;
		} else {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = true;
			});
			selectedBookList = data.books.map((book) => book.id);
			deletable = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('book')}</title>
</svelte:head>

<div>
	<PageTitle title={$t('book')} />

	<div class="flex gap-4 items-center justify-between">
		<button
			type="button"
			disabled={deletable}
			on:click={deleteBooks}
			class="inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:bg-gray-300"
			>{$t('delete')}
		</button>
		<a
			href="/admin/book/new"
			class="inline-flex justify-between gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
		>
			{$t('add-new')}
		</a>
	</div>

	<div class="mt-8 flow-root">
		{#if data.books.length > 0}
			<div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
				<div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
					<div class="overflow-hidden shadow ring-1 ring-gray-200 sm:rounded-lg">
						<table class="min-w-full divide-y divide-gray-300">
							<thead class="bg-zinc-100">
								<tr>
									<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
										<input
											on:click={switchSelectAll}
											type="checkbox"
											class="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
										/>
									</th>
									<th
										scope="col"
										class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
										>{$t('cover')}
									</th>
									<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
										>{$t('book_title')}
									</th>
									<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
										>{$t('rate')}
									</th>
									<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
										>{$t('read_time')}
									</th>
									<th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
										<span class="sr-only">{$t('edit')}</span>
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
								<!--书籍数据-->
								{#each data.books as book (book.id)}
									<tr class="even:bg-gray-50 hover:bg-gray-100 cursor-cell">
										<td class="px-3 py-4 text-sm text-gray-500">
											<input
												on:change={() => {
													if (selectedBookList.includes(book.id)) {
														selectedBookList = selectedBookList.filter((id) => id !== book.id);
														deletable = selectedBookList.length === 0;
													} else {
														selectedBookList.push(book.id);
														deletable = false;
													}
												}}
												type="checkbox"
												class="book-checkbox h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
											/>
										</td>
										<td class="px-3 py-4 text-sm text-gray-500 lg:table-cell">
											<div
												class="w-12 object-cover rounded-full shadow-sm bg-gray-100 aspect-square"
											>
												{#if book.cover}
													<img
														class="rounded-full w-12 h-12 object-cover"
														src={`${data.prefix}/cdn-cgi/image/format=auto,width=120/${book.cover.storage_key}`}
														alt={book.cover.alt}
													/>
												{/if}
											</div>
										</td>
										<td class="px-3 py-4 text-sm text-gray-500 line-clamp-2">{book.title} </td>
										<td class="font-mono px-3 py-4 text-sm text-gray-500">{book.rate} </td>
										<td class="px-3 py-4 text-sm text-gray-500">{getDateFormat(book.date, true)}</td
										>

										<td
											class="relative whitespace-nowrap py-4 pl-3 pr-4 space-x-4 text-right text-sm font-medium sm:pr-6"
										>
											<a
												href={`/admin/book/edit/${book.id}`}
												class="text-cyan-600 hover:text-cyan-900">{$t('edit')}</a
											>
											<button
												on:click={() => deleteBook(book.id)}
												class="text-red-600 hover:text-red-900"
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
			<div class="flex flex-col items-center justify-center text-center min-h-80">
				<ArticleIcon classList="mx-auto h-12 w-12 text-gray-400" />
				<h3 class="mt-2 text-sm font-semibold text-gray-900">No Books</h3>
				<div class="mt-6">
					<a
						href="/admin/book/new"
						class="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
					>
						{$t('add-new')}
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>

<Pagination count={data.count} page={data.page} limit={data.limit} path={data.path} />
