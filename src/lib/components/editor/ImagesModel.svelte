<script lang="ts">
	import { getToastStore } from '$lib/toast';
	import Edit from '$assets/icons/edit.svelte';
	import EditImage from '$components/image/EditImage.svelte';
	import UploadFile from '$components/image/UploadFile.svelte';
	import { t } from '$lib/functions/i18n';
	import { onMount } from 'svelte';

	const toastStore = getToastStore();

	export let data;
	let { supabase } = data;
	$: ({ supabase } = data);
	let selectedImages = new Map<number, any>();
	let selectedNumber: number = 0;

	export let closeModel: () => void;
	export let onSelect;

	onMount(async () => {
		await getImages();
	});

	$: imagesList = [];
	let page = 1;

	// 获取图片信息
	const getImages = async (page: number = 1) => {
		const { data: images, error: fetchError } = await
			supabase.from('image').select().range((page - 1) * 24,
				page * 24 - 1).order('id', { ascending: false });
		if (fetchError) {
			console.error(fetchError);
			toastStore.trigger({
				message: 'Failed to fetch images.',
				background: 'variant-filled-error'
			});
		} else {
			imagesList = images;
		}
	};


	// 获取下一页图片数据
	const nextPage = async () => {
		await getImages(page + 1);
		page = page + 1;
	};

	// 获取上一页图片数据
	const prevPage = async () => {
		await getImages(page - 1);
		page = page - 1;
	};

	// 处理复选框状态改变
	const handleCheckboxChange = (image) => {
		if (selectedImages.has(image.id)) {
			selectedImages.delete(image.id); // 如果已存在，则删除
			selectedNumber = selectedNumber - 1;
		} else {
			selectedImages.set(image.id, {
				id: image.id,
				alt: image.alt,
				storage_key: image.storage_key,
				prefix: data.prefix,
				caption: image.caption,
			}); // 如果不存在，则添加
			selectedNumber = selectedNumber + 1;
		}
		selectedImages = new Map(selectedImages); // 触发Svelte的响应式更新
	};

	// 提交选中的图片
	const submitSelection = () => {
		const selectedArray = Array.from(selectedImages.values());
		onSelect(selectedArray);
		closeModel();
	};

	let isEditing = false;
	let imageData = {};

	function closeEdit() {
		isEditing = false;
	}

	function openEdit(image) {
		isEditing = true;
		imageData = image;
	}

	// 负责处理删除图片
	async function deleteImages() {
		const imageIds = Array.from(selectedImages.keys());
		// 查找data.images中id与deleteImageList的id一致的条目，提取storage_key
		const keysToDelete = data.images
		.filter(image => imageIds.includes(image.id))
		.map(image => image.storage_key);

		try {
			await Promise.all([
				await supabase.from('image').delete().in('id', imageIds),
				fetch('/api/image', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ keys: keysToDelete })
				})
			]);

			selectedImages = new Map();
			selectedNumber = 0;
			await getImages();
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

	// 刷新数据
	async function refresh() {
		await getImages();
	}
</script>

{#if isEditing}
	<EditImage data = {data} {closeEdit} imageData = {imageData} />
{/if}

<div class = "dialog">
	<div
		class = "fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
	></div>
	<div>
		<div
			class =
				"fixed inset-0 z-10 sm:w-11/12 mx-auto overflow-y-auto"
		>
			<div
				class =
					"flex items-end justify-center p-4 text-center sm:items-center sm:p-0"
			>
				<div
					class =
						"relative transform overflow-y-scroll rounded-lg bg-white px-4 text-left shadow-xl transition-all sm:w-full max-h-screen"
				>
					<div
						class = "flex justify-between items-center sticky top-0 z-50 w-full bg-white p-4"
					>
						<button
							on:click = {deleteImages}
							disabled = {selectedNumber <= 0}
							class =
								"inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{$t('delete')}
						</button>
						<div>{selectedNumber} Selected</div>
						<button
							on:click = {submitSelection}
							class = "relative inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 focus-visible:outline-offset-0"
						>
							{$t('submit')}
						</button>
					</div>
					<div class = "bg-white p-4">
						<UploadFile on:submit = {getImages} {refresh} />
						<div
							class = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 3xl:grid-cols-6 gap-4"
						>
							{#each imagesList as image (image.id)}
								<div
									data-image-id = {image.id}
									class = "bg-white border rounded-xl overflow-clip hover:shadow-md transition-all duration-150 space-y-2"
								>
									<div class = "object-contain aspect-square relative">
										<div
											class =
												"absolute left-4 top-4 flex gap-2 h-6 items-center"
										>
											<input
												on:change = {() => handleCheckboxChange(image)}
												id = {image.id} aria-describedby = {image.alt}
												name = {image.storage_key}
												type = "checkbox"
												class =
													"h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
											>
											<label for = {image.id}>{image.file_name}</label>
										</div>
										<button
											class = "absolute right-4 top-4 flex h-6 items-center"
											on:click = {() => openEdit(image)}
										>
											<Edit
												classList = "h-6 w-6 text-gray-400 hover:text-cyan-600"
											/>
										</button>
										<img
											src = {`${data.prefix}/cdn-cgi/image/format=auto,width=480/${data.prefix}/${image.storage_key}`}
											class = "img-bg h-full w-full object-contain"
											alt = {image.alt}
										/>
									</div>
								</div>
							{/each}
						</div>
					</div>
					<div
						class = "sticky bottom-0 p-4 bg-white border-t flex justify-between"
					>
						<button
							on:click = {closeModel}
							class = "relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0"
						>
							{$t('close')}
						</button>
						<div class = "space-x-4">
							<button
								on:click = {prevPage}
								disabled = {data.page === 1}
								class =
									"relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{$t('previous-page')}
							</button>
							<button
								on:click = {nextPage}
								class = "relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0"
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
