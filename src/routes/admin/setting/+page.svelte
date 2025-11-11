<script>
	import Language from '$components/setting/Language.svelte';
	import APIs from '$components/setting/APIs.svelte';
	import AI from '$components/setting/AI.svelte';
	import { t } from '$lib/functions/i18n';

	// 该方法负责切换下方显示的组件
	let activeTab = Language;

	const settingTabs = [
		{ name: 'language', component: Language },
		{ name: 'ai', component: AI },
		{ name: 'api', component: APIs }
	];

	export let data;
</script>

<div>
	<div class="flex flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8">
		<h1 class="text-base font-semibold leading-7 text-gray-900">{$t('setting')}</h1>
		<div
			class="order-last flex w-full gap-x-4 text-sm font-semibold leading-6 sm:order-none sm:w-auto sm:border-l sm:border-gray-200 sm:pl-6 sm:leading-7"
		>
			{#each settingTabs as tab}
				<button
					on:click={() => (activeTab = tab.component)}
					class={`${
						tab.component === activeTab
							? 'text-cyan-600 bg-cyan-50 py-1 rounded-md px-2'
							: 'text-gray-500 hover:bg-gray-50 py-1 rounded-md px-2'
					}`}
				>
					{$t(tab.name)}
				</button>
			{/each}
		</div>
	</div>
</div>
<svelte:component this={activeTab} {data} />
