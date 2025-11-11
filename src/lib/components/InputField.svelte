<script lang="ts">
	import { fade } from 'svelte/transition';
	import Error from '$assets/icons/error.svelte';

	export let type: string = 'text';
	export let id: string;
	export let name: string;
	export let placeholder: string;
	export let autocomplete: string = 'off';
	export let status: string = 'normal';
	export let required: boolean = false;
	export let label: string;
	export let helpText: string = '';
	export let error: string = 'Something went wrong';

	const classes = new Map([
		['normal', 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600'],
		['error', 'text-red-500 ring-red-300 placeholder:text-red-300 focus:ring-red-500'],
		[
			'disabled',
			'placeholder:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200'
		]
	]);

	$: classList = classes.get(status);
</script>

<!--STATUS: normal, error, disabled -->
<div>
	<label for={name} class="block text-sm font-medium leading-6 text-gray-900">
		{label}
	</label>
	<div class="relative mt-2 rounded-md shadow-sm">
		<input
			{id}
			{name}
			{type}
			{autocomplete}
			{required}
			disabled={status === 'disabled'}
			{placeholder}
			class={`block w-full rounded-md border-0 py-1.5 px-2 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${classList}`}
		/>
		{#if status === 'error'}
			<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
				<Error classList="h-5 w-5 text-red-500" />
			</div>
		{/if}
	</div>
	{#if helpText && status !== 'error'}
		<p class="mt-2 text-sm text-gray-500" transition:fade={{ delay: 250, duration: 300 }}>
			{helpText}
		</p>
	{/if}
	{#if status === 'error'}
		<p class="mt-2 text-sm text-red-600" transition:fade={{ delay: 250, duration: 300 }}>
			{error}
		</p>
	{/if}
</div>
