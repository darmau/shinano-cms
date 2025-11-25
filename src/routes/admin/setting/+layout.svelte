<script lang="ts">
	import { page } from '$app/stores';

	const settingTabs = [
		{ name: 'language', path: '/admin/setting/languages', label: '语言' },
		{ name: 'ai', path: '/admin/setting/ai', label: 'AI' },
		{ name: 'api', path: '/admin/setting/apis', label: 'API' }
	];
</script>

<div>
	<div class="flex flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8">
		<h1 class="text-base font-semibold leading-7 text-gray-900">设置</h1>
		<div
			class="order-last flex w-full gap-x-4 text-sm font-semibold leading-6 sm:order-none sm:w-auto sm:border-l sm:border-gray-200 sm:pl-6 sm:leading-7"
		>
			{#each settingTabs as tab}
				<a
					href={tab.path}
					data-sveltekit-preload-data
					class={`${
						$page.url.pathname === tab.path
							? 'text-cyan-600 bg-cyan-50 py-1 rounded-md px-2'
							: 'text-gray-500 hover:bg-gray-50 py-1 rounded-md px-2'
					}`}
				>
					{tab.label}
				</a>
			{/each}
		</div>
	</div>
</div>

<slot />
