<script lang="ts">
	import SimpleEditor from '$components/editor/SimpleEditor.svelte';
	import { t } from '$lib/functions/i18n';
	import ImagesModel from '$components/editor/ImagesModel.svelte';
	import AddIcon from '$assets/icons/plus.svelte';
	import DeleteIcon from '$assets/icons/delete.svelte';
	import { getToastStore } from '$lib/toast';
	import { goto } from '$app/navigation';
	import { flip } from 'svelte/animate';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;

	const toastStore = getToastStore();

	let thoughtContent = data.thoughtContent;

	let contentJSON = {};
	let contentHTML = '';
	let contentText = '';

	// 监控正文变动
	function handleContentUpdate(event) {
		const { json, html, text } = event.detail;
		contentJSON = json;
		contentHTML = html;
		contentText = text;
		thoughtContent.content_json = contentJSON;
		thoughtContent.content_html = contentHTML;
		thoughtContent.content_text = contentText;
	}

	// 选择图片
	let isModalOpen = false;

	function closeModel() {
		isModalOpen = false;
	}

	function selectPictures(images) {
		thoughtContent.images = [...thoughtContent.images, ...images];
		// 删除超过12张的图片
		if (thoughtContent.images.length > 12) {
			thoughtContent.images = thoughtContent.images.slice(0, 12);
		}
	}

	// 删除图片
	function deleteImage(index) {
		thoughtContent.images = thoughtContent.images.filter((_, i) => i !== index);
	}

	// 更改顺序
	let draggingIndex = null;

	function dragStart(event, index) {
		draggingIndex = index;
		event.dataTransfer.setData('text/plain', index);
	}

	function dragOver(event, index) {
		event.preventDefault();
		if (draggingIndex !== null && draggingIndex !== index) {
			const newPictures = [...thoughtContent.images];
			const [removed] = newPictures.splice(draggingIndex, 1);
			newPictures.splice(index, 0, removed);
			thoughtContent.images = newPictures;
			draggingIndex = index;
		}
	}

	function dragEnd() {
		draggingIndex = null;
	}

	// 话题
	let topicInput = '';

	function handleKeydown(event) {
		if (event.key === 'Enter' && topicInput.trim() !== '') {
			thoughtContent.topic = [...thoughtContent.topic, topicInput.trim()];
			topicInput = '';
		}
	}

	function removeTopic(index) {
		thoughtContent.topic = thoughtContent.topic.filter((_, i) => i !== index);
	}

	// 保存
	async function saveThought() {
		// 保存thought
		const { error: saveThoughtError } = await supabase
		.from('thought')
		.update({
			content_json: thoughtContent.content_json,
			content_html: thoughtContent.content_html,
			content_text: thoughtContent.content_text,
			topic: thoughtContent.topic
		})
		.eq('id', thoughtContent.id);

		if (saveThoughtError) {
			console.error(saveThoughtError);
			toastStore.trigger({
				message: `保存thought失败。${saveThoughtError.message}`,
				hideDismiss: true,
				background: 'variant-filled-error'
			});

			return;
		}

		// 删除现有的thought_image
		const { error: deleteThoughtImageError } = await supabase
			.from('thought_image')
			.delete()
			.eq('thought_id', thoughtContent.id);

		const thoughtImages = thoughtContent.images.map((image, index) => ({
			thought_id: thoughtContent.id,
			image_id: image.image.id,
			order: index + 1
		}));

		const { error: saveThoughtImageError } = await supabase
		.from('thought_image')
		.insert(thoughtImages);

		if (saveThoughtImageError) {
			console.error(saveThoughtImageError);
			toastStore.trigger({
				message: `保存thought_image失败。${saveThoughtImageError.message}`,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			return;
		}

		toastStore.trigger({
			message: '保存thought成功。',
			hideDismiss: true,
			background: 'variant-filled-success'
		});
		await goto('/admin/thought/1');
	}
</script>

{#if isModalOpen}
	<ImagesModel {data} {closeModel} onSelect = {selectPictures} />
{/if}

<div class = "max-w-3xl mx-auto">

	<nav class = "flex mb-8" aria-label = "Breadcrumb">
		<ol role = "list" class = "flex items-center space-x-4">
			<li>
				<div>
					<a
						data-sveltekit-preload-data href = "/admin"
						class = "text-gray-400 hover:text-gray-500"
					>
						<svg
							class = "h-5 w-5 flex-shrink-0" viewBox = "0 0 20 20"
							fill = "currentColor" aria-hidden = "true"
						>
							<path
								fill-rule = "evenodd"
								d = "M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
								clip-rule = "evenodd"
							/>
						</svg>
						<span class = "sr-only">首页</span>
					</a>
				</div>
			</li>
			<li>
				<div class = "flex items-center">
					<svg
						class = "h-5 w-5 flex-shrink-0 text-gray-300" fill = "currentColor"
						viewBox = "0 0 20 20" aria-hidden = "true"
					>
						<path d = "M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
					</svg>
					<a
						data-sveltekit-preload-data href = "/admin/thought/1"
						class = "ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
					>{$t('thought')}</a>
				</div>
			</li>
		</ol>
	</nav>

	<div class = "space-y-6">
		<!--内容-->
		<SimpleEditor
			on:contentUpdate = {handleContentUpdate}
			content = {data.thoughtContent.content_json}
		/>

		<!--图片-->
		<div>
			<label
				for = "add-image"
				class = "text-sm font-medium leading-6 text-gray-900"
			>{$t('image')}</label>
			<div class = "relative mt-2 grid grid-cols-2 md:grid-cols-3 gap-4">
				{#if thoughtContent.images.length < 12}
					<button
						type = "button"
						id = "add-image"
						on:click = {() => isModalOpen = true}
						class = "border rounded-md aspect-square flex justify-center items-center bg-white group hover:bg-gray-100"
					>
						<AddIcon
							classList = "w-8 h-8 text-gray-700 group-hover:text-gray-400"
						/>
					</button>
				{/if}
				{#each thoughtContent.images as image, index (image.image.id)}
					<div
						class = "relative aspect-square rounded-md overflow-hidden border border-gray-100"
						draggable = {true}
						on:dragstart = {(event) => dragStart(event, index)}
						on:dragover = {(event) => dragOver(event, index)}
						on:dragend = {dragEnd}
						animate:flip = {{ duration: 100 }}
					>
						<img
							src =
								{`${data.prefix}/cdn-cgi/image/format=auto,width=480/${image.image.storage_key}`}
							alt = {image.image.alt}
							class = "img-bg h-full w-full object-contain"
						/>
						<button
							on:click = {() => deleteImage(index)}
							class = "absolute top-4 right-4"
						>
							<DeleteIcon
								classList = "h-6 w-6 text-gray-400 hover:text-red-600"
							/>
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!--话题-->
		<div>
			<label
				class = "text-sm font-medium leading-6 text-gray-900"
			>{$t('topic')}</label>
			<div class = "relative mt-2">
				<div
					class = "flex flex-wrap gap-1 w-full rounded-md border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
				>
					{#each thoughtContent.topic as topic, index}
					<span
						class = "inline-flex items-center gap-x-0.5 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
					>
						{topic}
						<button
							type = "button" on:click = {() => removeTopic(index)}
							class = "group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-gray-500/20"
						>
							<span class = "sr-only">Remove</span>
							<svg
								viewBox = "0 0 14 14"
								class = "h-3.5 w-3.5 stroke-gray-600/50 group-hover:stroke-gray-600/75"
							>
								<path d = "M4 4l6 6m0-6l-6 6" />
							</svg>
							<span class = "absolute -inset-1"></span>
						</button>
					</span>
					{/each}
					<input
						type = "text"
						bind:value = {topicInput}
						on:keydown = {handleKeydown}
						class = "peer border-none text-sm focus:ring-0 focus:outline-none bg-transparent"
					/>
				</div>
			</div>
		</div>

		<!--保存-->
		<button
			type = "button"
			on:click = {saveThought}
			class =
				"flex w-full justify-center rounded-md bg-cyan-600 p-3 text-base font-semibold leading-6 text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
		>
			保存
		</button>
	</div>
</div>
