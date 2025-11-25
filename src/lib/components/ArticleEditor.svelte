<script lang="ts">
	import Tiptap from '$components/editor/Tiptap.svelte';
	import ImagesModel from '$components/editor/ImagesModel.svelte';
	import PhotoIcon from '$assets/icons/photo.svelte';
	import AddIcon from '$assets/icons/plus.svelte';
	import { getToastStore } from '$lib/toast';
	import { beforeNavigate, goto } from '$app/navigation';
	import getDateFormat from '$lib/functions/dateFormat';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Content, JSONContent } from '@tiptap/core';
import { splitHtmlByTopLevelNodes } from '$lib/functions/htmlChunk';
	import type {
		ArticleContent,
		ArticleCoverImage,
		ArticleEditorPageData
	} from '$lib/types/article';
	import type {
		EditorContentUpdateDetail,
		EditorHandle,
		ImagesModelData,
		SelectedImage
	} from '$lib/types/editor';

	type SlugCheckResponse = {
		error?: string;
	};

	type TagsResponse = {
		tags?: string[];
	};

	export let data: ArticleEditorPageData;
	export let isSaved: boolean = false;

	const toastStore = getToastStore();
	const supabase: SupabaseClient | null = browser ? getSupabaseBrowserClient() : null;

	const initialArticle = data.articleContent;

	let articleContent: ArticleContent = {
		id: initialArticle.id,
		title: initialArticle.title ?? '',
		subtitle: initialArticle.subtitle ?? '',
		slug: initialArticle.slug ?? '',
		content_json: initialArticle.content_json,
		content_html: initialArticle.content_html ?? '',
		content_text: initialArticle.content_text ?? '',
		abstract: initialArticle.abstract ?? '',
		is_top: initialArticle.is_top ?? false,
		is_draft: initialArticle.is_draft ?? true,
		is_featured: initialArticle.is_featured ?? false,
		is_premium: initialArticle.is_premium ?? false,
		lang: initialArticle.lang ?? data.currentLanguage.id,
		topic: initialArticle.topic ?? [],
		published_at: initialArticle.published_at ?? null,
		category: initialArticle.category ?? null,
		cover: initialArticle.cover?.id ?? null,
		updated_at: initialArticle.updated_at
	};

	let topics: string[] = [...articleContent.topic];
	articleContent.topic = topics;

	let contentJSON: JSONContent = articleContent.content_json;
	let contentHTML = articleContent.content_html;
	let contentText = articleContent.content_text;

	let isChanged = false;
	let isModalOpen = false;
	let coverImage: ArticleCoverImage | null = initialArticle.cover ?? null;
	let localTime: string | null = articleContent.published_at
		? getDateFormat(articleContent.published_at, true)
		: null;
	let slugExists = false;
	let isCheckingSlug = false;
	let isGeneratingSlug = false;
	let isGeneratingAbstract = false;
	let isGeneratingTags = false;
	let isTranslatingContent = false;
