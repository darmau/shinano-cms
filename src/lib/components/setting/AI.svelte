<script lang="ts">
	import { onMount } from 'svelte';
	import { getToastStore } from '$lib/toast';
	import { AI } from '$lib/types/prompts';
	import { t } from '$lib/functions/i18n';

	const toastStore = getToastStore();

	export let data;
	let { supabase } = data;
	$: ({ supabase } = data);

	const ai = new AI();
	let AIObj = ai.emptyObject();
	const KEYS = ai.array();

	// 从config表中获取AI配置
	const getAIConfig = async () => {
		const prompts = await fetch('/api/kv', {
			method: 'POST',
			body: JSON.stringify({
				keys: KEYS
			})
		}).then(res => res.json())

		prompts.forEach(item => {
			const key = Object.keys(item)[0];
			AIObj[key] = item[key];
		});
	}

	onMount(async () => {
		await getAIConfig();
	});

	// 该变量负责记录表单是否被修改，如果修改，则为true
	let isFormChanged = false;

	// 提交表单
	async function submitForm(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const storageData = Object.fromEntries(formData.entries());

		// 将对象中的key-value转换成独立的对象，最后拼接成数组
		const arrayData = Object.entries(storageData).map(([key, value]) => ({
			[key]: value }));

		const response = await fetch('/api/kv', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				kv: arrayData
			})
		}).then(res => res.text());

		toastStore.trigger({
			message: response,
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
		<div>
			<label
				for="prompt_slug"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>
				根据标题生成网址末尾的slug
			</label>
			<textarea
				id="prompt_slug"
				name="prompt_SLUG"
				bind:value={AIObj.prompt_SLUG}
				rows="4"
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
		<div>
			<label
				for="prompt_seo"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>
				生成文章摘要用于SEO
			</label>
			<textarea
				id="prompt_seo"
				name="prompt_SEO"
				bind:value={AIObj.prompt_SEO}
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
		<div>
			<label
				for="prompt_translation"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>
				翻译内容
			</label>
			<textarea
				id="prompt_translation"
				name="prompt_TRANSLATION"
				bind:value={AIObj.prompt_TRANSLATION}
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
				type="text"
				id="prompt_image_alt"
				name="prompt_IMAGE_ALT"
				bind:value={AIObj.prompt_IMAGE_ALT}
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
		<div>
			<label
				for="prompt_tags"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>
				生成内容的Tags
			</label>
			<textarea
				type="text"
				id="prompt_tags"
				name="prompt_TAGS"
				bind:value={AIObj.prompt_TAGS}
				class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			></textarea>
		</div>
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
