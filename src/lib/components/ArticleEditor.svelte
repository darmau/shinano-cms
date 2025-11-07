<script lang="ts">
	import Tiptap from '$components/editor/Tiptap.svelte';
	import { t } from '$lib/functions/i18n';
	import ImagesModel from '$components/editor/ImagesModel.svelte';
	import PhotoIcon from '$assets/icons/photo.svelte';
	import AddIcon from '$assets/icons/plus.svelte';
	import { getToastStore } from '$lib/toast';
	import { beforeNavigate, goto } from '$app/navigation';
	import getDateFormat from '$lib/functions/dateFormat';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	export let isSaved: boolean = false;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	// 找出当前文章没有的语言
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

	const newLanguageVersions = generateNewLanguageVersions();

	// 保存函数
	let isChanged = false;
	let articleContent = data.articleContent;
	async function saveArticle() {

		articleContent.updated_at = new Date().toISOString();
		articleContent.cover = coverImage.id;
		articleContent.published_at = localTime ? new Date(localTime).toISOString() : null;
		articleContent.topic = topics;

		// 存储到supabase article表。对于已保存的文章，只更新内容
		if (isSaved === true) {
			const { error } = await
				supabase.from('article').update(articleContent).eq('id',
					articleContent.id);
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
			const { data, error: saveError } = await
				supabase.from('article').insert(articleContent).select();

			if (saveError) {
				console.error(saveError);
				toastStore.trigger({
					message: saveError.message,
					background: 'variant-filled-error'
				});
				isChanged = false;
			} else {
				if (data?.length) {
					articleContent.id = data[0].id;
				}
				toastStore.trigger({
					message: 'Article saved successfully.',
					background: 'variant-filled-success'
				});
				// 跳转到/admin/article/edit/:id
				isSaved = true;
				await goto(`/admin/article/edit/${data[0].id}`)
			}
		}
	}

	let contentJSON = {};
	let contentHTML = '';
	let contentText = '';

	// 监控正文变动
	function handleContentUpdate(event) {
		const { json, html, text } = event.detail;
		contentJSON = json;
		contentHTML = html;
		contentText = text;
		articleContent.content_json = contentJSON;
		articleContent.content_html = contentHTML;
		articleContent.content_text = contentText;
		isChanged = true;
	}

	// 接收图片选择器返回的图片信息并显示
	let isModalOpen = false;
	let coverImage = articleContent.cover || {};

	function selectCoverImage(images) {
		// 只接收第一张图片
		coverImage = {
			id: images[0].id,
			alt: images[0].alt,
			storage_key: images[0].storage_key
		};
		articleContent.cover = coverImage.id;
		isChanged = true;
	}

	function resetCoverImage() {
		coverImage = {};
		articleContent.cover = null;
		isChanged = true;
	}

	function closeModel() {
		isModalOpen = false;
	}

	// 切换发布文章
	let localTime = articleContent.published_at ?
		getDateFormat(articleContent.published_at, true) : null;
	async function publishArticle() {
		await saveArticle();
		if (articleContent.is_draft) {
			articleContent.is_draft = false;
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			let date = localTime ? new Date(localTime) : new Date();
			let isoString = date.toLocaleString('en-US', { timeZone: timezone });
			articleContent.published_at = new Date(isoString).toISOString();
		} else {
			articleContent.is_draft = true;
			articleContent.published_at = null;
			localTime = null;
		}
		const { error } = await
			supabase.from('article').update(articleContent).eq('id',
				articleContent.id).select();
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
		if (!isSaved) {
			toastStore.trigger({
				message: 'Article not saved yet.',
				background: 'variant-filled-error'
			});
			return;
		}

		const { error } = await
			supabase.from('article').delete().eq('id', articleContent.id).select();
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
	let slugExists = false;
	let isCheckingSlug = false;
	async function checkSlug(slug: string): Boolean {
		isCheckingSlug = true;

		const { error } = await fetch('/api/slug-check', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				type: 'article',
				langId: data.currentLanguage.id,
				slug,
				contentId: articleContent.id || null
			})
		}).then(res => res.json());

		isCheckingSlug = false;
		if (error) {
			toastStore.trigger({
				message: error,
				background: 'variant-filled-error'
			});
			slugExists = true;
		} else {
			slugExists = false;
		}
	}

	// 生成slug
	async function generateSlug() {
		const title = articleContent.title;
		articleContent.slug = await fetch('/api/slug', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ title })
		}).then((res) => res.text());
		isChanged = true;
	}

	// 生成摘要
	async function generateAbstract() {
		const content = articleContent.content_text;
		articleContent.abstract = await fetch('/api/abstract', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ content })
		}).then((res) => res.text());
		isChanged = true;
	}

	// 话题
	let topics = articleContent.topic || [];
	let topicInput = '';

	function handleKeydown(event) {
		if (event.key === 'Enter' && topicInput.trim() !== '') {
			topics = [...topics, topicInput.trim()];
			articleContent.topic = topics;
			topicInput = '';
			isChanged = true;
		}
	}

	function removeTopic(index) {
		topics = topics.filter((_, i) => i !== index);
		articleContent.topic = topics;
		isChanged = true;
	}

	// 生成tags
	async function generateTags() {
		const content = articleContent.content_text;
		const result = await fetch('/api/tags', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ content })
		}).then((res) => res.json());
		topics = result.tags;
		articleContent.topic = topics;
		isChanged = true;
	}

	// 翻译
	let editorComponent;

	function generateContent(content) {
		editorComponent.updateContent(content);
	}

	async function getTranslation() {
		articleContent.content_html = await fetch('/api/translation', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				lang: data.currentLanguage.locale,
				content: articleContent.content_html
			})
		}).then(res => res.text());
		generateContent(articleContent.content_html);
		isChanged = true;
	}

	// 防止误关页面
	function handleBeforeUnload(event) {
		if (!isSaved && isChanged) {
			event.preventDefault();
			event.returnValue = '';
		}
	}

	beforeNavigate((navigation) => {
		if (!isSaved && isChanged) {
			if (!confirm($t('leave-confirm'))) {
				navigation.preventDefault();
			}
		}
	})

	onMount(() => {
		isCheckingSlug = true;
		checkSlug(articleContent.slug);
	})
