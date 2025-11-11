<script lang="ts">
	export let value: number | undefined = undefined;
	export let width = 'w-8';

	const statusLabel = value === undefined ? 'Loading' : `Progress ${Math.round(value)} percent`;
</script>

<div class={`flex items-center justify-center ${width}`} role="status" aria-label={statusLabel}>
	<svg
		class="h-full w-full animate-spin text-cyan-500"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
		<path
			class="opacity-90"
			d="M4 12a8 8 0 0 1 8-8"
			stroke="currentColor"
			stroke-width="4"
			stroke-linecap="round"
		/>
	</svg>
</div>
