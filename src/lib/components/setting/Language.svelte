<script lang="ts">
	import PlusIcon from '$assets/icons/plus.svelte';
	import AddLanguage from '$components/setting/AddLanguage.svelte';
	import { getToastStore } from '$lib/toast';
	import { ProgressRadial } from '$lib/toast';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import { invalidateAll } from '$app/navigation';

	export let data: { languages: Array<{ lang: string; locale: string; is_default: boolean }> };

	const toastStore = getToastStore();
	const supabase = browser ? getSupabaseBrowserClient() : null;

	// 更换默认语言
	const setDefaultLanguage = async (lang: string) => {
		if (!supabase) return;
		
		const { error } = await supabase.from('language').update({ is_default: true }).eq('lang', lang);
		if (error) {
			console.error(error);
			toastStore.trigger({
				message: 'Failed to set default language.',
				background: 'variant-filled-error'
			});
			return;
		}
		
		await invalidateAll();
		toastStore.trigger({
			message: '默认语言已切换',
			hideDismiss: true,
			background: 'variant-filled-success'
		});
	};

	// 添加语言
	const addLanguage = async (lang: string, locale: string) => {
		if (!supabase) return;
		
		const { error: dataError } = await supabase.from('language').insert({ lang, locale }).select();
		if (dataError) {
			console.error(dataError);
			toastStore.trigger({
				message: '添加语言失败',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			return;
		}
		
		await invalidateAll();
		toastStore.trigger({
			message: '语言已添加',
			hideDismiss: true,
			background: 'variant-filled-success'
		});
	};

	// 删除语言
	const deleteLanguage = async (lang: string) => {
		if (!supabase) return;
		
		const { error: deleteError } = await supabase.from('language').delete().eq('lang', lang);
		if (deleteError) {
			console.error(deleteError);
			toastStore.trigger({
				message: '删除语言失败，请检查是否还有关联的内容',
				hideDismiss: true,
				background: 'variant-filled-error'
			});
			return;
		}
		
		await invalidateAll();
		toastStore.trigger({
			message: '语言已删除',
			hideDismiss: true,
			background: 'variant-filled-success'
		});
	};

	// 关闭添加语言窗口
	let isAdding: boolean = false;

	function closeAddLanguage() {
		isAdding = false;
	}
</script>

<main class="py-8 flex flex-col gap-4">
	<button
		on:click={() => (isAdding = true)}
		type="button"
		class="self-end inline-flex items-center gap-x-1.5 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
	>
		<PlusIcon classList="w-4 h-4" />
		添加语言
	</button>
	{#if isAdding}
		<AddLanguage {addLanguage} {closeAddLanguage} />
	{/if}
	<div>
		{#if data.languages.length === 0}
			<div class="flex justify-center items-center min-h-32">
				<ProgressRadial value={undefined} width="w-12" />
			</div>
		{:else}
			{#each data.languages as language}
				<div class="border-b border-gray-200 flex justify-between py-4">
					<div>
						<h3 class="font-medium flex items-center gap-2">
							{language.locale}
							{#if language.is_default}
								<span
									class="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20"
									>默认</span
								>
							{/if}
						</h3>
						<p class="text-sm text-zinc-600 font-mono">{language.lang}</p>
					</div>
					<div class="flex gap-4">
						{#if !language.is_default}
							<button
								on:click={() => setDefaultLanguage(language.lang)}
								type="button"
								class="uppercase text-cyan-600 text-sm hover:text-cyan-700 hover:font-semibold"
								>设为默认
							</button>
						{/if}
						<button
							type="button"
							on:click={() => deleteLanguage(language.lang)}
							class="uppercase text-sm text-red-600 hover:text-red-700 hover:font-semibold"
							>删除
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</main>
