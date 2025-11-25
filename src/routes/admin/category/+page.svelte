<script lang="ts">
	import PageTitle from '$components/PageTitle.svelte';
	import { invalidateAll } from '$app/navigation';
	import { getToastStore } from '$lib/toast';
	import { deleteCategories, deleteCategory } from '$lib/api/categories';

	export let data;

	const toastStore = getToastStore();

	function getCountByType(category) {
		if (category && category.type) {
			return category[category.type][0].count;
		}
		return 0;
	}

	let selectedCategoryList: number[] = [];
	let deletable = true;

	async function handleDeleteCategory(id: number) {
		const { error, deleted } = await deleteCategory(id);

		if (error) {
			toastStore.trigger({
				message: '删除分类失败。',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: `成功删除分类${deleted?.title ?? ''}`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		}

		await invalidateAll();
	}

	async function handleDeleteCategories() {
		const { error } = await deleteCategories(selectedCategoryList);

		if (error) {
			toastStore.trigger({
				message: '删除分类失败。',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			deletable = true;
			toastStore.trigger({
				message: `成功删除${selectedCategoryList.length}个分类`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
			selectedCategoryList = [];
		}

		await invalidateAll();
	}

	function switchSelectAll() {
		const checkboxes = document.querySelectorAll('.category-checkbox');

		if (selectedCategoryList.length === data.categories.length) {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = false;
			});
			selectedCategoryList = [];
			deletable = true;
		} else {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = true;
			});
			selectedCategoryList = data.categories.map((category) => category.id);
			deletable = false;
		}
	}
</script>

<div>
	<PageTitle title="分类" />
	<div class="flex gap-4 items-center justify-between">
		<button
			type="button"
			disabled={deletable}
			on:click={handleDeleteCategories}
			class="inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:bg-gray-300"
			>删除
		</button>
		<a
			href="/admin/category/new"
			class="inline-flex justify-between gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
		>
			创建
		</a>
	</div>
	<div class="mt-8 flow-root">
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
								>
									标题
								</th>
								<th
									scope="col"
									class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
								>
									语言
								</th>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
									类型
								</th>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
									数量
								</th>
								<th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span class="sr-only">编辑</span>
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							<!--分类-->
							{#each data.categories as category (category.id)}
								<tr class="even:bg-gray-50 hover:bg-gray-100 cursor-cell">
									<td class="px-3 py-4 text-sm text-gray-500">
										<input
											on:change={() => {
												if (selectedCategoryList.includes(category.id)) {
													selectedCategoryList = selectedCategoryList.filter(
														(id) => id !== category.id
													);
													deletable = selectedCategoryList.length === 0;
													console.log(selectedCategoryList);
												} else {
													selectedCategoryList.push(category.id);
													deletable = false;
													console.log(selectedCategoryList);
												}
											}}
											type="checkbox"
											class="category-checkbox h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
										/>
									</td>
									<td
										class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6"
									>
										{category.title}
										{#if category.description}
											<p class="font-normal text-gray-600">{category.description}</p>
										{/if}
										<dl class="font-normal lg:hidden">
											<dt class="sr-only sm:hidden">Type</dt>
											<dd class="font-mono mt-1 truncate text-gray-500 sm:hidden">
												{category.type}
											</dd>
											<dt class="sr-only">Count</dt>
											<dd class="mt-1 truncate text-gray-500">
												{getCountByType(category)}
											</dd>
										</dl>
									</td>
									<td class="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell"
										>{category.lang.locale}
									</td>
									<td class="hidden font-mono px-3 py-4 text-sm text-gray-500 sm:table-cell"
										>{category.type}
									</td>
									<td class="px-3 py-4 text-sm text-gray-500">{getCountByType(category)}</td>

									<td
										class="relative whitespace-nowrap py-4 pl-3 pr-4 space-x-4 text-right text-sm font-medium sm:pr-6"
									>
										<a
											href={`/admin/category/edit/${category.id}`}
											class="font-medium text-cyan-600 hover:text-cyan-900"
										>
											编辑
										</a>
										<button
											type="button"
											on:click={() => handleDeleteCategory(category.id)}
											class="text-red-600 hover:text-red-900"
										>
											删除
										</button>
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
