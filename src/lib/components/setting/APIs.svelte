<script lang="ts">
	import { t } from '$lib/functions/i18n';
	import { onMount } from 'svelte';
	import { getToastStore } from '$lib/toast';
	import { ThirdPartyAPIs } from '$lib/types/thirdPartyApi';

	const toastStore = getToastStore();

        export let data;
        void data;

	const apis = new ThirdPartyAPIs();
	let API = apis.emptyObject();
	const KEYS = apis.array();

	// 从config表中获取API配置
	const getAPIConfig = async () => {
		const apiKeys = await fetch('/api/kv', {
			method: 'POST',
			body: JSON.stringify({
				keys: KEYS
			})
		}).then(res => res.json())

		apiKeys.forEach(item => {
			const key = Object.keys(item)[0];
			API[key] = item[key];
		});
	};

	onMount(async () => {
		await getAPIConfig();
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
		await getAPIConfig();
	}
</script>

<main class = "py-8">
	<form
		method="POST"
		on:submit={submitForm}
		on:input={() => isFormChanged = true}
		class="space-y-6"
	>
		<div class="border-b border-gray-900/10 pb-12 space-y-4">
			<div>
				<label
					for="unsplash_access_key"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					Unsplash Access Key
				</label>
				<input
					type="text"
					id="unsplash_access_key"
					name="config_UNSPLASH_ACCESS_KEY"
					bind:value={API.config_UNSPLASH_ACCESS_KEY}
					class="font-mono text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
				/>
				<p
					class="mt-2 text-sm text-gray-500"
				>
					{$t('api-unsplash')}
				</p>
			</div>
			<div>
				<label
					for="unsplash_secret_key"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					Unsplash Secret Key
				</label>
				<input
					type="text"
					id="unsplash_secret_key"
					name="config_UNSPLASH_SECRET_KEY"
					bind:value={API.config_UNSPLASH_SECRET_KEY}
					class="font-mono text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
				/>
			</div>
		</div>
		<div class="border-b border-gray-900/10 pb-12 space-y-4">
			<div>
				<label
					for="mapbox"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					Mapbox
				</label>
				<input
					type="text"
					id="mapbox"
					name="config_MAPBOX"
					bind:value={API.config_MAPBOX}
					class="font-mono text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
				/>
				<p
					class="mt-2 text-sm text-gray-500"
				>
					{$t('api-mapbox')}
				</p>
			</div>
			<div>
				<label
					for="amap"
					class = "block text-sm font-medium leading-6 text-gray-900"
				>
					高德地图
				</label>
				<input
					type="text"
					id="amap"
					name="config_AMAP"
					bind:value={API.config_AMAP}
					class="font-mono text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
				/>
				<p
					class="mt-2 text-sm text-gray-500"
				>
					{$t('api-amap')}
				</p>
			</div>
		</div>
		<div>
			<label
				for="perspective"
				class = "block text-sm font-medium leading-6 text-gray-900"
			>
				Perspective
			</label>
			<input
				type="text"
				id="perspective"
				name="config_PERSPECTIVE"
				bind:value={API.config_PERSPECTIVE}
				class="font-mono text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
			/>
			<p
				class="mt-2 text-sm text-gray-500"
			>
				{$t('api-perspective')}
			</p>
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
