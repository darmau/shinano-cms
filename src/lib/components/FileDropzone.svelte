<script lang="ts">
	import Media from '$assets/icons/photo.svelte';
	export let files: FileList | undefined = undefined;
	/**
	 * File input reference.
	 */
	export let fileInput: HTMLInputElement | undefined = undefined;
	export let name: string;
	/** Provide classes to set the border styles. */
	export let border = 'border-2 border-dashed';
	/** Provide classes to set the padding styles. */
	export let padding = 'p-4 py-8';
	/** Provide classes to set the box radius styles. */
	export let rounded = 'rounded-md';

	const cBase =
		'textarea relative flex justify-center items-center bg-gray-200';
	const cInput = 'w-full absolute top-0 left-0 right-0 bottom-0 z-[1] opacity-0 disabled:!opacity-0 cursor-pointer';
	const cInterface = 'flex justify-center items-center text-center';

	// Reactive
	$: classesBase = `${cBase} ${border} ${padding} ${rounded} ${$$props.class ?? ''}`;
	$: classesInput = `${cInput}`;
	$: classesInterface = `${cInterface}`;

	// Pruned RestProps
	function prunedRestProps() {
		delete $$restProps.class;
		return $$restProps;
	}
</script>

<div class="dropzone {classesBase}" class:opacity-50={$$restProps.disabled} data-testid="file-dropzone">
	<!-- Input: File (hidden) -->
	<!-- NOTE: keep `bind:files` here, unlike FileButton -->
	<input
		bind:files
		bind:this={fileInput}
		type="file"
		multiple
		{name}
		class="dropzone-input {classesInput}"
		{...prunedRestProps()}
		on:change
		on:dragenter
		on:dragover
		on:dragleave
		on:drop
		on:click
		on:keydown
		on:keyup
		on:keypress
		on:focus
		on:focusin
		on:focusout
		accept="image/png, image/jpeg, image/gif, image/webp, image/svg+xml"
	/>
	<!-- Interface -->
		<div class="w-full flex justify-center items-center gap-4">
			<Media classList="w-12 h-12" />
			<div><strong>Upload an image</strong> or drag and drop</div>
		</div>
</div>
