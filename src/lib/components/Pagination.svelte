<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	export let count: number = 0;
	export let page: number = 1;
	export let limit: number = 16;
	export let path: string = '';

	let limitOptions: number[] = [8, 12, 16, 24, 36, 48];

	// 根据总数count、每页数量limit、当前页码page生成页码数组。
	// 当页数超过5页时，只显示当前页、前后两页及第一页和最后一页。
	// 比如总数为100，每页数量为10，当前页为5，则生成的页码数组为[1, "...", 4, 5, 6, "...", 10]。
	function generatePages(count: number, limit: number, page: number): number[] {
		let pages = [];
		let total = Math.ceil(count / limit);
		if (total <= 5) {
			for (let i = 1; i <= total; i++) {
				pages.push(i);
			}
		} else {
			if (page <= 3) {
				pages = [1, 2, 3, 4, 5, '...', total];
			} else if (page >= total - 2) {
				pages = [1, '...', total - 4, total - 3, total - 2, total - 1, total];
			} else {
				pages = [1, '...', page - 1, page, page + 1, '...', total];
			}
		}
		return pages;
	}

	$: pages = generatePages(count, limit, page);

	$: targetPage = page;

	function jumpToPage(event: KeyboardEvent) {
		if (event.key === 'Enter' && targetPage) {
			// 使用SvelteKit的goto函数跳转页面
			if (browser) {
				console.log(targetPage);
				goto(`${path}/${targetPage}?limit=${limit}`);
			}
		}
	}
</script>

<div
	class="flex flex-col-reverse flex-wrap gap-4 sm:flex-row items-center justify-between border-t border-gray-200 bg-white mt-8 py-8"
>
	<!--	切换选择的时候，重新执行generatePages函数，更新pages数组。-->
	<div class="flex gap-4 items-center">
		<select
			bind:value={limit}
			on:change={generatePages(count, limit, page)}
			class="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-600 sm:text-sm sm:leading-6"
		>
			{#each limitOptions as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
		<p>{count} items total</p>
	</div>

	<div class="flex gap-8 flex-wrap justify-center">
		<input
			type="text"
			placeholder="输入页面编号..."
			bind:value={targetPage}
			on:keydown={jumpToPage}
			class="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
		/>

		<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
			<a
				href={`${path}/${page - 1}?limit=${limit}`}
				class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
			>
				<span class="sr-only">Previous</span>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
			{#each pages as p}
				{#if p === '...'}
					<span
						class="relative inline-flex items-center px-4 py-2 -ml-px text-gray-700 ring-1 ring-inset ring-gray-300"
					>
						...
					</span>
				{:else}
					<a
						class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:text-cyan-600 focus:z-20 focus:outline-offset-0"
						href={`${path}/${p}?limit=${limit}`}
					>
						{p}
					</a>
				{/if}
			{/each}
			<a
				href={`${path}/${page + 1}?limit=${limit}`}
				class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
			>
				<span class="sr-only">Next</span>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
		</nav>
	</div>
</div>
