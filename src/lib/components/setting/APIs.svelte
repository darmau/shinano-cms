<script lang="ts">
	import { t } from '$lib/functions/i18n';
import { onMount } from 'svelte';
import { getToastStore } from '$lib/toast';
import { ThirdPartyAPIs } from '$lib/types/thirdPartyApi';
import { browser } from '$app/environment';
import { getSupabaseBrowserClient } from '$lib/supabaseClient';
import type { ConfigRow } from '$lib/types/config';

const toastStore = getToastStore();

export let data: unknown;
void data;
const supabase = browser ? getSupabaseBrowserClient() : null;

	const apis = new ThirdPartyAPIs();
	let API = apis.emptyObject();
	const KEYS = apis.array();

	// 从config表中获取API配置
const getAPIConfig = async () => {
	if (!supabase) return;

	const { data: rowsResult, error: fetchError } = await supabase
		.from('config')
		.select('key, value')
		.in('key', KEYS);

	if (fetchError) {
		console.error(fetchError);
		toastStore.trigger({
			message: '获取 API 配置失败',
			background: 'variant-filled-error'
		});
		return;
	}

	const rows = (rowsResult ?? []) as ConfigRow[];
	const mapped = new Map(rows.map(({ key, value }) => [key, value ?? '']));
	KEYS.forEach((key) => {
		API[key] = mapped.get(key) ?? '';
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
			message: '更新 API 配置失败',
			background: 'variant-filled-error'
		});
		return;
	}

	toastStore.trigger({
		message: 'API 配置更新成功',
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
