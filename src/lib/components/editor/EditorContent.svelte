<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import type { Editor } from '$lib/functions/Editor';

	let element: HTMLElement;
	export let editor: Editor;

	// 类型守卫：检查 element 是否为 HTMLElement
	const isHTMLElement = (el: unknown): el is HTMLElement => {
		return el instanceof HTMLElement;
	};

	const init = async () => {
		await tick();
		if (!editor?.options.element) {
			return;
		}

		if (editor.contentElement) {
			return;
		}

		// 类型守卫检查
		const editorElement = editor.options.element;
		if (!isHTMLElement(editorElement)) {
			return;
		}

		// 安全地获取 childNodes
		const childNodes = Array.from(editorElement.childNodes) as Node[];
		element.append(...childNodes);
		editor.setOptions({ element });

		editor.contentElement = element;
	};

	onMount(init);

	onDestroy(() => {
		if (!editor) {
			return;
		}

		editor.contentElement = null;

		const editorElement = editor.options.element;
		if (!editorElement || !isHTMLElement(editorElement)) {
			return;
		}

		if (!editorElement.firstChild) {
			return;
		}

		const newElement = document.createElement('div');
		const childNodes = Array.from(editorElement.childNodes) as Node[];
		newElement.append(...childNodes);

		editor.setOptions({
			element: newElement
		});
	});
</script>

<div bind:this={element}></div>
<slot />
