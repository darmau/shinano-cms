<script lang="ts">
	import Pagination from '$components/Pagination.svelte';
	import { t } from '$lib/functions/i18n';
	import PageTitle from '$components/PageTitle.svelte';
	import { invalidateAll } from '$app/navigation';
	import { getToastStore } from '$lib/toast';
	import ArticleIcon from '$assets/icons/document-text.svelte';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	let selectedPhotosList = [];
	let deletable = true;

	// 删除选中文章
	async function deletePhotos() {
		try {
			await supabase.from('photo').delete().in('id', selectedPhotosList);
			selectedPhotosList = [];
			deletable = true;
			await invalidateAll();
			toastStore.trigger({
				message: '成功删除摄影。',
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		} catch (error) {
			console.error('删除摄影时出错:', error);
			toastStore.trigger({
				message: error.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		}
	}

	// 直接删除摄影
	async function deletePhoto(id) {
		const { error: deleteError } = await
			supabase.from('photo').delete().eq('id', id);
		if (deleteError) {
			toastStore.trigger({
				message: deleteError.message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功删除摄影`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}
		await invalidateAll();
	}

	// 选中所有文章并添加到selectedArticleList
	function switchSelectAll() {
		const checkboxes = document.querySelectorAll('.photo-checkbox');
		if (selectedPhotosList.length === data.photos.length) {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = false;
			});
			selectedPhotosList = [];
			deletable = true;
		} else {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = true;
			});
			selectedPhotosList = data.photos.map((photo) => photo.id);
			deletable = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('photo')}</title>
</svelte:head>

<div>
	<PageTitle title = {$t('photo')} />

	<div class = "flex gap-4 items-center justify-between">
		<button
			type = "button"
			disabled = {deletable}
			on:click = {deletePhotos}
			class =
				"inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:bg-gray-300"
		>{$t('delete')}
		</button>
		<a
			href = "/admin/photo/new"
			class =
				"inline-flex justify-between gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
		>
			{$t('add-new')}
		</a>
	</div>

	<div class = "mt-8 flow-root">
		{#if data.photos.length > 0}
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
									class = "py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
								>{$t('cover')}
								</th>
								<th
									scope = "col"
									class = "py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
								>{$t('title')}
								</th>
								<th
									scope = "col"
									class = "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('photos-count')}
								</th>
								<th
									scope = "col"
									class = "hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
								>{$t('language')}
								</th>
								<th
									scope = "col"
									class = "hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
								>Slug
								</th>
								<th
									scope = "col"
									class =
										"hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
								>{$t('category')}
								</th>
								<th
									scope = "col"
									class = "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>{$t('status')}
								</th>
								<th scope = "col" class = "relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span class = "sr-only">{$t('edit')}</span>
								</th>
							</tr>
							</thead>
							<tbody class = "divide-y divide-gray-200 bg-white">
							<!--文章数据-->
							{#each data.photos as photo (photo.id)}
								<tr
									class = "even:bg-gray-50 hover:bg-gray-100 cursor-cell"
								>
									<td class = "px-3 py-4 text-sm text-gray-500">
										<input
											on:change = {() => {
											if (selectedPhotosList.includes(photo.id)) {
												selectedPhotosList = selectedPhotosList.filter((id) => id !== photo.id);
												deletable = selectedPhotosList.length === 0;
											} else {
												selectedPhotosList.push(photo.id);
												deletable = false;
											}
										}}
											type = "checkbox"
											class =
												"photo-checkbox h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
										/>
									</td>
									<td
										class = "px-3 py-4 text-sm text-gray-500 lg:table-cell"
									>
										<div
											class =
												"w-12 object-cover rounded-full shadow-sm bg-gray-100 aspect-square"
										>
											{#if photo.cover}
												<img
													class = "rounded-full w-12 h-12 object-cover"
													src =
														{`${data.prefix}/cdn-cgi/image/format=auto,width=240/${photo.cover.storage_key}`}
													alt = {photo.cover.alt}
												/>
											{/if}
										</div>
									</td>
									<td
										class =
											"break-all py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6"
									>
										{photo.title}
										<dl class = "font-normal break-words lg:hidden">
											<dt class = "sr-only sm:hidden">Slug</dt>
											<dd
												class =
													"font-mono mt-1 truncate text-gray-500 sm:hidden"
											>
												{photo.slug}
											</dd>
											<dt class = "sr-only">Language</dt>
											<dd class = "mt-1 truncate text-gray-500">
												{photo.lang.locale}
											</dd>
										</dl>
									</td>
									<td
										class = "px-3 py-4 text-sm text-gray-500 lg:table-cell"
									>{photo.photo_image[0].count}
									</td>
									<td
										class = "hidden px-3 py-4 text-sm text-gray-500 lg:table-cell"
									>{photo.lang.locale}
									</td>
									<td
										class =
											"hidden font-mono px-3 py-4 text-sm text-gray-500 sm:table-cell sm:break-words"
									>{photo.slug}
									</td>
									<td
										class = "hidden px-3 py-4 text-sm text-gray-500 lg:table-cell"
									>{photo.category.title}</td>

									<!--文章状态-->
									<td
										class =
											"px-3 py-4 text-sm text-gray-500"
									>
										{#if photo.is_draft}
										<span
											class =
												"inline-flex items-center gap-x-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 break-keep"
										>
											<svg
												class = "h-1.5 w-1.5 fill-gray-400" viewBox = "0 0 6 6"
												aria-hidden = "true"
											>
												<circle cx = "3" cy = "3" r = "3" />
											</svg>
											{$t('draft')}
										</span>
										{:else}
										<span
											class =
												"inline-flex items-center gap-x-1.5 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 break-keep"
										>
											<svg
												class = "h-1.5 w-1.5 fill-green-500" viewBox = "0 0 6 6"
												aria-hidden = "true"
											>
												<circle cx = "3" cy = "3" r = "3" />
											</svg>
											{$t('published')}
										</span>
										{/if}

										{#if photo.is_featured}
										<span
											class =
												"inline-flex items-center gap-x-1.5 rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700 break-keep"
										>
											{$t('featured')}
										</span>
										{/if}

										{#if photo.is_top}
										<span
											class =
												"inline-flex items-center gap-x-1.5 rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 break-keep"
										>
											{$t('topped')}
										</span>
										{/if}
									</td>

									<td
										class =
											"relative flex flex-wrap gap-4 py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"
									>
										<a
											href = {`/admin/photo/edit/${photo.id}`}
											data-sveltekit-preload-data
											class = "text-cyan-600 hover:text-cyan-900"
										>{$t('edit')}</a>
										<button
											on:click = {() => deletePhoto(photo.id)}
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
			<div
				class = "flex flex-col items-center justify-center text-center min-h-80"
			>
				<ArticleIcon classList = "mx-auto h-12 w-12 text-gray-400" />
				<h3 class = "mt-2 text-sm font-semibold text-gray-900">No photos</h3>
				<div class = "mt-6">
					<a
						href = "/admin/photo/new"
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