</script>

<svelte:window on:beforeunload={handleBeforeUnload} />

{#if isModalOpen}
	<ImagesModel {data} {closeModel} onSelect = {selectCoverImage} />
{/if}

<div class = "grid grid-cols-1 gap-6 xl:grid-cols-4">
	<div class = "space-y-8 xl:col-span-3">

		<!--title-->
		<div>
			<label
				for = "title"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>{$t('title')}</label>
			<div class = "mt-2">
				<input
					type = "text" name = "title" id = "title"
					value = {articleContent.title}
					on:input = {(event: Event) => {
						isChanged = true
						articleContent.title = (event.currentTarget as HTMLInputElement).value
						}}
					required
					class =
						"block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
					placeholder = "必须填写标题"
				>
			</div>
		</div>

		<!--slug-->
		<div>
			<label
				for = "slug"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>Slug</label>
			<div class = "mt-2 flex gap-4">
				<input
					type = "text" name = "slug" id = "slug"
					value = {articleContent.slug}
					on:input = {(event: Event) => {
						isChanged = true; 
						checkSlug(articleContent.slug)
						articleContent.slug = (event.currentTarget as HTMLInputElement).value
						}}
					required
					class =
						"block font-mono w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				>
				<button
					type="button"
					on:click = {generateSlug}
				  class="w-fit break-keep rounded bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-600 shadow-sm hover:bg-cyan-100"
				>{$t('generate')}</button>
			</div>
			{#if isCheckingSlug}
				<p class="mt-2 text-sm text-gray-600">Checking...</p>
			{:else}
				{#if slugExists}
					<p class="mt-2 text-sm text-red-600">{$t('slug-has-been-used')}</p>
				{:else}
					<p class="mt-2 text-sm text-green-600">{$t('slug-is-available')}</p>
				{/if}
			{/if}
		</div>

		<!--subtitle-->
		<div>
			<label
				for = "subtitle"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>{$t('subtitle')}</label>
			<div class = "mt-2">
				<input
					type = "text" name = "subtitle" id = "subtitle"
					value = {articleContent.subtitle}
					on:input = {(event: Event) => {
						isChanged = true;
						articleContent.subtitle = (event.currentTarget as HTMLInputElement).value
						}}
					required
					class =
						"block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				>
			</div>
		</div>

		<!--Content-->
		<Tiptap
			on:contentUpdate = {handleContentUpdate} {data} content =
			{articleContent.content_json} bind:this = {editorComponent}
		/>
		<button
			type="button"
			on:click = {getTranslation}
			class="rounded-md bg-cyan-50 p-2 text-sm font-semibold text-cyan-600 shadow-sm hover:bg-cyan-100"
		>{$t('translate')}</button>
	</div>

	<aside class = "col-span-1 space-y-8">
		<!--发布时间-->
		<div>
			<label
				for="publish-time"
				class = "text-sm font-medium leading-6 text-gray-900">{$t('publish-time')}</label>
			<input
				type="datetime-local"
				class="mt-2 w-full rounded-md border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-600 sm:text-sm sm:leading-6"
				bind:value={localTime}
				on:change = {(event: Event) => {
					isChanged = true
					localTime = (event.currentTarget as HTMLInputElement).value
					}}
			/>
		</div>

		<!--语言-->
		<div>
			<h2
				class = "text-sm font-medium leading-6 text-gray-900"
			>{$t('language')}</h2>
			<ul class = "mt-2 flex gap-2">
				<li
					class = "inline-flex items-center gap-x-1.5 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
				>
					<svg class="h-1.5 w-1.5 fill-green-500" viewBox="0 0 6 6" aria-hidden="true">
						<circle cx="3" cy="3" r="3" />
					</svg>
					{data.currentLanguage.locale}
				</li>
				{#each data.otherVersions as version}
					<li
						class =
							"inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-200"
					>
						<a
							data-sveltekit-reload
							href= {`/admin/article/edit/${version.id}`}
						>
							{version.lang.locale}
						</a>
					</li>
				{/each}
				{#if articleContent.id}
					{#each newLanguageVersions as newVersion}
						<li
							class =
								"inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
						>
							<a
								data-sveltekit-reload
								href=
									{`/admin/article/new?from=${articleContent.id}&lang=${newVersion.id}`}
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
				<label
					class = "text-sm font-medium leading-6 text-gray-900"
					for="category"
				>{$t('category')}</label>
				<a
				  href="/admin/category/new"
					target="_blank"
				>
					<AddIcon classList = "h-4 w-4 text-gray-400 hover:text-cyan-600" />
				</a>
			</header>
			<select
				bind:value={articleContent.category}
				on:change = {(event: Event) => {
					isChanged = true;
					articleContent.category = (event.currentTarget as HTMLSelectElement).value
					}}
				id="category"
				name="category"
				class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-600 sm:text-sm sm:leading-6">
				{#each data.categories as category}
					<option value = {category.id}>{category.title}</option>
				{/each}
			</select>
		</div>

		<!--话题-->
		<div>
			<div class = "flex justify-between">
				<label
					for = "abstract"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>{$t('topic')}</label>
				<button
					type="button"
					on:click = {generateTags}
					class = "rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
				>{$t('generate')}</button>
			</div>
			<div class="relative mt-2">
				<div
					class="flex flex-wrap gap-1 w-full rounded-md border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
					{#each topics as topic, index}
					<span class="inline-flex items-center gap-x-0.5 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
						{topic}
						<button type="button" on:click={() => removeTopic(index)}
										class="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-gray-500/20">
							<span class="sr-only">Remove</span>
							<svg viewBox="0 0 14 14" class="h-3.5 w-3.5 stroke-gray-600/50 group-hover:stroke-gray-600/75">
								<path d="M4 4l6 6m0-6l-6 6" />
							</svg>
							<span class="absolute -inset-1"></span>
						</button>
					</span>
					{/each}
					<input
						type="text"
						bind:value={topicInput}
						on:input = {(event: Event) => {
							topicInput = (event.currentTarget as HTMLInputElement).value
							}}
						on:keydown={handleKeydown}
						class="peer border-none text-sm focus:ring-0 focus:outline-none bg-transparent"
					/>
				</div>
			</div>
		</div>

		<!--封面-->
		<div>
			<header class = "flex justify-end gap-4">
				<h2
					class = "text-sm font-medium leading-6 text-gray-900 grow"
				>{$t('cover')}</h2>
				<button
					on:click = {resetCoverImage}
					disabled = {Object.keys(coverImage).length === 0}
					class =
						"rounded bg-red-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
				>
					{$t('reset')}
				</button>
				<button
					on:click = {()=>{isModalOpen =true}}
					class =
						"rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
				>
					{$t('select')}
				</button>
			</header>
			<div
				class =
					"mt-2 aspect-[4/3] bg-gray-100 w-full rounded-md flex justify-center items-center"
			>
				{#if Object.keys(coverImage).length > 0}
					<img
						src =
							{`${data.prefix}/cdn-cgi/image/format=auto,width=480/${coverImage.storage_key}`}
						alt = {coverImage.alt}
						class = "img-bg h-full w-full object-contain"
					/>
				{:else}
					<PhotoIcon classList = "h-16 w-16 text-gray-400 m-auto" />
				{/if}
			</div>
		</div>

		<!--摘要-->
		<div>
			<div class = "flex justify-between">
				<label
					for = "abstract"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>{$t('abstract')}</label>
				<button
					type="button"
					on:click = {generateAbstract}
					class = "rounded bg-cyan-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
				>{$t('generate')}</button>
			</div>
			<div class = "mt-2">
				<textarea
					name = "abstract" id = "abstract" rows = "5"
					value = {articleContent.abstract}
					on:input = {(event: Event) => {
						isChanged = true;
						articleContent.abstract = (event.currentTarget as HTMLTextAreaElement).value
						}}
					placeholder = "使用AI为文章生成摘要"
					class =
						"block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				></textarea>
			</div>
		</div>

		<!--属性-->
		<div class = "flex gap-4 flex-wrap my-4">
			<div class = "flex h-6 items-center gap-2">
				<input
					checked = {articleContent.is_top}
					on:change = {() => {isChanged = true}}
					id = "is_top" aria-describedby = "是否置顶文章"
					name = "is_top" type = "checkbox"
					class =
						"h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
				>
				<label
					for = "is_top"
					class = "font-medium text-gray-900 text-sm"
				>{$t('top')}</label>
			</div>
			<div class = "flex h-6 items-center gap-2">
				<input
					checked = {articleContent.is_featured}
					on:change = {(event: Event) => {
						isChanged = true;
						articleContent.is_featured = (event.currentTarget as HTMLInputElement).checked
					}}
					id = "is_featured" aria-describedby = "是否设置为推荐文章"
					name = "is_featured" type = "checkbox"
					class =
						"h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
				>
				<label
					for = "is_featured"
					class = "font-medium text-gray-900 text-sm"
				>{$t('feature')}</label>
			</div>
			<div class = "flex h-6 items-center gap-2">
				<input
					checked = {articleContent.is_premium}
					on:change = {(event: Event) => {
						isChanged = true;
						articleContent.is_premium = (event.currentTarget as HTMLInputElement).checked
						}}
					id = "is_premium" aria-describedby = "是否登录后可见"
					name = "is_premium" type = "checkbox"
					class =
						"h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
				>
				<label
					for = "is_premium"
					class = "font-medium text-gray-900 text-sm"
				>{$t('logged-in-only')}</label>
			</div>
		</div>

		<!--按钮-->
		<div class = "flex justify-end gap-4">
			<button
				on:click = {deleteArticle}
				class =
					"rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 mr-auto"
			>{$t('delete')}</button>
			<button
				on:click = {saveArticle}
				disabled = {!isChanged}
				class =
					"rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
			>{$t('save')}</button>
			<button
				on:click = {publishArticle}
				class =
					"rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
			>{articleContent.is_draft ? $t('publish') : $t('unpublish')}</button>
		</div>
	</aside>
</div>
