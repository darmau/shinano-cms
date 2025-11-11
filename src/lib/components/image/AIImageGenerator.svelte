<script lang="ts">
	import { getToastStore, ProgressRadial } from '$lib/toast';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { uploadImageFile, updateImageMetadata, type MediaImageRecord } from '$lib/api/media';

	type ImageSize = 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
	type ImageQuality = 'auto' | 'low' | 'medium' | 'high';

	const SIZE_OPTIONS: Array<{ value: ImageSize; label: string }> = [
		{ value: 'auto', label: '自动（与主题匹配）' },
		{ value: '1024x1024', label: '正方形 1024×1024' },
		{ value: '1536x1024', label: '横向 1536×1024' },
		{ value: '1024x1536', label: '纵向 1024×1536' }
	];

	const QUALITY_OPTIONS: Array<{ value: ImageQuality; label: string }> = [
		{ value: 'auto', label: '自动' },
		{ value: 'low', label: '较低' },
		{ value: 'medium', label: '中等' },
		{ value: 'high', label: '高质量' }
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

	export let onImport: ((detail: ImportEventDetail) => void) | undefined;

	export let supabase: SupabaseClient | null = null;

	let prompt = '';
	let size: ImageSize = 'auto';
	let quality: ImageQuality = 'auto';

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
				let errorMessage = '生成图片失败，请稍后再试。';
				try {
					const payload = (await response.json()) as { error?: string };
					errorMessage = payload.error ?? errorMessage;
				} catch {
					errorMessage = (await response.text().catch(() => errorMessage)) || errorMessage;
				}
				throw new Error(errorMessage);
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
				mime_type: 'image/webp'
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

	async function convertBase64ToWebpFile(base64: string, fileName: string) {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = `data:image/png;base64,${base64}`;

		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = (event) => reject(event);
		});

		const canvas = document.createElement('canvas');
		canvas.width = img.naturalWidth || img.width;
		canvas.height = img.naturalHeight || img.height;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			throw new Error('无法创建 Canvas 上下文，转换失败。');
		}

		ctx.drawImage(img, 0, 0);

		const dataUrl = canvas.toDataURL('image/webp', 0.95);
		const response = await fetch(dataUrl);
		const blob = await response.blob();

		return new File([blob], fileName, { type: 'image/webp' });
	}

	async function uploadImage() {
		if (!generatedImage) {
			return;
		}

		isUploading = true;

		try {
			const fileName = `ai-${Date.now()}.webp`;
			const file = await convertBase64ToWebpFile(generatedImage.b64_json, fileName);

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

			onImport?.({ image: updated });
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
		></textarea>
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
		<div
			class="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white py-10"
		>
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
					<label
						class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
						for="alt-text">Alt 文本</label
					>
					<textarea
						id="alt-text"
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
						rows="2"
						bind:value={altText}
						placeholder="用于无障碍阅读的图片描述"
						disabled={isUploading}
					></textarea>
				</div>
				<div>
					<label
						class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
						for="caption-text">图片说明（可选）</label
					>
					<input
						type="text"
						id="caption-text"
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
