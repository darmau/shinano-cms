<script lang="ts">
	import ImagesModel from '$components/editor/ImagesModel.svelte';
	import { getToastStore } from '$lib/toast';
	import PhotoIcon from '$assets/icons/photo.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	let bookContent = {
		title: '',
		rate: 0,
		comment: '',
		date: null,
		cover: null,
		link: ''
	};

	let coverImage = bookContent.cover || {};
	let isChanged = false;

	// 保存图书信息
	async function saveBook() {
		const { data: saveBookData, error: saveBookError } = await supabase
			.from('book')
			.insert(bookContent)
			.select();

		if (saveBookError) {
			toastStore.trigger({
				message: `保存读书失败。${saveBookError.message}`,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			return;
		}

		toastStore.trigger({
			message: '保存读书笔记成功。',
			hideDismiss: true,
			background: 'variant-filled-success'
		});
		await goto('/admin/book/1');
	}

	// 选择图片
	let isModalOpen = false;

	function closeModel() {
		isModalOpen = false;
	}

	function selectPicture(images) {
		coverImage = {
			id: images[0].id,
			alt: images[0].alt,
			storage_key: images[0].storage_key
		};
		bookContent.cover = coverImage.id;
		isChanged = true;
	}

	function resetCoverImage() {
		coverImage = {};
		bookContent.cover = null;
		isChanged = true;
	}
</script>

{#if isModalOpen}
	<ImagesModel {data} {closeModel} onSelect={selectPicture} />
{/if}

<div class="max-w-3xl mx-auto">
	<nav class="flex mb-8" aria-label="Breadcrumb">
		<ol role="list" class="flex items-center space-x-4">
			<li>
				<div>
					<a data-sveltekit-preload-data href="/admin" class="text-gray-400 hover:text-gray-500">
						<svg
							class="h-5 w-5 flex-shrink-0"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="sr-only">首页</span>
					</a>
				</div>
			</li>
			<li>
				<div class="flex items-center">
					<svg
						class="h-5 w-5 flex-shrink-0 text-gray-300"
						fill="currentColor"
						viewBox="0 0 20 20"
						aria-hidden="true"
					>
						<path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
					</svg>
					<a
						data-sveltekit-preload-data
						href="/admin/book/1"
						class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">书籍</a
					>
				</div>
			</li>
		</ol>
	</nav>

	<div class="space-y-6">
		<!--标题-->
		<input
			bind:value={bookContent.title}
			type="text"
			class="w-full p-4 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
			placeholder="标题"
		/>

		<!--评分 1-5星-->
		<input
			bind:value={bookContent.rate}
			type="number"
			min="1"
			max="5"
			class="w-full p-4 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
			placeholder="评分"
		/>

		<!--评价-->
		<textarea
			bind:value={bookContent.comment}
			class="w-full h-64 p-4 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
			placeholder="在这里输入内容"
		></textarea>

		<!--日期-->
		<input
			bind:value={bookContent.date}
			type="datetime-local"
			class="w-full p-4 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
			placeholder="日期"
		/>

		<!--封面-->
		<div>
			<header class="flex justify-end gap-4">
				<h2 class="text-sm font-medium leading-6 text-gray-900 grow">封面</h2>
				<button
					on:click={resetCoverImage}
					disabled={Object.keys(coverImage).length === 0}
					class="rounded bg-red-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
				>
					重置
				</button>
				<button
					on:click={() => {
						isModalOpen = true;
					}}
					class="rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
				>
					选择
				</button>
			</header>
			<div class="mt-2 aspect-[4/3] bg-gray-100 w-full rounded-md flex justify-center items-center">
				{#if Object.keys(coverImage).length > 0}
					<img
						src={`${data.prefix}/cdn-cgi/image/format=auto,width=480/${coverImage.storage_key}`}
						alt={coverImage.alt}
						class="img-bg h-full w-full object-contain"
					/>
				{:else}
					<PhotoIcon classList="h-16 w-16 text-gray-400 m-auto" />
				{/if}
			</div>
		</div>

		<!--链接-->
		<input
			bind:value={bookContent.link}
			type="text"
			class="w-full p-4 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
			placeholder="链接"
		/>

		<!--保存-->
		<button
			on:click={saveBook}
			type="button"
			disabled={!isChanged}
			class="flex w-full justify-center rounded-md bg-cyan-600 p-3 text-base font-semibold leading-6 text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
		>
			保存
		</button>
	</div>
</div>
