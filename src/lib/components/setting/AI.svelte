<script lang="ts">
import { onMount } from 'svelte';
import { getToastStore } from '$lib/toast';
import { AI, type AIConfigKey, type AIMutableConfig, type AIModelKey } from '$lib/types/prompts';
import { t } from '$lib/functions/i18n';
import { browser } from '$app/environment';
import { getSupabaseBrowserClient } from '$lib/supabaseClient';
import type { ConfigRow } from '$lib/types/config';

const toastStore = getToastStore();

export let data;
void data;
const supabase = browser ? getSupabaseBrowserClient() : null;

const ai = new AI();
const DEFAULTS = ai.emptyObject();
let AIObj: AIMutableConfig = ai.emptyObject();
const KEYS = ai.array();
const MODEL_KEYS: AIModelKey[] = ['model_ABSTRACT', 'model_SLUG', 'model_TRANSLATION', 'model_TAGS'];
const FALLBACK_MODELS = ['gpt-5-nano', 'gpt-5', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'];
let modelOptions: string[] = [...FALLBACK_MODELS];
let isLoadingModels = false;
let modelOptionsError = '';

// 从config表中获取AI配置
const getAIConfig = async () => {
	if (!supabase) return;

	const { data: rowsResult, error: fetchError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', KEYS);

	if (fetchError) {
		console.error(fetchError);
		toastStore.trigger({
			message: '获取 AI 配置失败',
			background: 'variant-filled-error'
		});
		return;
	}

	const rows = (rowsResult ?? []) as ConfigRow[];
	const mapped = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	KEYS.forEach((key) => {
		const defaultValue = DEFAULTS[key as AIConfigKey];
		AIObj[key] = mapped.get(key) ?? defaultValue;
	});
	ensureSelectedModelsAreAvailable();
};

function ensureSelectedModelsAreAvailable() {
	const selectedModels = MODEL_KEYS.map((key) => AIObj[key]).filter(Boolean);
	const merged = new Set([...modelOptions, ...selectedModels]);
	modelOptions = Array.from(merged).sort((a, b) => a.localeCompare(b));
}

const fetchModelOptions = async () => {
	if (!browser || isLoadingModels) return;
	isLoadingModels = true;
	modelOptionsError = '';
	try {
		const response = await fetch('/api/openai-models');
		const payload = (await response.json()) as {
			models?: string[];
		};
		if (Array.isArray(payload.models) && payload.models.length > 0) {
			const uniqueModels = Array.from(new Set(payload.models));
			modelOptions = uniqueModels.sort((a, b) => a.localeCompare(b));
		} else {
			const uniqueFallback = Array.from(new Set(FALLBACK_MODELS));
			modelOptions = uniqueFallback.sort((a, b) => a.localeCompare(b));
			modelOptionsError = '无法从 OpenAI 获取模型列表，已使用默认列表';
		}
	} catch (err) {
		console.error(err);
		const uniqueFallback = Array.from(new Set(FALLBACK_MODELS));
		modelOptions = uniqueFallback.sort((a, b) => a.localeCompare(b));
		modelOptionsError = '获取模型列表失败，请检查网络或 API Key';
	} finally {
		isLoadingModels = false;
		ensureSelectedModelsAreAvailable();
	}
};

onMount(async () => {
	await getAIConfig();
	await fetchModelOptions();
	ensureSelectedModelsAreAvailable();
});

// 该变量负责记录表单是否被修改，如果修改，则为true
let isFormChanged = false;

// 提交表单
async function submitForm(event: Event) {
	event.preventDefault();
	const formData = new FormData(event.target as HTMLFormElement);
	const storageData = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;

	// 将对象中的key-value转换成独立的对象，最后拼接成数组
	if (!supabase) return;

	const arrayData = (Object.entries(storageData) as [string, FormDataEntryValue][]).map(([key, value]) => ({
		key,
		value: typeof value === 'string' ? value : String(value ?? '')
	}));

	const { error: upsertError } = await supabase
		.from('config')
		.upsert(arrayData, { onConflict: 'key' });

	if (upsertError) {
		console.error(upsertError);
		toastStore.trigger({
			message: '更新 AI 配置失败',
			background: 'variant-filled-error'
		});
		return;
	}

	toastStore.trigger({
		message: 'AI 配置更新成功',
		hideDismiss: true,
		background: 'variant-filled-success'
	});

	isFormChanged = false;
	await getAIConfig();
}
</script>

<main class="py-8">
	<form
		method="POST"
		on:submit={submitForm}
		on:input={() => isFormChanged = true}
		class="space-y-6"
	>
		<div class="border-b border-gray-900/10 pb-12 space-y-4">
			<div>
				<label
					for="openai_api_key"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					OpenAI API Key
				</label>
				<input
					type="text"
					id="openai_api_key"
					name="config_OPENAI"
					bind:value={AIObj.config_OPENAI}
					class="font-mono text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
				/>
			</div>
		</div>
		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				模型列表
				{#if isLoadingModels}
					<span class="ml-1 animate-pulse">加载中...</span>
				{/if}
			</p>
			<button
				type="button"
				on:click={fetchModelOptions}
				class="text-cyan-600 hover:text-cyan-500 disabled:text-gray-400"
				disabled={isLoadingModels}
			>
				刷新模型列表
			</button>
		</div>
		<div class="space-y-2">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label
					for="prompt_slug"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					根据标题生成网址末尾的slug
				</label>
				<div class="sm:w-64">
					<label class="sr-only" for="model_slug">选择模型</label>
					<select
						id="model_slug"
						name="model_SLUG"
						bind:value={AIObj.model_SLUG}
						disabled={isLoadingModels}
						class="text-gray-900 ring-gray-300 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
					>
						{#each modelOptions as model}
							<option value={model}>{model}</option>
						{/each}
					</select>
				</div>
			</div>
			<textarea
				id="prompt_slug"
				name="prompt_SLUG"
				bind:value={AIObj.prompt_SLUG}
				rows="4"
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
		<div class="space-y-2">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label
					for="prompt_seo"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					生成文章摘要用于SEO
				</label>
				<div class="sm:w-64">
					<label class="sr-only" for="model_abstract">选择模型</label>
					<select
						id="model_abstract"
						name="model_ABSTRACT"
						bind:value={AIObj.model_ABSTRACT}
						disabled={isLoadingModels}
						class="text-gray-900 ring-gray-300 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
					>
						{#each modelOptions as model}
							<option value={model}>{model}</option>
						{/each}
					</select>
				</div>
			</div>
			<textarea
				id="prompt_seo"
				name="prompt_SEO"
				bind:value={AIObj.prompt_SEO}
				rows="4"
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
		<div class="space-y-2">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label
					for="prompt_translation"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					翻译内容
				</label>
				<div class="sm:w-64">
					<label class="sr-only" for="model_translation">选择模型</label>
					<select
						id="model_translation"
						name="model_TRANSLATION"
						bind:value={AIObj.model_TRANSLATION}
						disabled={isLoadingModels}
						class="text-gray-900 ring-gray-300 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
					>
						{#each modelOptions as model}
							<option value={model}>{model}</option>
						{/each}
					</select>
				</div>
			</div>
			<textarea
				id="prompt_translation"
				name="prompt_TRANSLATION"
				bind:value={AIObj.prompt_TRANSLATION}
				rows="4"
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
		<div>
			<label
				for="prompt_image_alt"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>
				生成图片的alt属性
			</label>
		<textarea
				id="prompt_image_alt"
				name="prompt_IMAGE_ALT"
				bind:value={AIObj.prompt_IMAGE_ALT}
				rows="4"
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
		<div class="space-y-2">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label
					for="prompt_tags"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					生成内容的Tags
				</label>
				<div class="sm:w-64">
					<label class="sr-only" for="model_tags">选择模型</label>
					<select
						id="model_tags"
						name="model_TAGS"
						bind:value={AIObj.model_TAGS}
						disabled={isLoadingModels}
						class="text-gray-900 ring-gray-300 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
					>
						{#each modelOptions as model}
							<option value={model}>{model}</option>
						{/each}
					</select>
				</div>
			</div>
		<textarea
				id="prompt_tags"
				name="prompt_TAGS"
				bind:value={AIObj.prompt_TAGS}
				rows="4"
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
	{#if modelOptionsError}
		<p class="text-sm text-red-500">{modelOptionsError}</p>
	{/if}
	<button
			type="submit"
			disabled={!isFormChanged}
			class =
				"rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-200"
		>
			{$t('submit')}
		</button>
	</form>
</main>
