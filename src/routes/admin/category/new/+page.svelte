<script lang="ts">
	import { t } from '$lib/functions/i18n';
	import PhotoIcon from '$assets/icons/photo.svelte';
	import ImagesModel from '$components/editor/ImagesModel.svelte';
	import { getToastStore } from '$lib/toast';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import type { SelectedImage } from '$lib/types/images';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	const categoryData: Record<string, any> = {};

	let isModalOpen = false;
	let coverImage: SelectedImage | null = null;

	function selectCoverImage(images: SelectedImage[]) {
		const [image] = images;
		if (!image) return;

		coverImage = image;
		categoryData.cover = image.id;
	}

	function resetCoverImage() {
		coverImage = null;
		categoryData.cover = null;
	}

	function closeModel() {
		isModalOpen = false;
	}

	// 保存
	async function saveCategory() {
		categoryData.cover = coverImage?.id ?? null;

		const { error: insertError } = await supabase.from('category').insert(categoryData).select();

		if (insertError) {
			console.error(insertError);
			toastStore.trigger({
				message: `保存分类失败。${insertError.message}`,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: '创建分类成功。',
				hideDismiss: true,
				background: 'variant-filled-success'
			});
			await goto('/admin/category');
		}
	}
</script>

{#if isModalOpen}
	<ImagesModel {data} {closeModel} onSelect={selectCoverImage} />
{/if}

<div class="max-w-96 mx-auto">
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
						href="/admin/category"
						class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">{$t('category')}</a
					>
				</div>
			</li>
		</ol>
	</nav>

	<div class="space-y-6">
		<div>
			<label for="title" class="block text-sm font-medium leading-6 text-gray-900"
				>{$t('title')}</label
			>
			<div class="mt-2">
				<input
					value={categoryData.title}
					on:input={(event: Event) => {
						const target = event.currentTarget as HTMLInputElement;
						categoryData.title = target.value;
					}}
					type="text"
					name="title"
					id="title"
					class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				/>
			</div>
		</div>
		<div>
			<label for="type" class="block text-sm font-medium leading-6 text-gray-900"
				>{$t('type')}</label
			>
			<select
				value={categoryData.type}
				on:change={(event: Event) => {
					const target = event.currentTarget as HTMLSelectElement;
					categoryData.type = target.value;
				}}
				id="type"
				name="type"
				class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-600 sm:text-sm sm:leading-6"
			>
				<option value="article">Article</option>
				<option value="photo">Photo</option>
				<option value="video">Video</option>
			</select>
		</div>
		<div>
			<label for="slug" class="block text-sm font-medium leading-6 text-gray-900">Slug</label>
			<div class="mt-2">
				<input
					value={categoryData.slug}
					on:input={(event: Event) => {
						const target = event.currentTarget as HTMLInputElement;
						categoryData.slug = target.value;
					}}
					type="text"
					name="slug"
					id="slug"
					class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				/>
			</div>
			<p class="mt-2 text-sm text-gray-500">注意在同一个语言下和类型下不得重复</p>
		</div>
		<div>
			<label for="description" class="block text-sm font-medium leading-6 text-gray-900"
				>{$t('description')}</label
			>
			<div class="mt-2">
				<textarea
					value={categoryData.description}
					on:change={(event: Event) => {
						const target = event.currentTarget as HTMLTextAreaElement;
						categoryData.description = target.value;
					}}
					rows="3"
					name="description"
					id="description"
					class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				></textarea>
			</div>
		</div>
		<div>
			<label for="language" class="block text-sm font-medium leading-6 text-gray-900"
				>{$t('language')}</label
			>
			<select
				value={categoryData.lang}
				on:change={(event: Event) => {
					const target = event.currentTarget as HTMLSelectElement;
					categoryData.lang = target.value;
				}}
				id="language"
				name="language"
				class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-600 sm:text-sm sm:leading-6"
			>
				{#each data.languages as language}
					<option value={language.id}>{language.locale}</option>
				{/each}
			</select>
		</div>
		<div>
			<header class="flex justify-end gap-4">
				<h2 class="text-sm font-medium leading-6 text-gray-900 grow">{$t('cover')}</h2>
				<button
					on:click={resetCoverImage}
					type="button"
					disabled={!coverImage || Object.keys(coverImage).length === 0}
					class="rounded bg-red-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
				>
					{$t('reset')}
				</button>
				<button
					type="button"
					on:click={() => {
						isModalOpen = true;
					}}
					class="rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
				>
					{$t('select')}
				</button>
			</header>
			<div class="mt-2 aspect-[4/3] bg-gray-100 w-full rounded-md flex justify-center items-center">
				<input
					type="hidden"
					name="coverImageId"
					value={categoryData.cover}
					on:change={(event: Event) => {
						const target = event.currentTarget as HTMLInputElement;
						categoryData.cover = target.value;
					}}
				/>
				{#if coverImage && Object.keys(coverImage).length > 0}
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
		<button
			type="button"
			on:click={saveCategory}
			class="flex w-full justify-center rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
		>
			保存
		</button>
	</div>
</div>
