<script lang="ts">
	import { getToastStore, ProgressRadial } from '$lib/toast';
	import FileDropzone from '$components/FileDropzone.svelte';
	import { error } from '@sveltejs/kit';

	export let refresh: () => void;

	let files: FileList;
	const toastStore = getToastStore();

	let isLoading = false;

	function getImageDimensions(file: File): Promise<{
		width: number;
		height: number
	}> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				resolve({ width: img.width, height: img.height });
			};
			img.onerror = reject;

			const reader = new FileReader();
			reader.onload = (e) => {
				img.src = e.target.result as string;
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	// 上传文件
	async function uploadFiles(event: Event) {
		isLoading = true;
		event.preventDefault();
		const target = event.target as HTMLInputElement;
		if (!target.files?.length) {
			return;
		}
		const files = Array.from(target.files);

		// 超过15个文件禁止上传
		if (files.length > 15) {
			toastStore.trigger({
				message: 'You can only upload up to 10 files at a time.',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			return;
		}

		try {
			// 分别请求 /api/image POST 需要携带file、width、height
			const uploadPromises = files.map(async (file) => {
				const { width, height } = await getImageDimensions(file);
				const formData = new FormData();
				formData.append('file', file);
				formData.append('width', width.toString());
				formData.append('height', height.toString());
				const response = await fetch('/api/image', {
					method: 'POST',
					body: formData
				});
			});

			await Promise.all(uploadPromises);

			isLoading = false;
			await refresh();
			toastStore.trigger({
				message: '图片上传成功',
				hideDismiss: true,
				background: 'variant-filled-success'
			});
		} catch (error) {
			isLoading = false;
			toastStore.trigger({
				message: '图片上传失败',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			error(500, { message: '上传失败' })
		}
	}
</script>

<div class = "my-8">
	{#if isLoading}
		<div class = "flex justify-center items-center min-h-32">
			<ProgressRadial value = {undefined} width = "w-12" />
		</div>
	{:else}
		<FileDropzone
			name = "files" bind:files = {files} on:change = {uploadFiles}
		/>
	{/if}
</div>
