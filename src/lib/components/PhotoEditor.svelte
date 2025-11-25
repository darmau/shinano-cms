<script lang="ts">
	import SimpleEditor from '$components/editor/SimpleEditor.svelte';
	import AddIcon from '$assets/icons/plus.svelte';
	import { getToastStore } from '$lib/toast';
	import { beforeNavigate, goto } from '$app/navigation';
	import getDateFormat from '$lib/functions/dateFormat';
	import { onMount } from 'svelte';
	import ImagesModel from '$components/editor/ImagesModel.svelte';
	import { flip } from 'svelte/animate';
	import PhotoIcon from '$assets/icons/photo.svelte';
	import DeleteIcon from '$assets/icons/delete.svelte';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Content } from '@tiptap/core';
	import { splitHtmlByTopLevelNodes } from '$lib/functions/htmlChunk';
	import type {
		AlbumPicture,
		SelectedImage,
		PhotoContent,
		PageData,
		PhotoImageInsert,
		Language
	} from '$lib/types/photo';
	import type { EditorContentUpdateDetail, EditorHandle, ImagesModelData } from '$lib/types/editor';

	export let data: PageData;
	export let isSaved: boolean = false;
	const supabase: SupabaseClient | null = browser ? getSupabaseBrowserClient() : null;
	let imagesModelData: ImagesModelData = {
		supabase,
		prefix: data.prefix
	};

	$: imagesModelData = {
		supabase,
		prefix: data.prefix
	};

	const toastStore = getToastStore();

	// 保存
	let photoContent: PhotoContent = {
		...data.photoContent,
		photos: [...(data.photoContent.photos ?? [])],
		topic: [...(data.photoContent.topic ?? [])],
		category: data.photoContent.category ?? null,
		cover: data.photoContent.cover ?? null,
		published_at: data.photoContent.published_at ?? null
	};
	let isChanged = false;

	let localTime: string | null = photoContent.published_at
		? getDateFormat(photoContent.published_at, true)
		: null;

	// 保存摄影
	async function savePhoto(): Promise<boolean | undefined> {
		if (!supabase) {
			return;
		}

		let newPhotoId: number | null = null;

		// 存储photo信息
		if (isSaved === true) {
			if (!photoContent.id) {
				console.error('Missing photo id when saving existing photo');
				toastStore.trigger({
					message: 'Photo id is missing. Please refresh and try again.',
					background: 'variant-filled-error'
				});
				return false;
			}

			const { error: savePhotoError } = await supabase
				.from('photo')
				.update({
					title: photoContent.title,
					slug: photoContent.slug,
					abstract: photoContent.abstract,
					content_json: photoContent.content_json,
					content_html: photoContent.content_html,
					content_text: photoContent.content_text,
					cover: photoContent.cover,
					category: photoContent.category,
					topic: photoContent.topic,
					is_top: photoContent.is_top,
					is_featured: photoContent.is_featured,
					is_draft: photoContent.is_draft,
					updated_at: new Date().toISOString(),
					published_at: localTime ? new Date(localTime).toISOString() : null
				})
				.eq('id', photoContent.id);

			if (savePhotoError) {
				console.error('Error happened when saved a existing photo: ', savePhotoError);
				toastStore.trigger({
					message: savePhotoError.message,
					background: 'variant-filled-error'
				});
			} else {
				toastStore.trigger({
					message: 'Photo saved successfully.',
					background: 'variant-filled-success'
				});
				isSaved = true;
				isChanged = false;
			}

			// 删除photo_image表现有信息 photoContent.photos
			const { error: deletePhotoImageError } = await supabase
				.from('photo_image')
				.delete()
				.eq('photo_id', photoContent.id);

			if (deletePhotoImageError) {
				console.error('Delete existing photo relation', deletePhotoImageError);
				toastStore.trigger({
					message: deletePhotoImageError.message,
					background: 'variant-filled-error'
				});
			}
		} else {
			// 全新的photo
			const { data: newPhoto, error: savePhotoError } = await supabase
				.from('photo')
				.insert({
					lang: data.currentLanguage.id,
					title: photoContent.title,
					slug: photoContent.slug,
					abstract: photoContent.abstract,
					content_json: photoContent.content_json,
					content_html: photoContent.content_html,
					content_text: photoContent.content_text,
					cover: photoContent.cover,
					category: photoContent.category,
					topic: photoContent.topic,
					is_top: photoContent.is_top,
					is_featured: photoContent.is_featured,
					is_draft: photoContent.is_draft,
					updated_at: new Date().toISOString(),
					published_at: localTime ? new Date(localTime).toISOString() : null
				})
				.select();

			if (savePhotoError) {
				console.error('Error happened when saved a new photo', savePhotoError);
				toastStore.trigger({
					message: savePhotoError.message,
					background: 'variant-filled-error'
				});
				isChanged = false;
			} else {
				const createdPhotoId = newPhoto?.[0]?.id;
				if (createdPhotoId) {
					newPhotoId = createdPhotoId;
					photoContent.id = createdPhotoId;
					toastStore.trigger({
						message: 'Photo saved successfully.',
						background: 'variant-filled-success'
					});
					isSaved = true;
				}
			}
		}

		// bulk存入新的photo_image信息
		const targetPhotoId = photoContent.id ?? newPhotoId;

		if (targetPhotoId == null) {
			return true;
		}

		const albumImages: PhotoImageInsert[] = photoContent.photos.map((photo) => ({
			photo_id: targetPhotoId,
			image_id: photo.image.id,
			order: photo.order
		}));

		if (albumImages.length) {
			const { error: savePhotoImageError } = await supabase.from('photo_image').insert(albumImages);

			if (savePhotoImageError) {
				console.error('Save image relations failed', savePhotoImageError);
				toastStore.trigger({
					message: savePhotoImageError.message,
					background: 'variant-filled-error'
				});
			}
		}

		if (newPhotoId) {
			await goto(`/admin/photo/edit/${newPhotoId}`);
		}

		return true;
	}

	// 选择图片
	let pictures: AlbumPicture[] = [...photoContent.photos]; // 用于存储选择的图片数组，需要存入photo_image表
	function selectPictures(images: SelectedImage[]): void {
		const currentLastIndex = pictures.length;
		const newImages: AlbumPicture[] = images.map((image, index) => ({
			image,
			order: currentLastIndex + index + 1
		}));
		pictures = [...pictures, ...newImages];
		photoContent.photos = [...pictures];
		isChanged = true;
	}

	let isModalOpen = false;

	function closeModel(): void {
		isModalOpen = false;
	}

	// 更改顺序
	let draggingIndex: number | null = null;

	function dragStart(event: DragEvent, index: number): void {
		draggingIndex = index;
		event.dataTransfer?.setData('text/plain', index.toString());
	}

	function dragOver(event: DragEvent, index: number): void {
		event.preventDefault();
		if (draggingIndex !== null && draggingIndex !== index) {
			const newPictures = [...pictures];
			const [removed] = newPictures.splice(draggingIndex, 1);
			if (!removed) {
				return;
			}
			newPictures.splice(index, 0, removed);
			pictures = newPictures;
			draggingIndex = index;
			photoContent.photos = [...pictures];
		}
	}

	function dragEnd(): void {
		draggingIndex = null;
		// 更新order值
		pictures = pictures.map((pic, indexValue) => ({
			...pic,
			order: indexValue + 1
		}));
		photoContent.photos = [...pictures];
		isChanged = true;
	}

	// 自动设置第一张图为封面
	$: photoContent.cover = pictures.length > 0 ? pictures[0].image.id : null;

	// 删除图片
	function deleteImage(index: number): void {
		pictures = pictures.filter((_, i) => i !== index);
		// 更新order值
		pictures = pictures.map((pic, indexValue) => ({
			...pic,
			order: indexValue + 1
		}));
		photoContent.photos = [...pictures];
		isChanged = true;
	}

	// 切换发布摄影
	async function publishPhoto(): Promise<void> {
		if (!supabase) {
			return;
		}

		await savePhoto();

		const photoId = photoContent.id;
		if (!photoId) {
			return;
		}

		if (photoContent.is_draft) {
			photoContent.is_draft = false;
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const date = localTime ? new Date(localTime) : new Date();
			const isoString = date.toLocaleString('en-US', { timeZone: timezone });
			photoContent.published_at = new Date(isoString).toISOString();
		} else {
			photoContent.is_draft = true;
			photoContent.published_at = null;
			localTime = null;
		}

		const { error } = await supabase
			.from('photo')
			.update({
				is_draft: photoContent.is_draft,
				published_at: photoContent.published_at
			})
			.eq('id', photoId)
			.select();

		if (error) {
			console.error(error);
			toastStore.trigger({
				message: error.message,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: 'Photo published successfully.',
				background: 'variant-filled-success'
			});
			isChanged = false;
		}
	}

	// 删除摄影
	async function deletePhoto(): Promise<void> {
		if (!supabase) {
			return;
		}

		if (!isSaved || !photoContent.id) {
			toastStore.trigger({
				message: 'Photo not saved yet.',
				background: 'variant-filled-error'
			});
			return;
		}

		const { error } = await supabase.from('photo').delete().eq('id', photoContent.id).select();
		if (error) {
			console.error(error);
			toastStore.trigger({
				message: error.message,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: 'Article deleted successfully.',
				background: 'variant-filled-success'
			});
			await goto('/admin/photo/1');
		}
	}

	// 找出当前摄影没有的语言
	function generateNewLanguageVersions(): Language[] {
		const currentLanguageId = data.currentLanguage.id;
		return data.allLanguages.filter(
			(language) =>
				!data.otherVersions.some((version) => version.lang.id === language.id) &&
				language.id !== currentLanguageId
		);
	}

	const newLanguageVersions: Language[] = generateNewLanguageVersions();

	// 检查slug
	let isCheckingSlug = false;
	let slugExists = false;
	let isGeneratingSlug = false;
	let isGeneratingAbstract = false;
	let isGeneratingTags = false;
	let isTranslatingContent = false;
	let translationChunksTotal = 0;
	let translationChunksCompleted = 0;

	async function checkSlug(slug: string): Promise<boolean> {
		isCheckingSlug = true;

		const { error } = await fetch('/api/slug-check', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				type: 'photo',
				langId: data.currentLanguage.id,
				slug,
				contentId: photoContent.id ?? null
			})
		}).then((res) => res.json() as Promise<{ error?: string }>);

		isCheckingSlug = false;
		if (error) {
			toastStore.trigger({
				message: error,
				background: 'variant-filled-error'
			});
			slugExists = true;
			return false;
		}

		slugExists = false;
		return true;
	}

	// 生成slug
	async function generateSlug(): Promise<void> {
		if (isGeneratingSlug) {
			return;
		}

		const title = photoContent.title?.trim();
		if (!title) {
			toastStore.trigger({
				message: '请先填写标题。',
				background: 'variant-filled-error'
			});
			return;
		}

		isGeneratingSlug = true;
		try {
			photoContent.slug = await fetch('/api/slug', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ title })
			}).then((res) => res.text());
			isChanged = true;
		} catch (err) {
			console.error('Failed to generate slug', err);
			toastStore.trigger({
				message: '生成 slug 失败，请稍后重试。',
				background: 'variant-filled-error'
			});
		} finally {
			isGeneratingSlug = false;
		}
	}

	// 生成摘要
	async function generateAbstract(): Promise<void> {
		if (isGeneratingAbstract) {
			return;
		}

		const content = photoContent.content_text;
		if (!content?.trim()) {
			toastStore.trigger({
				message: '正文内容为空，无法生成摘要。',
				background: 'variant-filled-error'
			});
			return;
		}

		isGeneratingAbstract = true;
		try {
			photoContent.abstract = await fetch('/api/abstract', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ content })
			}).then((res) => res.text());
			isChanged = true;
		} catch (err) {
			console.error('Failed to generate abstract', err);
			toastStore.trigger({
				message: '生成摘要失败，请稍后重试。',
				background: 'variant-filled-error'
			});
		} finally {
			isGeneratingAbstract = false;
		}
	}

	// 监控正文变动
	let contentJSON: Content | undefined = photoContent.content_json
		? (photoContent.content_json as Content)
		: undefined;
	let contentHTML = photoContent.content_html;
	let contentText = photoContent.content_text;

	function handleContentUpdate({ json, html, text }: EditorContentUpdateDetail): void {
		contentJSON = json;
		contentHTML = html;
		contentText = text;
		photoContent.content_json = json as Record<string, unknown>;
		photoContent.content_html = html;
		photoContent.content_text = text;
		isChanged = true;
	}

	// 话题
	let topics: string[] = [...photoContent.topic];
	let topicInput = '';

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && topicInput.trim() !== '') {
			topics = [...topics, topicInput.trim()];
			photoContent.topic = [...topics];
			topicInput = '';
			isChanged = true;
		}
	}

	function removeTopic(index: number): void {
		topics = topics.filter((_, i) => i !== index);
		photoContent.topic = [...topics];
		isChanged = true;
	}

	// 生成tags
	async function generateTags(): Promise<void> {
		if (isGeneratingTags) {
			return;
		}

		const content = photoContent.content_text;
		if (!content?.trim()) {
			toastStore.trigger({
				message: '正文内容为空，无法生成标签。',
				background: 'variant-filled-error'
			});
			return;
		}

		isGeneratingTags = true;
		try {
			const result = await fetch('/api/tags', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ content })
			}).then((res) => res.json() as Promise<{ tags?: string[] }>);
			topics = result.tags ?? [];
			photoContent.topic = [...topics];
			isChanged = true;
		} catch (err) {
			console.error('Failed to generate tags', err);
			toastStore.trigger({
				message: '生成标签失败，请稍后重试。',
				background: 'variant-filled-error'
			});
		} finally {
			isGeneratingTags = false;
		}
	}

	// 防止误关页面
	function handleBeforeUnload(event: BeforeUnloadEvent): void {
		if (!isSaved && isChanged) {
			event.preventDefault();
			event.returnValue = '';
		}
	}

	// 翻译
	let editorComponent: EditorHandle | null = null;

	function generateContent(content: Content): void {
		editorComponent?.updateContent(content);
	}

	async function getTranslation() {
		if (isTranslatingContent) {
			return;
		}

		const originalHtml = photoContent.content_html;
		if (!originalHtml?.trim()) {
			toastStore.trigger({
				message: '正文内容为空，无法翻译。',
				background: 'variant-filled-error'
			});
			return;
		}

		isTranslatingContent = true;
		const chunks = splitHtmlByTopLevelNodes(originalHtml);
		if (chunks.length === 0) {
			isTranslatingContent = false;
			return;
		}

		translationChunksTotal = chunks.length;
		translationChunksCompleted = 0;

		const translatedChunks = new Array<string>(chunks.length).fill('');

		const translateChunk = async (chunk: string) => {
			const response = await fetch('/api/translation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					lang: data.currentLanguage.locale,
					content: chunk
				})
			});

			if (!response.ok) {
				throw new Error(`Translation API responded with status ${response.status}`);
			}

			return response.text();
		};

		try {
			for (let index = 0; index < chunks.length; index += 1) {
				const translation = await translateChunk(chunks[index]);
				translatedChunks[index] = translation.trim().length > 0 ? translation : chunks[index];
				translationChunksCompleted = index + 1;

				const partialHtml = translatedChunks
					.map((value, chunkIndex) => value || chunks[chunkIndex])
					.join('');

				photoContent.content_html = partialHtml;
				contentHTML = partialHtml;
				generateContent(partialHtml);
			}

			if (typeof document !== 'undefined') {
				const parser = document.createElement('div');
				parser.innerHTML = photoContent.content_html;
				const plainText = parser.textContent ?? '';
				contentText = plainText;
				photoContent.content_text = plainText;
			}

			isChanged = true;
		} catch (err) {
			console.error('Failed to translate content', err);
			photoContent.content_html = originalHtml;
			contentHTML = originalHtml;
			generateContent(originalHtml);
			toastStore.trigger({
				message: '翻译失败，请稍后重试。',
				background: 'variant-filled-error'
			});
		} finally {
			isTranslatingContent = false;
			translationChunksTotal = 0;
			translationChunksCompleted = 0;
		}
	}

	beforeNavigate((navigation) => {
		if (!isSaved && isChanged) {
			if (!confirm('你还有未保存的修改，确定要离开吗？')) {
				navigation.cancel();
			}
		}
	});

	onMount(() => {
		isCheckingSlug = true;
		checkSlug(photoContent.slug);
	});
