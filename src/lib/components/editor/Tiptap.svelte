<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { Content } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Highlight from '@tiptap/extension-highlight';
	import { Link } from '@tiptap/extension-link';
	import { Editor } from '$lib/functions/Editor';
	import EditorContent from '$components/editor/EditorContent.svelte';
	import createEditor from '$lib/functions/createEditor';
	import H2Icon from '$assets/icons/editor/heading2.svelte';
	import H3Icon from '$assets/icons/editor/heading3.svelte';
	import H4Icon from '$assets/icons/editor/heading4.svelte';
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
	import CodeBlockIcon from '$assets/icons/editor/codeblock.svelte';
	import HardBreakIcon from '$assets/icons/editor/break.svelte';
	import DividerIcon from '$assets/icons/editor/divider.svelte';
	import ImageIcon from '$assets/icons/editor/image.svelte';
	import InsertTable from '$assets/icons/editor/insertTable.svelte';
	import InsertColumnBefore
		from '$assets/icons/editor/tableColumnBefore.svelte';
	import InsertColumnAfter from '$assets/icons/editor/tableColumnAfter.svelte';
	import DeleteColumn from '$assets/icons/editor/tableColumnDelete.svelte';
	import InsertRowBefore from '$assets/icons/editor/tableRowBefore.svelte';
	import InsertRowAfter from '$assets/icons/editor/tableRowAfter.svelte';
	import DeleteRow from '$assets/icons/editor/tableRowDelete.svelte';
	import Undo from '$assets/icons/editor/undo.svelte';
	import Redo from '$assets/icons/editor/redo.svelte';
	import { Table } from '@tiptap/extension-table';
	import TableCell from '@tiptap/extension-table-cell';
	import TableHeader from '@tiptap/extension-table-header';
	import TableRow from '@tiptap/extension-table-row';
	import { CustomCodeBlock } from '$components/editor/CustomCodeBlock';
	import Check from '$assets/icons/check.svelte';
	import { Typography } from '@tiptap/extension-typography';
	import UniqueId from 'tiptap-unique-id';
	import Heading from '@tiptap/extension-heading';
	import ImagesModel from '$components/editor/ImagesModel.svelte';
	import Image from '$components/editor/Image';
	import Gapcursor from '@tiptap/extension-gapcursor';

	const dispatch = createEventDispatcher();
	export let data;
	export let content;

	let editor: Readable<Editor>;
	let codeLanguage = 'javascript';
	let isModalOpen = false;

	type SelectedImage = {
		id: number;
		storage_key: string;
		prefix: string;
		alt?: string | null;
		caption?: string | null;
	};

	onMount(() => {
		editor = createEditor({
			extensions: [
				StarterKit,
				Heading.configure({
					levels: [2, 3, 4],
				}),
				UniqueId.configure({
					attributeName: "id",
					types: ["heading",],
					createId: () => window.crypto.randomUUID(),
				}),
				Highlight,
				Link.configure({
					protocols: ['http', 'https', 'mailto'],
					defaultProtocol: 'https'
				}),
				Table.configure({
					HTMLAttributes: {
						class: 'not-prose min-w-full divide-y divide-gray-300'
					}
				}),
				TableRow,
				TableCell.configure({
					HTMLAttributes: {
						class:
							'border whitespace-nowrap py-4 pl-4 pr-3 text-sm text-black sm:pl-6'
					}
				}),
				TableHeader.configure({
					HTMLAttributes: {
						class:
							'text-left bg-gray-50 border whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6'
					}
				}),
				Typography,
				CustomCodeBlock,
				Image,
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

				// 触发自定义事件
				dispatch('contentUpdate', { json, html, text });
			}
		});
	});

	const toggleHeading = (level: 2 | 3 | 4) => {
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
			$editor.chain().focus().extendMarkRange('link').unsetLink()
			.run();

			return;
		}

		// update link
		$editor.chain().focus().extendMarkRange('link').setLink({ href: url })
		.run();
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

	const toggleCodeBlock = () => {
		$editor.chain().focus().toggleCodeBlock().run();
	};

	const setHardBreak = () => {
		$editor.chain().focus().setHardBreak().run();
	};

	const setDivider = () => {
		$editor.chain().focus().setHorizontalRule().run();
	};

	const insertTable = () => {
		$editor.chain().focus().insertTable({
			rows: 3, cols: 3,
			withHeaderRow: true
		}).run();
	};

	const addColumnBefore = () => {
		$editor.chain().focus().addColumnBefore().run();
	};

	const addColumnAfter = () => {
		$editor.chain().focus().addColumnAfter().run();
	};

	const deleteColumn = () => {
		$editor.chain().focus().deleteColumn().run();
	};

	const addRowBefore = () => {
		$editor.chain().focus().addRowBefore().run();
	};

	const addRowAfter = () => {
		$editor.chain().focus().addRowAfter().run();
	};

	const deleteRow = () => {
		$editor.chain().focus().deleteRow().run();
	};

	const undo = () => {
		$editor.chain().focus().undo().run();
	};

	const redo = () => {
		$editor.chain().focus().redo().run();
	};

	const setCodeLanguage = () => {
		const language = codeLanguage.trim();
		if (!language) {
			return;
		}

		$editor
			.chain()
			.focus()
			.updateAttributes('customCodeBlock', {
				'data-language': language,
				language
			})
			.run();
	};

	$: isActive = (name: string, attrs = {}) => $editor.isActive(name, attrs);

	$: menuItems = [
		{
			name: 'image',
			command: () => openImageModal(),
			content: ImageIcon,
			active: () => isActive('image')
		},
		{
			name: 'heading-2',
			command: toggleHeading(2),
			content: H2Icon,
			active: () => isActive('heading', { level: 2 })
		},
		{
			name: 'heading-3',
			command: toggleHeading(3),
			content: H3Icon,
			active: () => isActive('heading', { level: 3 })
		},
		{
			name: 'heading-4',
			command: toggleHeading(4),
			content: H4Icon,
			active: () => isActive('heading', { level: 4 })
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
			name: 'code-block',
			command: toggleCodeBlock,
			content: CodeBlockIcon,
			active: () => isActive('codeBlock')
		},
		{
			name: 'hard-break',
			command: setHardBreak,
			content: HardBreakIcon,
			active: () => isActive('hardBreak')
		},
		{
			name: 'divider',
			command: setDivider,
			content: DividerIcon,
			active: () => isActive('horizontalRule')
		},
		{
			name: 'undo',
			command: undo,
			content: Undo,
			active: () => isActive('undo')
		},
		{
			name: 'redo',
			command: redo,
			content: Redo,
			active: () => isActive('redo')
		}
	];

	$: tableItems = [
		{
			name: 'insert-table',
			command: insertTable,
			content: InsertTable,
			active: () => isActive('table')
		},
		{
			name: 'insert-column-before',
			command: addColumnBefore,
			content: InsertColumnBefore,
			active: () => isActive('tableColumnBefore')
		},
		{
			name: 'insert-column-after',
			command: addColumnAfter,
			content: InsertColumnAfter,
			active: () => isActive('tableColumnAfter')
		},
		{
			name: 'delete-column',
			command: deleteColumn,
			content: DeleteColumn,
			active: () => isActive('tableColumnDelete')
		},
		{
			name: 'insert-row-before',
			command: addRowBefore,
			content: InsertRowBefore,
			active: () => isActive('tableRowBefore')
		},
		{
			name: 'insert-row-after',
			command: addRowAfter,
			content: InsertRowAfter,
			active: () => isActive('tableRowAfter')
		},
		{
			name: 'delete-row',
			command: deleteRow,
			content: DeleteRow,
			active: () => isActive('tableRowDelete')
		}
	];

	function openImageModal() {
		isModalOpen = true;
	}

	function closeModel() {
		isModalOpen = false;
	}

	function handleSelect(images: SelectedImage[]) {
		const nodeLists = images.map((image) => {
			return {
				type: 'image',
				attrs: image
			};
		});
		$editor.chain().focus().insertContent(nodeLists).run();
	}

	export function updateContent(content: Content) {
		$editor.chain().focus().setContent(content).run();
	}
