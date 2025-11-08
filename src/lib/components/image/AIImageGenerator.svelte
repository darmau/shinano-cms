<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getToastStore, ProgressRadial } from '$lib/toast';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import {
		uploadImageFile,
		updateImageMetadata,
		type MediaImageRecord
	} from '$lib/api/media';

	type ImageSize = '1024x1024' | '1024x576' | '576x1024' | '512x512';
	type ImageQuality = 'standard' | 'high';

const SIZE_OPTIONS: Array<{ value: ImageSize; label: string }> = [
	{ value: '1024x1024', label: '正方形 1024×1024' },
	{ value: '1536x1024', label: '横向 1536×1024' },
	{ value: '1024x1536', label: '纵向 1024×1536' },
	{ value: '1792x1024', label: '宽屏 1792×1024' },
	{ value: '1024x1792', label: '竖屏 1024×1792' },
	{ value: '512x512', label: '正方形 512×512（快速）' }
];

	const QUALITY_OPTIONS: Array<{ value: ImageQuality; label: string }> = [
		{ value: 'high', label: '高质量' },
		{ value: 'standard', label: '标准质量' }
	];

	type GenerateResponse = {
		image: {
			b64_json: string;
			revised_prompt: string | null;
			width: number;
			height: number;
			mime_type: string;
		};
	};

	type ImportEventDetail = {
		image: MediaImageRecord;
	};

	const toastStore = getToastStore();
	const dispatch = createEventDispatcher<{ import: ImportEventDetail }>();

	export let supabase: SupabaseClient | null = null;

	let prompt = '';
	let size: ImageSize = '1024x1024';
	let quality: ImageQuality = 'high';

	let isGenerating = false;
	let isUploading = false;
	let previewUrl: string | null = null;
	let previewLoaded = false;
	let generatedImage: GenerateResponse['image'] | null = null;
	let altText = '';
	let captionText = 'Generated via AI';
	let lastPrompt = '';

	function resetState() {
		isGenerating = false;
		isUploading = false;
		previewUrl = null;
		previewLoaded = false;
		generatedImage = null;
		altText = '';
		captionText = 'Generated via AI';
		lastPrompt = '';
	}

	function handlePreviewLoad() {
		previewLoaded = true;
	}

	async function generateImage() {
		const trimmedPrompt = prompt.trim();

		if (!trimmedPrompt) {
			toastStore.trigger({
				message: '请输入生成图片的描述。',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			return;
		}

		isGenerating = true;
		previewUrl = null;
		previewLoaded = false;
		generatedImage = null;

		try {
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					prompt: trimmedPrompt,
					size,
					quality
				})
			});

			if (!response.ok) {
				const errorMessage = await response.text().catch(() => '生成图片失败，请稍后再试。');
				throw new Error(errorMessage || '生成图片失败，请稍后再试。');
			}

			const payload = (await response.json()) as GenerateResponse;
			const image = payload.image;

			if (!image?.b64_json) {
				throw new Error('未从模型返回有效的图片数据。');
			}

			generatedImage = {
				b64_json: image.b64_json,
				revised_prompt: image.revised_prompt,
				width: image.width,
				height: image.height,
				mime_type: image.mime_type ?? 'image/png'
			};

			previewUrl = `data:${generatedImage.mime_type};base64,${generatedImage.b64_json}`;
			lastPrompt = trimmedPrompt;
			altText = generatedImage.revised_prompt?.trim() || trimmedPrompt;
			captionText = 'Generated via AI';
		} catch (err) {
			console.error('Failed to generate image', err);
			const message = err instanceof Error ? err.message : '生成图片失败，请稍后再试。';
			toastStore.trigger({
				message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			resetState();
		} finally {
			isGenerating = false;
		}
	}

	function base64ToFile(base64: string, mimeType: string, fileName: string) {
		const binaryString = atob(base64);
		const len = binaryString.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i += 1) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		const blob = new Blob([bytes], { type: mimeType });
		return new File([blob], fileName, { type: mimeType });
	}

	async function uploadImage() {
		if (!generatedImage) {
			return;
		}

		isUploading = true;

		try {
			const fileName = `ai-${Date.now()}.png`;
			const file = base64ToFile(
				generatedImage.b64_json,
				generatedImage.mime_type ?? 'image/png',
				fileName
			);

			const uploaded = await uploadImageFile({
				file,
				width: generatedImage.width,
				height: generatedImage.height
			});

			const metadataAlt = altText.trim() || lastPrompt;
			const metadataCaption = captionText.trim() ? captionText.trim() : null;

			const updated =
				(await updateImageMetadata(supabase, uploaded.id, {
					alt: metadataAlt,
					caption: metadataCaption
				})) ?? uploaded;

			toastStore.trigger({
				message: 'AI 图片已保存至媒体库。',
				hideDismiss: true,
				background: 'variant-filled-success'
			});

			dispatch('import', { image: updated });
			resetState();
			prompt = '';
		} catch (err) {
			console.error('Failed to upload generated image', err);
			const message = err instanceof Error ? err.message : '上传图片失败，请稍后重试。';
			toastStore.trigger({
				message,
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} finally {
			isUploading = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="space-y-2">
		<label class="block text-sm font-medium text-gray-900" for="ai-prompt">生成描述</label>
		<textarea
			id="ai-prompt"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
			rows="3"
			placeholder="例如：黄金时刻的山脉日出，温暖色调，高细节摄影风格"
			bind:value={prompt}
			disabled={isGenerating || isUploading}
		/>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm text-gray-700">
				<span class="font-medium text-gray-900">尺寸</span>
				<select
					class="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
					bind:value={size}
					disabled={isGenerating || isUploading}
				>
					{#each SIZE_OPTIONS as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 text-sm text-gray-700">
				<span class="font-medium text-gray-900">质量</span>
				<select
					class="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
					bind:value={quality}
					disabled={isGenerating || isUploading}
				>
					{#each QUALITY_OPTIONS as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>
		<p class="text-xs text-gray-500">
			提示：描述越具体，AI 越能生成符合预期的图片。尝试包含场景、氛围、光线、风格等关键词。
		</p>
	</div>

	<div class="flex flex-wrap gap-3">
		<button
			type="button"
			on:click={generateImage}
			class="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:bg-gray-300"
			disabled={isGenerating || isUploading}
		>
			{isGenerating ? '正在生成…' : '生成图片'}
		</button>
		{#if generatedImage}
			<button
				type="button"
				on:click={() => {
					resetState();
				}}
				class="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={isGenerating || isUploading}
			>
				重新编辑
			</button>
		{/if}
	</div>

	{#if isGenerating}
		<div class="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white py-10">
			<ProgressRadial value={undefined} width="w-12" />
			<p class="text-sm text-gray-600">AI 正在创作图片，这可能需要几秒钟…</p>
		</div>
	{:else if previewUrl}
		<div class="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="relative overflow-hidden rounded-md bg-gray-100">
				<img
					src={previewUrl}
					alt={altText ?? ''}
					class={`w-full object-cover transition-all duration-700 ${
						previewLoaded ? 'blur-0 opacity-100' : 'blur-lg opacity-80'
					}`}
					on:load={handlePreviewLoad}
				/>
				{#if !previewLoaded}
					<div class="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur">
						<ProgressRadial value={undefined} width="w-10" />
					</div>
				{/if}
			</div>
			<div class="space-y-3">
				<div>
					<label class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
						>Alt 文本</label
					>
					<textarea
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
						rows="2"
						bind:value={altText}
						placeholder="用于无障碍阅读的图片描述"
						disabled={isUploading}
					/>
				</div>
				<div>
					<label class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
						>图片说明（可选）</label
					>
					<input
						type="text"
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
						bind:value={captionText}
						placeholder="例如：Generated via AI"
						disabled={isUploading}
					/>
				</div>
				<div class="flex flex-wrap gap-3">
					<button
						type="button"
						on:click={generateImage}
						class="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isGenerating || isUploading}
					>
						重新生成
					</button>
					<button
						type="button"
						on:click={uploadImage}
						class="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:bg-gray-300"
						disabled={isUploading}
					>
						{isUploading ? '正在保存…' : '保存到媒体库'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