</script>

<svelte:window on:beforeunload={handleBeforeUnload} />

{#if isModalOpen}
	<ImagesModel data={imagesModelData} {closeModel} onSelect={selectPictures} />
{/if}

<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
	<div class="space-y-8 md:col-span-3">
		<!--标题-->
		<div>
			<label for="title" class="block text-sm font-medium leading-6 text-gray-900"
				>标题</label
			>
			<div class="mt-2">
				<input
					type="text"
					name="title"
					id="title"
					bind:value={photoContent.title}
					on:input={() => {
						isChanged = true;
					}}
					required
					class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
					placeholder="必须填写标题"
				/>
			</div>
		</div>

		<!--slug-->
		<div>
			<label for="slug" class="block text-sm font-medium leading-6 text-gray-900">Slug</label>
			<div class="mt-2 flex gap-4">
				<input
					type="text"
					name="slug"
					id="slug"
					bind:value={photoContent.slug}
					on:input={() => {
						isChanged = true;
						checkSlug(photoContent.slug);
					}}
					required
					class="block font-mono w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				/>
				<button
					type="button"
					on:click={generateSlug}
					disabled={isGeneratingSlug}
					class="w-fit break-keep rounded bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-600 shadow-sm hover:bg-cyan-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
					>{isGeneratingSlug ? '生成中...' : '生成'}</button
				>
			</div>
			{#if isCheckingSlug}
				<p class="mt-2 text-sm text-gray-600">Checking...</p>
			{:else if slugExists}
				<p class="mt-2 text-sm text-red-600">这个 slug 不能使用</p>
			{:else}
				<p class="mt-2 text-sm text-green-600">你可以使用这个 slug</p>
			{/if}
		</div>

		<!--编辑器-->
		<SimpleEditor
			onContentUpdate={handleContentUpdate}
			content={contentJSON}
			bind:this={editorComponent}
		/>
		<button
			type="button"
			on:click={getTranslation}
			disabled={isTranslatingContent}
			class="rounded-md bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-600 shadow-sm hover:bg-cyan-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
			>{isTranslatingContent
				? `生成中...${translationChunksTotal > 0 ? ` (${translationChunksCompleted}/${translationChunksTotal})` : ''}`
				: '翻译'}</button
		>

		<!--图片-->
		<div>
			<header class="flex justify-between items-center mb-4">
				<label for="images" class="block text-sm font-medium leading-6 text-gray-900"
					>照片</label
				>
				{#if pictures.length > 0}
					<button
						on:click={() => {
							isModalOpen = true;
						}}
						class="rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
					>
						选择
					</button>
				{/if}
			</header>
			{#if pictures.length > 0}
				<ol class="grid grid-cols-2 md:grid-cols-3 gap-4">
					{#each pictures as photo, index (photo.order)}
						<li
							draggable={true}
							on:dragstart={(event) => dragStart(event, index)}
							on:dragover={(event) => dragOver(event, index)}
							on:dragend={dragEnd}
							animate:flip={{ duration: 100 }}
						>
							<figure
								class="relative object-contain aspect-square flex flex-col justify-center items-center rounded-md border border-gray-100"
							>
								<img
									src={`${data.prefix}/cdn-cgi/image/format=auto,width=480/${photo.image.storage_key}`}
									alt={photo.image.alt}
									class="img-bg h-full w-full object-contain"
								/>
								{#if index === 0}
									<div
										class="absolute top-2 left-2 bg-cyan-600 text-white text-xs px-2 py-1 rounded shadow-sm"
									>
										封面
									</div>
								{/if}
								<button on:click={() => deleteImage(index)} class="absolute top-4 right-4">
									<DeleteIcon classList="h-6 w-6 text-gray-400 hover:text-red-600" />
								</button>
								{#if photo.image.caption}
									<figcaption class="text-sm text-gray-700 p-4">{photo.image.caption}</figcaption>
								{/if}
							</figure>
						</li>
					{/each}
				</ol>
			{:else}
				<div class="text-center rounded-md py-16 border-2 border-dashed border-gray-300">
					<PhotoIcon classList="mx-auto h-12 w-12 text-gray-400" />
					<h3 class="mt-2 text-sm font-semibold text-gray-900">No photos</h3>
					<div class="mt-6">
						<button
							type="button"
							on:click={() => {
								isModalOpen = true;
							}}
							class="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
						>
							<svg
								class="-ml-0.5 mr-1.5 h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
								/>
							</svg>
							创建
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<aside class="col-span-1 space-y-8">
		<!--发布时间-->
		<div>
			<label for="publish-time" class="text-sm font-medium leading-6 text-gray-900"
				>发布时间</label
			>
			<input
				type="datetime-local"
				id="publish-time"
				bind:value={localTime}
				on:change={() => {
					isChanged = true;
				}}
				class="mt-2 w-full rounded-md border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
			/>
		</div>

		<!--语言-->
		<div>
			<h2 class="text-sm font-medium leading-6 text-gray-900">语言</h2>
			<ul class="mt-2 flex gap-2">
				<li
					class="inline-flex items-center gap-x-1.5 rounded-md bg-green-100 p-2 text-xs font-medium text-green-700"
				>
					<svg class="h-1.5 w-1.5 fill-green-500" viewBox="0 0 6 6" aria-hidden="true">
						<circle cx="3" cy="3" r="3" />
					</svg>
					{data.currentLanguage.locale}
				</li>
				{#each data.otherVersions as version}
					<li
						class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-200"
					>
						<a data-sveltekit-reload href={`/admin/photo/edit/${version.id}`}>
							{version.lang.locale}
						</a>
					</li>
				{/each}
				{#if photoContent.id}
					{#each newLanguageVersions as newVersion}
						<li
							class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
						>
							<a
								data-sveltekit-reload
								href={`/admin/photo/new?from=${photoContent.id}&lang=${newVersion.id}`}
							>
								+ {newVersion.locale}
							</a>
						</li>
					{/each}
				{/if}
			</ul>
		</div>

		<!--分类-->
		<div>
			<header class="flex justify-between">
				<label class="text-sm font-medium leading-6 text-gray-900" for="category"
					>分类</label
				>
				<a href="/admin/category/new" target="_blank">
					<AddIcon classList="h-4 w-4 text-gray-400 hover:text-cyan-600" />
				</a>
			</header>
			<select
				bind:value={photoContent.category}
				on:change={() => {
					isChanged = true;
				}}
				id="category"
				name="category"
				class="mt-2 block w-full rounded-md border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-600 sm:text-sm sm:leading-6"
			>
				{#each data.categories as category}
					<option value={category.id}>{category.title}</option>
				{/each}
			</select>
		</div>

		<!--话题-->
		<div>
			<div class="flex justify-between">
				<label for="abstract" class="block text-sm font-medium leading-6 text-gray-900"
					>话题</label
				>
				<button
					type="button"
					on:click={generateTags}
					disabled={isGeneratingTags}
					class="rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text白色shadow-sm hover:bg-cyan-500 cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
					>{isGeneratingTags ? '生成中...' : '生成'}</button
				>
			</div>
			<div class="relative mt-2">
				<div
					class="flex flex-wrap gap-1 w-full rounded-md border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
				>
					{#each topics as topic, index}
						<span
							class="inline-flex items-center gap-x-0.5 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
						>
							{topic}
							<button
								type="button"
								on:click={() => removeTopic(index)}
								class="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-gray-500/20"
							>
								<span class="sr-only">Remove</span>
								<svg
									viewBox="0 0 14 14"
									class="h-3.5 w-3.5 stroke-gray-600/50 group-hover:stroke-gray-600/75"
								>
									<path d="M4 4l6 6m0-6l-6 6" />
								</svg>
								<span class="absolute -inset-1"></span>
							</button>
						</span>
					{/each}
					<input
						type="text"
						bind:value={topicInput}
						on:keydown={handleKeydown}
						class="peer border-none text-sm focus:ring-0 focus:outline-none bg-transparent"
					/>
				</div>
			</div>
		</div>

		<!--摘要-->
		<div>
			<div class="flex justify-between">
				<label for="abstract" class="block text-sm font-medium leading-6 text-gray-900"
					>摘要</label
				>
				<button
					type="button"
					on:click={generateAbstract}
					disabled={isGeneratingAbstract}
					class="rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text白色shadow-sm hover:bg-cyan-500 cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
					>{isGeneratingAbstract ? '生成中...' : '生成'}</button
				>
			</div>
			<div class="mt-2">
				<textarea
					name="abstract"
					id="abstract"
					rows="3"
					bind:value={photoContent.abstract}
					on:input={() => {
						isChanged = true;
					}}
					placeholder="使用AI为文章生成摘要"
					class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				></textarea>
			</div>
		</div>

		<!--属性-->
		<div class="flex gap-4 flex-wrap my-4">
			<div class="flex h-6 items-center gap-2">
				<input
					bind:checked={photoContent.is_top}
					on:change={() => {
						isChanged = true;
					}}
					id="is_top"
					aria-describedby="是否置顶文章"
					name="is_top"
					type="checkbox"
					class="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
				/>
				<label for="is_top" class="font-medium text-gray-900 text-sm">置顶</label>
			</div>
			<div class="flex h-6 items-center gap-2">
				<input
					bind:checked={photoContent.is_featured}
					on:change={() => {
						isChanged = true;
					}}
					id="is_featured"
					aria-describedby="是否设置为推荐文章"
					name="is_featured"
					type="checkbox"
					class="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
				/>
				<label for="is_featured" class="font-medium text-gray-900 text-sm">精选</label>
			</div>
		</div>

		<!--按钮-->
		<div class="flex justify-end gap-4">
			<button
				on:click={deletePhoto}
				class="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 cursor-pointer mr-auto"
				>删除</button
			>
			<button
				on:click={savePhoto}
				disabled={!isChanged}
				class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 cursor-pointer hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
				>保存</button
			>
			<button
				on:click={publishPhoto}
				class="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 cursor-pointer"
				>{photoContent.is_draft ? '发布' : '取消发布'}</button
			>
		</div>
	</aside>
</div>
