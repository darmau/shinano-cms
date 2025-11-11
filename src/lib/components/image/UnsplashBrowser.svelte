<script lang="ts">
	import { onMount } from 'svelte';
	import { getToastStore, ProgressRadial } from '$lib/toast';
	import type { SupabaseClient } from '@supabase/supabase-js';
import {
	fetchUnsplashPhotos,
	importUnsplashPhoto,
	loadUnsplashConfig,
	type UnsplashPhoto
} from '$lib/api/unsplash';
import type { MediaImageRecord } from '$lib/api/media';

type ImportEventDetail = {
	image: MediaImageRecord;
	};

	export let supabase: SupabaseClient | null;
	export let perPage = 24;
	export let autoLoad = true;
export let onImport: ((detail: ImportEventDetail) => void) | undefined;

	const toastStore = getToastStore();

	let accessKey = '';
	let isLoadingConfig = false;
	let isLoading = false;
	let photos: UnsplashPhoto[] = [];
	let query = '';
	let lastQuery = '';
	let errorMessage = '';
	let uploadingPhotoId: string | null = null;

	async function ensureConfig() {
		if (accessKey || isLoadingConfig) {
			return;
		}

		isLoadingConfig = true;
		errorMessage = '';

		try {
			const { accessKey: loadedAccessKey } = await loadUnsplashConfig(supabase);
			if (!loadedAccessKey) {
				errorMessage = '请先在设置中配置 Unsplash Access Key。';
			}
			accessKey = loadedAccessKey;
		} catch (err) {
			console.error('Failed to load Unsplash configuration', err);
			errorMessage = '加载 Unsplash 配置失败。';
		} finally {
			isLoadingConfig = false;
		}
	}

	async function fetchPhotos(search?: string) {
		if (!accessKey) {
			errorMessage = '无法获取 Unsplash Access Key。';
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			photos = await fetchUnsplashPhotos({
				accessKey,
				perPage,
				query: search?.trim().length ? search : undefined
			});
			lastQuery = search ?? '';
		} catch (err) {
			console.error('Failed to fetch Unsplash photos', err);
			errorMessage = '从 Unsplash 获取图片失败，请稍后再试。';
		} finally {
			isLoading = false;
		}
	}

	async function initialize() {
		await ensureConfig();
		if (autoLoad && accessKey) {
			await fetchPhotos();
		}
	}

	onMount(() => {
		void initialize();
	});

	async function handleSearch(event: Event) {
		event.preventDefault();
		await ensureConfig();

		if (!accessKey) {
			return;
		}

		await fetchPhotos(query.trim());
	}

	async function refresh() {
		await fetchPhotos(lastQuery);
	}

	async function handleImport(photo: UnsplashPhoto) {
		if (uploadingPhotoId) {
			return;
		}

		await ensureConfig();

		if (!accessKey) {
			return;
		}

		uploadingPhotoId = photo.id;

		try {
			const image = await importUnsplashPhoto({
				photo,
				accessKey,
				supabase
			});

			toastStore.trigger({
				message: 'Unsplash 图片已导入媒体库。',
				hideDismiss: true,
				background: 'variant-filled-success'
			});

			onImport?.({ image });
			await refresh();
		} catch (err) {
			console.error('Failed to import Unsplash photo', err);
			toastStore.trigger({
				message: '导入 Unsplash 图片失败。',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		} finally {
			uploadingPhotoId = null;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<h3 class="text-lg font-semibold text-gray-900">Unsplash</h3>
		<form on:submit={handleSearch} class="flex w-full gap-2 md:w-auto">
			<input
				type="search"
				placeholder="搜索照片（按回车确认）"
				bind:value={query}
				class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 md:w-72"
			/>
			<button
				type="submit"
				class="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:bg-gray-300"
				disabled={isLoading}
			>
				搜索
			</button>
		</form>
	</div>

	{#if isLoadingConfig}
		<div class="flex min-h-32 items-center justify-center rounded-md border border-dashed border-gray-200">
			<ProgressRadial value={undefined} width="w-12" />
		</div>
	{:else if errorMessage}
		<div class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
			{errorMessage}
		</div>
	{:else}
		<div class="space-y-4">
			{#if isLoading}
				<div class="flex min-h-32 items-center justify-center rounded-md border border-dashed border-gray-200">
					<ProgressRadial value={undefined} width="w-12" />
				</div>
			{:else if photos.length === 0}
				<div class="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
					未找到相关图片，尝试使用其他关键词搜索。
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{#each photos as photo (photo.id)}
						<button
							type="button"
							class="group relative overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
							on:click={() => handleImport(photo)}
							disabled={uploadingPhotoId === photo.id}
						>
							<div class="aspect-square overflow-hidden bg-gray-100">
								<img
									src={photo.urls.small}
									alt={photo.alt_description ?? photo.description ?? ''}
									loading="lazy"
									class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
								/>
							</div>
							<div class="space-y-1 p-3">
								<p class="max-h-12 overflow-hidden text-sm text-gray-900">
									{photo.alt_description ?? photo.description ?? '未提供描述'}
								</p>
								{#if photo.user?.name}
									<p class="text-xs text-gray-500">摄影师：{photo.user.name}</p>
								{/if}
							</div>
							{#if uploadingPhotoId === photo.id}
								<div class="absolute inset-0 flex items-center justify-center bg-black/40">
									<ProgressRadial value={undefined} width="w-10" />
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

