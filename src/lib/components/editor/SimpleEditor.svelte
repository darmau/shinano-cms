<script lang="ts">
	import { onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import StarterKit from '@tiptap/starter-kit';
	import Highlight from '@tiptap/extension-highlight';
	import { Link } from '@tiptap/extension-link';
	import { Editor } from '$lib/functions/Editor';
	import type { Content } from '@tiptap/core';
	import EditorContent from '$components/editor/EditorContent.svelte';
	import createEditor from '$lib/functions/createEditor';
	import H2Icon from '$assets/icons/editor/heading2.svelte';
	import BoldIcon from '$assets/icons/editor/bold.svelte';
	import ItalicIcon from '$assets/icons/editor/italic.svelte';
	import StrikeIcon from '$assets/icons/editor/strike.svelte';
	import CodeIcon from '$assets/icons/editor/code.svelte';
	import HighlightIcon from '$assets/icons/editor/highlight.svelte';
	import LinkIcon from '$assets/icons/editor/link.svelte';
	import UnlinkIcon from '$assets/icons/editor/linkoff.svelte';
	import ParagraphIcon from '$assets/icons/editor/paragraph.svelte';
	import BlockquoteIcon from '$assets/icons/editor/quote.svelte';
	import BulletListIcon from '$assets/icons/editor/ulist.svelte';
	import OrderedListIcon from '$assets/icons/editor/olist.svelte';
	import HardBreakIcon from '$assets/icons/editor/break.svelte';
	import { Typography } from '@tiptap/extension-typography';
	import Gapcursor from '@tiptap/extension-gapcursor';
	import Heading, { type Level } from '@tiptap/extension-heading';
	import type { EditorContentUpdateDetail, MenuItem } from '$lib/types/editor';

	export let content: Content | undefined = undefined;
	export let onContentUpdate: ((detail: EditorContentUpdateDetail) => void) | undefined;

	let editor: Readable<Editor>;

	onMount(() => {
		editor = createEditor({
			extensions: [
				StarterKit,
				Heading.configure({
					levels: [2]
				}),
				Highlight,
				Link.configure({
					protocols: ['http', 'https', 'mailto'],
					defaultProtocol: 'https'
				}),
				Typography,
				Gapcursor
			],
			content: content,
			editorProps: {
				attributes: {
					class:
						'prose prose-zinc max-w-none ring-1 ring-inset ring-gray-300 rounded-b-md p-3 outline-none'
				}
			},
			onUpdate: ({ editor }) => {
				const json = editor.getJSON();
				const html = editor.getHTML();
				const text = editor.getText();

				// 回调通知内容变更
				onContentUpdate?.({ json, html, text });
			}
		});
	});

	const toggleHeading = (level: Level = 2) => {
		return () => {
			$editor.chain().focus().toggleHeading({ level }).run();
		};
	};

	const toggleBold = () => {
		$editor.chain().focus().toggleBold().run();
	};

	const toggleItalic = () => {
		$editor.chain().focus().toggleItalic().run();
	};

	const toggleStrike = () => {
		$editor.chain().focus().toggleStrike().run();
	};

	const toggleInlineCode = () => {
		$editor.chain().focus().toggleCode().run();
	};

	const toggleHighlight = () => {
		$editor.chain().focus().toggleHighlight().run();
	};

	const toggleBlockquote = () => {
		$editor.chain().focus().toggleBlockquote().run();
	};

	const setLink = () => {
		const previousUrl = $editor.getAttributes('link').href;
		const url = window.prompt('URL', previousUrl);

		// cancelled
		if (url === null) {
			return;
		}

		// empty
		if (url === '') {
			$editor.chain().focus().extendMarkRange('link').unsetLink().run();

			return;
		}

		// update link
		$editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	};

	const setParagraph = () => {
		$editor.chain().focus().setParagraph().run();
	};

	const toggleBulletList = () => {
		$editor.chain().focus().toggleBulletList().run();
	};

	const toggleOrderedList = () => {
		$editor.chain().focus().toggleOrderedList().run();
	};

	const setHardBreak = () => {
		$editor.chain().focus().setHardBreak().run();
	};

	const setDivider = () => {
		$editor.chain().focus().setHorizontalRule().run();
	};

	$: isActive = (name: string, attrs = {}) => $editor.isActive(name, attrs);

	let menuItems: Array<MenuItem & { content: typeof H2Icon }> = [];

	$: if ($editor) {
		menuItems = [
			{
				name: 'heading-2',
				command: toggleHeading(2),
				content: H2Icon,
				active: () => isActive('heading', { level: 2 })
			},
			{
				name: 'bold',
				command: toggleBold,
				content: BoldIcon,
				active: () => isActive('bold')
			},
			{
				name: 'italic',
				command: toggleItalic,
				content: ItalicIcon,
				active: () => isActive('italic')
			},
			{
				name: 'strike',
				command: toggleStrike,
				content: StrikeIcon,
				active: () => isActive('strike')
			},
			{
				name: 'inline-code',
				command: toggleInlineCode,
				content: CodeIcon,
				active: () => isActive('code')
			},
			{
				name: 'highlight',
				command: toggleHighlight,
				content: HighlightIcon,
				active: () => isActive('highlight')
			},
			{
				name: 'link',
				command: setLink,
				content: LinkIcon,
				active: () => isActive('link')
			},
			{
				name: 'unlink',
				command: () => $editor.chain().focus().unsetLink().run(),
				content: UnlinkIcon,
				active: () => isActive('link')
			},
			{
				name: 'paragraph',
				command: setParagraph,
				content: ParagraphIcon,
				active: () => isActive('paragraph')
			},
			{
				name: 'blockquote',
				command: toggleBlockquote,
				content: BlockquoteIcon,
				active: () => isActive('blockquote')
			},
			{
				name: 'bullet-list',
				command: toggleBulletList,
				content: BulletListIcon,
				active: () => isActive('bulletList')
			},
			{
				name: 'ordered-list',
				command: toggleOrderedList,
				content: OrderedListIcon,
				active: () => isActive('orderedList')
			},
			{
				name: 'hard-break',
				command: setHardBreak,
				content: HardBreakIcon,
				active: () => isActive('hardBreak')
			}
		];
	}

	export function updateContent(content: Content) {
		$editor.chain().focus().setContent(content).run();
	}
</script>

<div class="relative">
	{#if editor}
		<div class="sticky top-0 bg-white z-20 ring-1 ring-inset ring-gray-300 rounded-t-md">
			<div class="p-2 flex gap-1 flex-wrap">
				{#each menuItems as item (item.name)}
					<button
						type="button"
						title={item.name}
						class="hover:bg-black hover:text-white w-auto h-7 px-1 rounded {item.active()
							? 'bg-black text-white'
							: ''}"
						on:click={item.command}
					>
						<svelte:component this={item.content} classList="w-6 h-6" />
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<EditorContent editor={$editor} />
</div>
