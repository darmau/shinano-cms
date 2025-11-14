<script>
	import { locale, locales } from '$lib/functions/i18n';
	import NavItems from '$components/NavItems.svelte';

	let menuOpen = false;

	export let data;
	export let message;
	export let comment;
</script>

<div>
	<!-- Off-canvas menu for mobile, show/hide based on off-canvas menu state. -->
	<div
		class="relative z-30 p-4 bg-white border-b flex items-center lg:hidden"
		role="dialog"
		aria-modal="true"
	>
		<button
			type="button"
			on:click={() => (menuOpen = true)}
			class="rounded-full p-2 hover:bg-gray-100"
		>
			<span class="sr-only">Open sidebar</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="w-6 h-6"
			>
				<path
					fill-rule="evenodd"
					d="M3 9a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 9Zm0 6.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>

		{#if menuOpen}
			<div
				class="fixed inset-0 bg-gray-900/80 transition-opacity ease-linear duration-300 overflow-hidden"
			></div>
			<div class="fixed inset-0 flex">
				<div class="relative mr-16 flex w-full max-w-xs flex-1">
					<div class="absolute left-full top-0 flex w-16 justify-center pt-5">
						<button type="button" class="-m-2.5 p-2.5" on:click={() => (menuOpen = false)}>
							<span class="sr-only">Close sidebar</span>
							<svg
								class="h-6 w-6 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<!-- Sidebar component, swap this element with another sidebar if you like -->
					<div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
						<div class="flex h-16 shrink-0 items-center">
							<img class="h-8 w-auto" src="https://darmau.co/logo.svg" alt="logo" />
						</div>
						<NavItems {data} bind:menuOpen {message} {comment} />
						<select
							bind:value={$locale}
							class="rounded-md bg-white px-3 py-2 text-sm text-gray-900 shadow-sm hover:bg-gray-50"
						>
							{#each locales as language}
								<option value={language.lang}>{language.locale}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Static sidebar for desktop -->
	<div class="hidden h-screen lg:flex lg:flex-col">
		<!-- Sidebar component, swap this element with another sidebar if you like -->
		<div
			class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4"
		>
			<div class="flex h-16 shrink-0 items-center">
				<img class="h-8 w-auto" src="https://darmau.co/logo.svg" alt="可可托海没有海管理后台" />
			</div>

			<NavItems {data} bind:menuOpen {message} {comment} />

			<select
				bind:value={$locale}
				class="justify-self-end rounded-md border bg-white p-2 text-sm text-gray-900 shadow-sm hover:bg-gray-50"
			>
				{#each locales as language}
					<option value={language.lang}>{language.locale}</option>
				{/each}
			</select>
		</div>
	</div>
</div>