let translationChunksTotal = 0;
let translationChunksCompleted = 0;
	let editorComponent: EditorHandle | null = null;
	let topicInput = '';

	const supabaseUnavailableMessage = 'Supabase client is not available in the current environment.';

	const getImagesModelData = (): ImagesModelData => ({
		supabase,
		prefix: data.prefix
	});
	let imagesModelData: ImagesModelData = getImagesModelData();
	$: imagesModelData = getImagesModelData();

	function generateNewLanguageVersions() {
		const currentLanguageId = data.currentLanguage.id;
		const otherVersions = data.otherVersions;
		const allLanguages = data.allLanguages;
		return allLanguages.filter(
			(language) =>
				!otherVersions.some((version) => version.lang.id === language.id) &&
				language.id !== currentLanguageId
		);
	}

	let newLanguageVersions = generateNewLanguageVersions();
	$: newLanguageVersions = generateNewLanguageVersions();

	async function saveArticle() {
		if (!supabase) {
			console.error(supabaseUnavailableMessage);
			return;
		}

		articleContent.updated_at = new Date().toISOString();
		articleContent.cover = coverImage?.id ?? null;
		articleContent.published_at = localTime ? new Date(localTime).toISOString() : null;
		articleContent.topic = topics;

		if (isSaved === true) {
			if (!articleContent.id) {
				console.error('Missing article id when attempting to save existing article.');
				return;
			}
			const { error } = await supabase
				.from('article')
				.update(articleContent)
				.eq('id', articleContent.id);
			if (error) {
				console.error(error);
				toastStore.trigger({
					message: error.message,
					background: 'variant-filled-error'
				});
			} else {
				toastStore.trigger({
					message: 'Article saved successfully.',
					background: 'variant-filled-success'
				});
				isSaved = true;
				isChanged = false;
			}
		} else {
			const { data: createdArticle, error: saveError } = await supabase
				.from('article')
				.insert(articleContent)
				.select();

			if (saveError) {
				console.error(saveError);
				toastStore.trigger({
					message: saveError.message,
					background: 'variant-filled-error'
				});
				isChanged = false;
			} else {
				const newArticleId = createdArticle?.[0]?.id;
				if (newArticleId) {
					articleContent.id = newArticleId;
				}
				toastStore.trigger({
					message: 'Article saved successfully.',
					background: 'variant-filled-success'
				});
				isSaved = true;
				if (newArticleId) {
					await goto(`/admin/article/edit/${newArticleId}`);
				}
			}
		}
	}

	// 监控正文变动
	function handleContentUpdate({ json, html, text }: EditorContentUpdateDetail) {
		contentJSON = json;
		contentHTML = html;
		contentText = text;
		articleContent.content_json = contentJSON;
		articleContent.content_html = contentHTML;
		articleContent.content_text = contentText;
		isChanged = true;
	}

	// 接收图片选择器返回的图片信息并显示
	function selectCoverImage(images: SelectedImage[]) {
		const [image] = images;
		if (!image) {
			return;
		}

		coverImage = {
			id: image.id,
			alt: image.alt ?? null,
			storage_key: image.storage_key
		};
		articleContent.cover = coverImage.id;
		isChanged = true;
	}

	function resetCoverImage() {
		coverImage = null;
		articleContent.cover = null;
		isChanged = true;
	}

	function closeModel() {
		isModalOpen = false;
	}

	// 切换发布文章
	async function publishArticle() {
		await saveArticle();
		if (!supabase || !articleContent.id) {
			return;
		}

		if (articleContent.is_draft) {
			articleContent.is_draft = false;
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const date = localTime ? new Date(localTime) : new Date();
			const isoString = date.toLocaleString('en-US', { timeZone: timezone });
			articleContent.published_at = new Date(isoString).toISOString();
		} else {
			articleContent.is_draft = true;
			articleContent.published_at = null;
			localTime = null;
		}

		const { error } = await supabase
			.from('article')
			.update(articleContent)
			.eq('id', articleContent.id);
		if (error) {
			console.error(error);
			toastStore.trigger({
				message: error.message,
				background: 'variant-filled-error'
			});
		} else {
			toastStore.trigger({
				message: 'Article published successfully.',
				background: 'variant-filled-success'
			});
			isSaved = true;
			isChanged = false;
		}
	}

	// 删除文章
	async function deleteArticle() {
		if (!isSaved || !articleContent.id) {
			toastStore.trigger({
				message: 'Article not saved yet.',
				background: 'variant-filled-error'
			});
			return;
		}

		if (!supabase) {
			console.error(supabaseUnavailableMessage);
			return;
		}

		const { error } = await supabase.from('article').delete().eq('id', articleContent.id).select();
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
			await goto('/admin/article/1');
		}
	}

	// 检测当前slug在相同语言下是否已存在
	async function checkSlug(slug: string) {
		isCheckingSlug = true;

		const response: SlugCheckResponse = await fetch('/api/slug-check', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				type: 'article',
				langId: data.currentLanguage.id,
				slug,
				contentId: articleContent.id ?? null
			})
		}).then((res) => res.json());

		isCheckingSlug = false;
		if (response.error) {
			toastStore.trigger({
				message: response.error,
				background: 'variant-filled-error'
			});
			slugExists = true;
		} else {
			slugExists = false;
		}
	}

	// 生成slug
	async function generateSlug() {
		if (isGeneratingSlug) {
			return;
		}

		const title = articleContent.title?.trim();
		if (!title) {
			toastStore.trigger({
				message: '请先填写标题。',
				background: 'variant-filled-error'
			});
			return;
		}

		isGeneratingSlug = true;
		try {
			articleContent.slug = await fetch('/api/slug', {
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
	async function generateAbstract() {
		if (isGeneratingAbstract) {
			return;
		}

		const content = articleContent.content_text;
		if (!content?.trim()) {
			toastStore.trigger({
				message: '正文内容为空，无法生成摘要。',
				background: 'variant-filled-error'
			});
			return;
		}

		isGeneratingAbstract = true;
		try {
			articleContent.abstract = await fetch('/api/abstract', {
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

	// 话题
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && topicInput.trim() !== '') {
			topics = [...topics, topicInput.trim()];
			articleContent.topic = topics;
			topicInput = '';
			isChanged = true;
		}
	}

	function removeTopic(index: number) {
		topics = topics.filter((_, i) => i !== index);
		articleContent.topic = topics;
		isChanged = true;
	}

	// 生成tags
	async function generateTags() {
		if (isGeneratingTags) {
			return;
		}

		const content = articleContent.content_text;
		if (!content?.trim()) {
			toastStore.trigger({
				message: '正文内容为空，无法生成标签。',
				background: 'variant-filled-error'
			});
			return;
		}

		isGeneratingTags = true;
		try {
			const result: TagsResponse = await fetch('/api/tags', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ content })
			}).then((res) => res.json());
			topics = result.tags ?? [];
			articleContent.topic = topics;
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

	// 翻译
	function generateContent(content: Content) {
		if (!editorComponent) {
			return;
		}

		editorComponent.updateContent(content);
	}

	async function getTranslation() {
		if (isTranslatingContent) {
			return;
		}

		const originalHtml = articleContent.content_html;
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

				articleContent.content_html = partialHtml;
				contentHTML = partialHtml;
				generateContent(partialHtml);
			}

			if (typeof document !== 'undefined') {
				const parser = document.createElement('div');
				parser.innerHTML = articleContent.content_html;
				const plainText = parser.textContent ?? '';
				contentText = plainText;
				articleContent.content_text = plainText;
			}

			isChanged = true;
		} catch (err) {
			console.error('Failed to translate content', err);
			articleContent.content_html = originalHtml;
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

	// 防止误关页面
	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (!isSaved && isChanged) {
			event.preventDefault();
			event.returnValue = '';
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
		checkSlug(articleContent.slug);
	});
</script>

<svelte:window on:beforeunload={handleBeforeUnload} />

{#if isModalOpen}
	<ImagesModel data={imagesModelData} {closeModel} onSelect={selectCoverImage} />
{/if}

<div class="grid grid-cols-1 gap-6 xl:grid-cols-4">
	<div class="space-y-8 xl:col-span-3">
		<!--title-->
		<div>
				<label for="title" class="block text-sm font-medium leading-6 text-gray-900"
					>标题</label
				>
			<div class="mt-2">
				<input
					type="text"
					name="title"
					id="title"
					value={articleContent.title}
					on:input={(event: Event) => {
						isChanged = true;
						articleContent.title = (event.currentTarget as HTMLInputElement).value;
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
					value={articleContent.slug}
					on:input={(event: Event) => {
						const target = event.currentTarget as HTMLInputElement;
						articleContent.slug = target.value;
						checkSlug(target.value);
						isChanged = true;
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

		<!--subtitle-->
		<div>
			<label for="subtitle" class="block text-sm font-medium leading-6 text-gray-900"
				>副标题</label
			>
			<div class="mt-2">
				<input
					type="text"
					name="subtitle"
					id="subtitle"
					value={articleContent.subtitle}
					on:input={(event: Event) => {
						isChanged = true;
						articleContent.subtitle = (event.currentTarget as HTMLInputElement).value;
					}}
					required
					class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				/>
			</div>
		</div>

		<!--Content-->
		<Tiptap
			onContentUpdate={handleContentUpdate}
			data={imagesModelData}
			content={articleContent.content_json}
			bind:this={editorComponent}
		/>
		<button
			type="button"
			on:click={getTranslation}
			disabled={isTranslatingContent}
			class="rounded-md bg-cyan-50 p-2 text-sm font-semibold text-cyan-600 shadow-sm hover:bg-cyan-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
			>{isTranslatingContent
				? `生成中...${translationChunksTotal > 0 ? ` (${translationChunksCompleted}/${translationChunksTotal})` : ''}`
				: '翻译'}</button
		>
	</div>

	<aside class="col-span-1 space-y-8">
		<!--发布时间-->
		<div>
			<label for="publish-time" class="text-sm font-medium leading-6 text-gray-900"
				>发布时间</label
			>
			<input
				type="datetime-local"
				class="mt-2 w-full rounded-md border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-600 sm:text-sm sm:leading-6"
				defaultValue={localTime ? new Date(localTime).toISOString().slice(0, 16) : undefined}
				bind:value={localTime}
				on:change={(event: Event) => {
					isChanged = true;
					localTime = (event.currentTarget as HTMLInputElement).value;
				}}
			/>
		</div>

		<!--语言-->
		<div>
			<h2 class="text-sm font-medium leading-6 text-gray-900">语言</h2>
			<ul class="mt-2 flex gap-2">
				<li
					class="inline-flex items-center gap-x-1.5 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
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
						<a data-sveltekit-reload href={`/admin/article/edit/${version.id}`}>
							{version.lang.locale}
						</a>
					</li>
				{/each}
				{#if articleContent.id}
					{#each newLanguageVersions as newVersion}
						<li
							class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
						>
							<a
								data-sveltekit-reload
								href={`/admin/article/new?from=${articleContent.id}&lang=${newVersion.id}`}
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
				value={articleContent.category ?? ''}
				on:change={(event: Event) => {
					isChanged = true;
					const value = Number((event.currentTarget as HTMLSelectElement).value);
					articleContent.category = Number.isNaN(value) ? null : value;
				}}
				id="category"
				name="category"
				class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-600 sm:text-sm sm:leading-6"
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
					class="rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
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
						on:input={(event: Event) => {
							topicInput = (event.currentTarget as HTMLInputElement).value;
						}}
						on:keydown={handleKeydown}
						class="peer border-none text-sm focus:ring-0 focus:outline-none bg-transparent"
					/>
				</div>
			</div>
		</div>

		<!--封面-->
		<div>
			<header class="flex justify-end gap-4">
				<h2 class="text-sm font-medium leading-6 text-gray-900 grow">封面</h2>
				<button
					on:click={resetCoverImage}
					disabled={!coverImage}
					class="rounded bg-red-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
				>
					重置
				</button>
				<button
					on:click={() => {
						isModalOpen = true;
					}}
					class="rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 cursor-pointer"
				>
					选择
				</button>
			</header>
			<div class="mt-2 aspect-[4/3] bg-gray-100 w-full rounded-md flex justify-center items-center">
				{#if coverImage}
					<img
						src={`${data.prefix}/cdn-cgi/image/format=auto,width=480/${coverImage.storage_key}`}
						alt={coverImage.alt ?? ''}
						class="img-bg h-full w-full object-contain"
					/>
				{:else}
					<PhotoIcon classList="h-16 w-16 text-gray-400 m-auto" />
				{/if}
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
					class="rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
					>{isGeneratingAbstract ? '生成中...' : '生成'}</button
				>
			</div>
			<div class="mt-2">
				<textarea
					name="abstract"
					id="abstract"
					rows="5"
					value={articleContent.abstract}
					on:input={(event: Event) => {
						isChanged = true;
						articleContent.abstract = (event.currentTarget as HTMLTextAreaElement).value;
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
					checked={articleContent.is_top}
					on:change={(event: Event) => {
						isChanged = true;
						articleContent.is_top = (event.currentTarget as HTMLInputElement).checked;
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
					checked={articleContent.is_featured}
					on:change={(event: Event) => {
						isChanged = true;
						articleContent.is_featured = (event.currentTarget as HTMLInputElement).checked;
					}}
					id="is_featured"
					aria-describedby="是否设置为推荐文章"
					name="is_featured"
					type="checkbox"
					class="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
				/>
				<label for="is_featured" class="font-medium text-gray-900 text-sm">精选</label>
			</div>
			<div class="flex h-6 items-center gap-2">
				<input
					checked={articleContent.is_premium}
					on:change={(event: Event) => {
						isChanged = true;
						articleContent.is_premium = (event.currentTarget as HTMLInputElement).checked;
					}}
					id="is_premium"
					aria-describedby="是否登录后可见"
					name="is_premium"
					type="checkbox"
					class="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
				/>
				<label for="is_premium" class="font-medium text-gray-900 text-sm"
					>登录后可见</label
				>
			</div>
		</div>

		<!--按钮-->
		<div class="flex justify-end gap-4">
			<button
				on:click={deleteArticle}
				class="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 cursor-pointer mr-auto"
				>删除</button
			>
			<button
				on:click={saveArticle}
				disabled={!isChanged}
				class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
				>保存</button
			>
			<button
				on:click={publishArticle}
				class="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 cursor-pointer"
				>{articleContent.is_draft ? '发布' : '取消发布'}</button
			>
		</div>
	</aside>
</div>
