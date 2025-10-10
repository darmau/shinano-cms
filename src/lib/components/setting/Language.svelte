<script lang="ts">
	import PlusIcon from '$assets/icons/plus.svelte';
	import { t } from '$lib/functions/i18n';
	import AddLanguage from '$components/setting/AddLanguage.svelte';
	import { onMount } from 'svelte';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { browser } from '$app/environment';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';

	const toastStore = getToastStore();

	export let data;
	const supabase = browser ? getSupabaseBrowserClient() : null;
	$: languages = [];

	// 获取所有语言
	const getLanguages = async () => {
		const { data, error: fetchError } = await
			supabase.from('language').select('lang, locale, is_default').order('is_default', { ascending: false });
		if (fetchError) {
			console.error(fetchError);
			toastStore.trigger({
				message: "Failed to fetch languages.",
				background: 'variant-filled-error'
			});
		}
		languages = data;
	};

	onMount(async () => {
		await getLanguages();
	});

	// 更换默认语言
	const setDefaultLanguage = async (lang: string) => {
		await supabase.from('language').update({ is_default: true }).eq('lang', lang);
		await getLanguages();
		toastStore.trigger({
			message: $t('language-set-default'),
			hideDismiss: true,
			background: 'variant-filled-success',
		});
	};

	// 添加语言
	const addLanguage = async (lang, locale) => {
		const { error: dataError } = await
			supabase.from('language').insert({ lang, locale }).select();
		if (dataError) {
			console.error(dataError);
			toastStore.trigger({
				message: $t('language-add-fail'),
				hideDismiss: true,
				background: 'variant-filled-error'
			});
		}
		await getLanguages();
		toastStore.trigger({
			message: $t('language-added'),
			hideDismiss: true,
			background: 'variant-filled-success',
		});
	};

	// 删除语言
	const deleteLanguage = async (lang: string) => {
		const { error: deleteError } = await
			supabase.from('language').delete().eq('lang',
				lang);
		if (deleteError) {
			console.error(deleteError);
			toastStore.trigger({
				message: $t('language-delete-fail'),
				hideDismiss: true,
				background: 'variant-filled-error',
			});
		}
		await getLanguages();
		toastStore.trigger({
			message: $t('language-deleted'),
			hideDismiss: true,
			background: 'variant-filled-success',
		});
	};

	// 关闭添加语言窗口并刷新数据
	let isAdding: boolean = false;

	function closeAddLanguage() {
		isAdding = false;
	}

</script>

<main class = "py-8 flex flex-col gap-4">
	<button
		on:click = {() => isAdding = true}
		type = "button"
		class =
			"self-end inline-flex items-center gap-x-1.5 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
	>
		<PlusIcon classList = "w-4 h-4" />
		{$t('add-language')}
	</button>
	{#if isAdding}
		<AddLanguage {addLanguage} {closeAddLanguage} />
	{/if}
	<div>
		{#if languages.length === 0}
			<div class="flex justify-center items-center min-h-32">
				<ProgressRadial value={undefined} width="w-12" />
			</div>
		{:else}
			{#each languages as language}
				<div class = "border-b flex justify-between py-4">
					<div>
						<h3 class = "font-medium flex items-center gap-2">
							{language.locale}
							{#if language.is_default}
								<span
									class = "inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20"
								>{$t('default')}</span>
							{/if}
						</h3>
						<p class = "text-sm text-zinc-600 font-mono">{language.lang}</p>
					</div>
					<div class = "flex gap-4">
						{#if !language.is_default}
							<button
								on:click = {() => setDefaultLanguage(language.lang)}
								type = "button"
								class = "uppercase text-cyan-600 text-sm hover:text-cyan-700 hover:font-semibold"
							>{$t('set-default')}
							</button>
						{/if}
						<button
							type = "button"
							on:click = {() => deleteLanguage(language.lang)}
							class = "uppercase text-sm text-red-600 hover:text-red-700 hover:font-semibold"
						>{$t('delete')}
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</main>