</script>

{#if isModalOpen}
	<ImagesModel {data} {closeModel} onSelect={handleSelect} />
{/if}
<div class="relative">
	{#if editor}
		<div class =
					 "sticky top-0 bg-white z-20 ring-1 ring-inset ring-gray-300 rounded-t-md">
			<div
				class = "p-2 flex gap-1 flex-wrap"
			>
				{#each menuItems as item (item.name)}
					<button
						type = "button"
						title = {item.name}
						class = "hover:bg-black hover:text-white w-auto h-7 px-1 rounded {item.active()
				? 'bg-black text-white' : ''}"
						on:click = {item.command}
					>
						<svelte:component this = {item.content} classList = "w-6 h-6" />
					</button>
				{/each}
			</div>
			<div
				class = "p-2 flex gap-1 flex-wrap"
			>
				{#each tableItems as item (item.name)}
					<button
						type = "button"
						title = {item.name}
						class = "hover:bg-black hover:text-white w-auto h-7 px-1 rounded {item.active()
				? 'bg-black text-white' : ''}"
						on:click = {item.command}
					>
						<svelte:component this = {item.content} classList = "w-6 h-6" />
					</button>
				{/each}
			</div>
			<div class = "p-2 flex items-center gap-2">
				<input
					type = "text" bind:value = {codeLanguage}
					placeholder = "Enter language"
					class = "rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				/>
				<button on:click = {setCodeLanguage}>
					<Check classList = "w-5 h-5" />
				</button>
			</div>
		</div>
	{/if}

	<EditorContent editor = {$editor} />
</div>
