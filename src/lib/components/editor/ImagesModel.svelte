<script lang="ts">
	import { onMount } from 'svelte';
	import { getToastStore } from '$lib/toast';
	import Edit from '$assets/icons/edit.svelte';
	import EditImage from '$components/image/EditImage.svelte';
	import UploadFile from '$components/image/UploadFile.svelte';
	import UnsplashBrowser from '$components/image/UnsplashBrowser.svelte';
	import AIImageGenerator from '$components/image/AIImageGenerator.svelte';
	import { t } from '$lib/functions/i18n';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import type { ImagesModelData, SelectedImage } from '$lib/types/editor';
	import type { MediaImageRecord } from '$lib/api/media';

	const PAGE_SIZE = 24;
	const toastStore = getToastStore();

	type ImageRecord = {
		id: number;
		alt: string | null;
		storage_key: string;
		file_name?: string;
		caption?: string | null;
	};

type ImagesModelCallback = (images: SelectedImage[]) => void;

	export let data: ImagesModelData;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	let imagesList: ImageRecord[] = [];
	let page = 1;
	let selectedImages = new Map<number, SelectedImage>();
	$: selectedCount = selectedImages.size;
	let viewMode: 'library' | 'unsplash' | 'ai' = 'library';

	export let closeModel: () => void;
	export let onSelect: ImagesModelCallback;

	let isEditing = false;
	let imageData: Record<string, unknown> = {};

	onMount(() => {
		getImages();
	});

	async function getImages(pageNumber = 1) {
		if (!supabase) {
			return;
		}

		const rangeStart = (pageNumber - 1) * PAGE_SIZE;
		const rangeEnd = pageNumber * PAGE_SIZE - 1;
		const { data: images, error } = await supabase
			.from('image')
			.select()
			.range(rangeStart, rangeEnd)
			.order('id', { ascending: false });

		if (error) {
			console.error(error);
			toastStore.trigger({
				message: 'Failed to fetch images.',
				background: 'variant-filled-error'
			});
			return;
		}

		imagesList = images ?? [];
		page = pageNumber;
	}

	async function nextPage() {
		await getImages(page + 1);
	}

	async function prevPage() {
		if (page <= 1) {
			return;
		}

		await getImages(page - 1);
	}

	function handleCheckboxChange(image: ImageRecord) {
		if (selectedImages.has(image.id)) {
			selectedImages.delete(image.id);
		} else {
			selectedImages.set(image.id, {
				...image,
				prefix: data.prefix
			});
		}

		selectedImages = new Map<number, SelectedImage>(selectedImages);
	}

	function submitSelection() {
		const selectedArray = Array.from(selectedImages.values());
		onSelect(selectedArray);
		closeModel();
	}

	function closeEdit() {
		isEditing = false;
	}

	function openEdit(image: ImageRecord) {
		isEditing = true;
		imageData = image;
	}

async function handleUnsplashImported({ image }: { image: MediaImageRecord }) {

		await getImages(1);

		selectedImages = new Map<number, SelectedImage>([
			[
				image.id,
				{
					id: image.id,
					storage_key: image.storage_key,
					prefix: data.prefix,
					alt: image.alt,
					caption: image.caption ?? null
				}
			]
		]);

		viewMode = 'library';
		submitSelection();
	}

