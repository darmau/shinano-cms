<script lang="ts">
	import { t } from '$lib/functions/i18n';
	import { getToastStore } from '$lib/toast';
	import { invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;
	export let imageData;
	export let closeEdit: () => void;

	const toastStore = getToastStore();

	// 将拍摄时间处理为可读格式
	imageData.taken_at = imageData.taken_at ?
		imageData.taken_at.toString().slice(0,16) :
		new Date().toISOString().slice(0, 16);

// 该变量负责记录表单是否被修改，如果修改，则为true
let isFormChanged = false;
let isGeneratingAlt = false;

// 生成alt
async function generateAlt() {
	if (isGeneratingAlt) {
		return;
	}

	isGeneratingAlt = true;
	try {
		imageData.alt = await fetch(`/api/img-alt`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
				body: JSON.stringify({
					storage_key: imageData.storage_key
				})
		}).then(res => res.text());
		isFormChanged = true;
	} catch (error) {
		console.error('Failed to generate alt text', error);
		toastStore.trigger({
			message: '生成描述失败，请稍后重试。',
			hideDismiss: true,
			background: 'variant-filled-error'
		});
	} finally {
		isGeneratingAlt = false;
	}
}

	// 提交更新数据
	async function submitForm(event: Event) {
		event.preventDefault();
		
		if (!supabase) {
			return;
		}

		const formData = new FormData(event.target as HTMLFormElement);
		const updatedImage = Object.fromEntries(formData.entries());

		const { error: updateError } = await supabase
		  .from('image')
		  .update({
				file_name: updatedImage.file_name,
				alt: updatedImage.alt,
				folder: updatedImage.folder,
				caption: updatedImage.caption,
				location: updatedImage.location,
				taken_at: updatedImage.taken_at
			})
		  .eq('id', imageData.id)
		  .select();

		if (updateError) {
			console.error(updateError);
			toastStore.trigger({
				message: 'Failed to update image.',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		}

		isFormChanged = false;
		closeEdit();
		invalidateAll();

		toastStore.trigger({
			message: 'Image updated successfully.',
			hideDismiss: true,
			background: 'variant-filled-success'
		});
	}
</script>

<div
	class = "dialog" aria-labelledby = "modal-title" role = "dialog"
	aria-modal = "true"
>

	<div
		class = "fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
	></div>

	<div class = "fixed inset-0 z-10 w-screen overflow-y-auto">
		<div
			class = "flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
		>
			<div
				class =
					"relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg md:max-w-3xl sm:p-6"
			>
				<div class = "">
					<h3
						class = "text-base font-semibold leading-6 text-gray-900"
						id = "modal-title"
					>{$t('edit-image')}</h3>
					<div class="mt-4 flex flex-col gap-4 md:grid md:grid-cols-3">
						<div>
							<img
								src =
									{`${data.prefix}/cdn-cgi/image/format=auto,width=720/${data.prefix}/${imageData.storage_key}`}
								class = "img-bg w-full aspect-square object-contain md:col-span-1"
								alt = {imageData.alt}
							/>
						</div>
						<form
							method="POST"
							class="flex flex-col gap-6 md:col-span-2"
							on:submit = {submitForm}
							on:input = {() => isFormChanged = true}
						>
							<div class="space-y-2">
								<label
									for = "file_name"
									class = "block text-sm font-medium leading-6 text-gray-900"
								>
									{$t('file-name')}
								</label>
								<input
									type = "text"
									id = "file_name"
									name = "file_name"
									bind:value = {imageData.file_name}
									class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<label
										for = "alt"
										class = "block text-sm font-medium leading-6 text-gray-900"
									>
										{$t('alt-text')}
									</label>
									<button
									 type="button"
									 on:click = {generateAlt}
									 disabled = {isGeneratingAlt}
									 class="text-cyan-600 text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
									>
										{isGeneratingAlt ? $t('generating') : $t('generate-alt')}
									</button>
								</div>
								<textarea
									id = "alt"
									name = "alt"
									rows="3"
									bind:value = {imageData.alt}
									class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
								></textarea>
								<small>{$t('alt-text-description')}</small>
							</div>
							<div class="space-y-2">
								<label
									for = "folder"
									class = "block text-sm font-medium leading-6 text-gray-900"
								>
									{$t('folder')}
								</label>
								<input
									type = "text"
									id = "folder"
									name = "folder"
									bind:value = {imageData.folder}
									class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
							<div class="space-y-2">
								<label
									for = "caption"
									class = "block text-sm font-medium leading-6 text-gray-900"
								>
									{$t('image-caption')}
								</label>
								<input
									type = "text"
									id = "caption"
									name = "caption"
									bind:value = {imageData.caption}
									class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
							<div class="space-y-2">
								<label
									for = "taken_at"
									class = "block text-sm font-medium leading-6 text-gray-900"
								>
									{$t('shooting-time')}
								</label>
								<input
									type = "datetime-local"
									id = "taken_at"
									name = "taken_at"
									bind:value = {imageData.taken_at}
									on:change = {() => console.log(imageData.taken_at)}
									class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
							<div class="space-y-2">
								<label
									for = "location"
									class = "block text-sm font-medium leading-6 text-gray-900"
								>
									{$t('shooting-location')}
								</label>
								<input
									type = "text"
									id = "location"
									name = "location"
									bind:value = {imageData.location}
									class="text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600 block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
							<div class = "mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
								<button
									type = "submit"
									disabled={!isFormChanged}
									class =
										"inline-flex w-full justify-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 sm:ml-3 sm:w-auto disabled:bg-gray-200"
								>
									{$t('submit')}
								</button>
								<button
									type = "button"
									on:click = {closeEdit}
									class =
										"mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto "
								>{$t('cancel')}</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dialog {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		z-index: 1000;
	}
</style>