async function handleAIImported({ image }: { image: MediaImageRecord }) {

	await getImages(1);

	selectedImages = new Map<number, SelectedImage>([
		[
			image.id,
			{
				id: image.id,
				storage_key: image.storage_key,
				prefix: data.prefix,
				alt: image.alt,
				caption: image.caption ?? null
			}
		]
	]);

	viewMode = 'library';
	submitSelection();
}

	async function deleteImages() {
		if (!selectedImages.size) {
			return;
		}

		const imagesToDelete = Array.from(selectedImages.values());
		const imageIds = imagesToDelete.map((image) => image.id);
		const keysToDelete = imagesToDelete.map((image) => image.storage_key);

		try {
			if (!supabase) {
				return;
			}

			await Promise.all([
				supabase.from('image').delete().in('id', imageIds),
				fetch('/api/image', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ keys: keysToDelete })
				})
			]);

			const deletedCount = imageIds.length;
			selectedImages = new Map<number, SelectedImage>();
			await getImages(page);
			toastStore.trigger({
				message: `成功删除${deletedCount}张图片。`,
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		} catch (error) {
			console.error('删除图片时出错:', error);
			toastStore.trigger({
				message: '删除图片失败。',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		}
	}

	async function refresh() {
		await getImages(page);
	}
</script>

{#if isEditing}
	<EditImage data={data} {closeEdit} imageData={imageData} />
{/if}

<div class="dialog">
	<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
	<div>
		<div class="fixed inset-0 z-10 sm:w-11/12 mx-auto overflow-y-auto">
			<div class="flex items-end justify-center p-4 text-center sm:items-center sm:p-0">
				<div class="relative transform overflow-y-scroll rounded-lg bg-white px-4 text-left shadow-xl transition-all sm:w-full max-h-screen">
					<div class="flex flex-col gap-4 sticky top-0 z-50 w-full bg-white p-4 shadow-sm">
						<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div class="flex flex-wrap items-center gap-3">
								<div class="inline-flex rounded-md border border-gray-200 p-0.5">
									<button
										type="button"
										on:click={() => (viewMode = 'library')}
										class={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
											viewMode === 'library'
												? 'bg-cyan-600 text-white shadow-sm'
												: 'text-gray-600 hover:bg-gray-100'
										}`}
									>
										媒体库
									</button>
									<button
										type="button"
										on:click={() => (viewMode = 'unsplash')}
										class={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
											viewMode === 'unsplash'
												? 'bg-cyan-600 text-white shadow-sm'
												: 'text-gray-600 hover:bg-gray-100'
										}`}
									>
										Unsplash
									</button>
									<button
										type="button"
										on:click={() => (viewMode = 'ai')}
										class={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
											viewMode === 'ai'
												? 'bg-cyan-600 text-white shadow-sm'
												: 'text-gray-600 hover:bg-gray-100'
										}`}
									>
										AI 生成
									</button>
								</div>
								<button
									on:click={deleteImages}
									disabled={selectedCount <= 0 || viewMode !== 'library'}
									class="inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-300"
								>
									{$t('delete')}
								</button>
							</div>
							<div class="text-sm text-gray-600">
								{#if viewMode === 'library'}
									{selectedCount} Selected
								{:else if viewMode === 'unsplash'}
									点击图片即可导入 Unsplash 图片
								{:else}
									输入提示词生成图片，满意后保存至媒体库
								{/if}
							</div>
							<button
								on:click={submitSelection}
								disabled={selectedCount <= 0 || viewMode !== 'library'}
								class="relative inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:bg-gray-300"
							>
								{$t('submit')}
							</button>
						</div>
					</div>
					<div class="bg-white p-4">
						{#if viewMode === 'library'}
							<UploadFile refresh={refresh} />
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
								{#each imagesList as image (image.id)}
									<div data-image-id={image.id} class="bg-white border-2 border-gray-200 rounded-xl overflow-clip hover:shadow-md transition-all duration-150 space-y-2">
										<div class="object-contain aspect-square relative">
											<div class="absolute left-4 top-4 flex gap-2 h-6 items-center">
												<input
													on:change={() => handleCheckboxChange(image)}
													id={String(image.id)}
													aria-label={image.alt ?? ''}
													name={image.storage_key}
													type="checkbox"
													class="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
												>
												<label for={String(image.id)}>{image.file_name ?? ''}</label>
											</div>
											<button class="absolute right-4 top-4 flex h-6 items-center" on:click={() => openEdit(image)}>
												<Edit classList="h-6 w-6 text-gray-400 hover:text-cyan-600" />
											</button>
											<img
												src={`${data.prefix}/cdn-cgi/image/format=auto,width=480/${data.prefix}/${image.storage_key}`}
												class="img-bg h-full w-full object-contain"
												alt={image.alt ?? ''}
											/>
										</div>
									</div>
								{/each}
							</div>
						{:else if viewMode === 'unsplash'}
							<UnsplashBrowser supabase={supabase} onImport={handleUnsplashImported} />
						{:else}
							<AIImageGenerator supabase={supabase} onImport={handleAIImported} />
						{/if}
					</div>
					<div class="sticky bottom-0 p-4 bg-white border-t border-gray-200 flex justify-between">
						<button
							on:click={closeModel}
							class="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0"
						>
							{$t('close')}
						</button>
						<div class="space-x-4">
							<button
								on:click={prevPage}
								disabled={page === 1}
								class="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{$t('previous-page')}
							</button>
							<button
								on:click={nextPage}
								class="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0"
							>
								{$t('next-page')}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dialog {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 500;
	}
</style>
