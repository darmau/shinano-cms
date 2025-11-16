<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { Content } from '@tiptap/core';
	import type { Editor as CoreEditor } from '@tiptap/core';
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
	import EmbedIcon from '$assets/icons/editor/embed.svelte';
	import InsertTable from '$assets/icons/editor/insertTable.svelte';
	import InsertColumnBefore from '$assets/icons/editor/tableColumnBefore.svelte';
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
	import { Typography } from '@tiptap/extension-typography';
	import UniqueId from 'tiptap-unique-id';
	import Heading from '@tiptap/extension-heading';
	import ImagesModel from '$components/editor/ImagesModel.svelte';
	import Image from '$components/editor/Image';
	import { Embed } from '$components/editor/Embed';
	import Gapcursor from '@tiptap/extension-gapcursor';
	import type {
		EditorContentUpdateDetail,
		ImagesModelData,
		MenuItem,
		SelectedImage
	} from '$lib/types/editor';
	export let data: ImagesModelData;
	export let content: Content | undefined = undefined;
	export let onContentUpdate: ((detail: EditorContentUpdateDetail) => void) | undefined;

	let editor: Readable<Editor> | undefined;
	let unsubscribe: (() => void) | undefined;
let codeLanguage = '';
	let isModalOpen = false;
	let debugData: Content | null = null;
	let showDebug = false;

	// 支持的编程语言列表
	const supportedLanguages = [
		'C',
		'CSS',
		'Dockerfile',
		'Go',
		'GraphQL',
		'HTML',
		'XML',
		'HTTP',
		'JSON',
		'JavaScript',
		'Markdown',
		'Nginx',
		'Plaintext',
		'PostgreSQL',
		'PL/pgSQL',
		'Python',
		'Ruby',
		'Rust',
		'SCSS',
		'SQL',
		'Shell',
		'Swift',
		'TypeScript',
		'YAML'
	];

	// 将语言代码转换为显示名称
	function getLanguageDisplayName(languageCode: string): string {
		if (!languageCode) return 'Plain Text';

		// 将小写代码转换为显示名称
		const codeToName: Record<string, string> = {
			c: 'C',
			css: 'CSS',
			dockerfile: 'Dockerfile',
			go: 'Go',
			graphql: 'GraphQL',
			html: 'HTML',
			xml: 'XML',
			http: 'HTTP',
			json: 'JSON',
			javascript: 'JavaScript',
			js: 'JavaScript',
			markdown: 'Markdown',
			md: 'Markdown',
			nginx: 'Nginx',
			plaintext: 'Plain Text',
			text: 'Plain Text',
			postgresql: 'PostgreSQL',
			plpgsql: 'PL/pgSQL',
			python: 'Python',
			py: 'Python',
			ruby: 'Ruby',
			rb: 'Ruby',
			rust: 'Rust',
			rs: 'Rust',
			scss: 'SCSS',
			sql: 'SQL',
			shell: 'Shell',
			sh: 'Shell',
			bash: 'Shell',
			swift: 'Swift',
			typescript: 'TypeScript',
			ts: 'TypeScript',
			yaml: 'YAML',
			yml: 'YAML'
		};

		return (
			codeToName[languageCode.toLowerCase()] ||
			languageCode.charAt(0).toUpperCase() + languageCode.slice(1)
		);
	}

	// 将 menuItems 和 tableItems 移到响应式语句外，避免每次 editor 更新都重新创建

	const createMenuItems = (
		editorInstance: Editor
	): Array<MenuItem & { content: typeof BoldIcon }> => [
		{
			name: 'image',
			command: () => openImageModal(),
			content: ImageIcon,
			active: () => editorInstance.isActive('image')
		},
		{
			name: 'embed',
			command: () => openEmbedDialog(editorInstance),
			content: EmbedIcon,
			active: () => editorInstance.isActive('embed')
		},
		{
			name: 'heading-2',
			command: () => editorInstance.chain().focus().toggleHeading({ level: 2 }).run(),
			content: H2Icon,
			active: () => editorInstance.isActive('heading', { level: 2 })
		},
		{
			name: 'heading-3',
			command: () => editorInstance.chain().focus().toggleHeading({ level: 3 }).run(),
			content: H3Icon,
			active: () => editorInstance.isActive('heading', { level: 3 })
		},
		{
			name: 'heading-4',
			command: () => editorInstance.chain().focus().toggleHeading({ level: 4 }).run(),
			content: H4Icon,
			active: () => editorInstance.isActive('heading', { level: 4 })
		},
		{
			name: 'bold',
			command: () => editorInstance.chain().focus().toggleBold().run(),
			content: BoldIcon,
			active: () => editorInstance.isActive('bold')
		},
		{
			name: 'italic',
			command: () => editorInstance.chain().focus().toggleItalic().run(),
			content: ItalicIcon,
			active: () => editorInstance.isActive('italic')
		},
		{
			name: 'strike',
			command: () => editorInstance.chain().focus().toggleStrike().run(),
			content: StrikeIcon,
			active: () => editorInstance.isActive('strike')
		},
		{
			name: 'inline-code',
			command: () => editorInstance.chain().focus().toggleCode().run(),
			content: CodeIcon,
			active: () => editorInstance.isActive('code')
		},
		{
			name: 'highlight',
			command: () => editorInstance.chain().focus().toggleHighlight().run(),
			content: HighlightIcon,
			active: () => editorInstance.isActive('highlight')
		},
		{
			name: 'link',
			command: () => setLink(editorInstance),
			content: LinkIcon,
			active: () => editorInstance.isActive('link')
		},
		{
			name: 'unlink',
			command: () => editorInstance.chain().focus().unsetLink().run(),
			content: UnlinkIcon,
			active: () => editorInstance.isActive('link')
		},
		{
			name: 'paragraph',
			command: () => editorInstance.chain().focus().setParagraph().run(),
			content: ParagraphIcon,
			active: () => editorInstance.isActive('paragraph')
		},
		{
			name: 'blockquote',
			command: () => editorInstance.chain().focus().toggleBlockquote().run(),
			content: BlockquoteIcon,
			active: () => editorInstance.isActive('blockquote')
		},
		{
			name: 'bullet-list',
			command: () => editorInstance.chain().focus().toggleBulletList().run(),
			content: BulletListIcon,
			active: () => editorInstance.isActive('bulletList')
		},
		{
			name: 'ordered-list',
			command: () => editorInstance.chain().focus().toggleOrderedList().run(),
			content: OrderedListIcon,
			active: () => editorInstance.isActive('orderedList')
		},
		{
			name: 'code-block',
			command: () => editorInstance.chain().focus().toggleCodeBlock().run(),
			content: CodeBlockIcon,
			active: () => editorInstance.isActive('codeBlock')
		},
		{
			name: 'hard-break',
			command: () => editorInstance.chain().focus().setHardBreak().run(),
			content: HardBreakIcon,
			active: () => editorInstance.isActive('hardBreak')
		},
		{
			name: 'divider',
			command: () => editorInstance.chain().focus().setHorizontalRule().run(),
			content: DividerIcon,
			active: () => editorInstance.isActive('horizontalRule')
		},
		{
			name: 'undo',
			command: () => editorInstance.chain().focus().undo().run(),
			content: Undo,
			active: () => false // undo/redo 不需要 active 状态
		},
		{
			name: 'redo',
			command: () => editorInstance.chain().focus().redo().run(),
			content: Redo,
			active: () => false // undo/redo 不需要 active 状态
		}
	];

	const createTableItems = (editorInstance: Editor): MenuItem[] => [
		{
			name: 'insert-table',
			command: () =>
				editorInstance
					.chain()
					.focus()
					.insertTable({
						rows: 3,
						cols: 3,
						withHeaderRow: true
					})
					.run(),
			content: InsertTable,
			active: () => editorInstance.isActive('table')
		},
		{
			name: 'insert-column-before',
			command: () => editorInstance.chain().focus().addColumnBefore().run(),
			content: InsertColumnBefore,
			active: () => false
		},
		{
			name: 'insert-column-after',
			command: () => editorInstance.chain().focus().addColumnAfter().run(),
			content: InsertColumnAfter,
			active: () => false
		},
		{
			name: 'delete-column',
			command: () => editorInstance.chain().focus().deleteColumn().run(),
			content: DeleteColumn,
			active: () => false
		},
		{
			name: 'insert-row-before',
			command: () => editorInstance.chain().focus().addRowBefore().run(),
			content: InsertRowBefore,
			active: () => false
		},
		{
			name: 'insert-row-after',
			command: () => editorInstance.chain().focus().addRowAfter().run(),
			content: InsertRowAfter,
			active: () => false
		},
		{
			name: 'delete-row',
			command: () => editorInstance.chain().focus().deleteRow().run(),
			content: DeleteRow,
			active: () => false
		}
	];

	let menuItems: MenuItem[] = [];
	let tableItems: MenuItem[] = [];

	onMount(() => {
		const editorStore = createEditor({
			extensions: [
				StarterKit.configure({
					codeBlock: false // 禁用 StarterKit 的默认 CodeBlock，使用我们的 CustomCodeBlock
				}),
				Heading.configure({
					levels: [2, 3, 4]
				}),
				UniqueId.configure({
					attributeName: 'id',
					types: ['heading'],
					createId: () => window.crypto.randomUUID()
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
						class: 'border whitespace-nowrap py-4 pl-4 pr-3 text-sm text-black sm:pl-6'
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
				Embed,
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

				// 更新调试数据
				debugData = json;

				// 更新代码块的语言标签
				updateCodeBlockLabels(editor);

				// 触发自定义事件
				onContentUpdate?.({ json, html, text });
			}
		});

		editor = editorStore;

		// 初始化 menuItems 和 tableItems
		unsubscribe = editorStore.subscribe((editorInstance) => {
			menuItems = createMenuItems(editorInstance);
			tableItems = createTableItems(editorInstance);

			// 初始化调试数据
			if (editorInstance) {
				debugData = editorInstance.getJSON();
			}

			// 初始化代码块标签
			setTimeout(() => {
				updateCodeBlockLabels(editorInstance);
			}, 100);
		});
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	// 响应 content prop 的变化（仅在外部 content 变化时更新，避免循环更新）
	let previousContent: Content | undefined = content;
	$: if (editor && content !== undefined) {
		const editorInstance = $editor;
		if (editorInstance) {
			// 检查 content 是否真的改变了
			const newContentStr = JSON.stringify(content);
			const previousContentStr = JSON.stringify(previousContent);

			if (newContentStr !== previousContentStr) {
				const currentContent = editorInstance.getJSON();
				const currentContentStr = JSON.stringify(currentContent);

				// 只有当新内容和当前编辑器内容不同时才更新
				if (newContentStr !== currentContentStr) {
					editorInstance.chain().setContent(content, { emitUpdate: false }).run();
				}
				previousContent = content;
			}
		}
	}

	const setLink = (editorInstance: Editor) => {
		const previousUrl = editorInstance.getAttributes('link').href;
		const url = window.prompt('URL', previousUrl);

		// cancelled
		if (url === null) {
			return;
		}

		// empty
		if (url === '') {
			editorInstance.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}

		// update link
		editorInstance.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	};

	const isValidEmbedHtml = (code: string): boolean => {
		const trimmed = code.trim();
		if (!trimmed) {
			return false;
		}

		if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
			return true;
		}

		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(trimmed, 'text/html');
			if (doc.querySelector('parsererror')) {
				return false;
			}

			if (typeof Node !== 'undefined') {
				return Array.from(doc.body.childNodes).some((node) => node.nodeType === Node.ELEMENT_NODE);
			}

			return doc.body.childNodes.length > 0;
		} catch (error) {
			console.warn('Failed to validate embed HTML', error);
			return false;
		}
	};

	function openEmbedDialog(editorInstance: Editor) {
		const previousCode = editorInstance.isActive('embed')
			? ((editorInstance.getAttributes('embed').code as string | undefined) ?? '')
			: '';
		const input = window.prompt('输入要嵌入的 HTML 代码', previousCode);

		if (input === null) {
			return;
		}

		const trimmed = input.trim();
		if (!isValidEmbedHtml(trimmed)) {
			window.alert('请输入合法的 HTML 代码。');
			return;
		}

		const chain = editorInstance.chain().focus();
		if (editorInstance.isActive('embed')) {
			chain.updateAttributes('embed', { code: trimmed }).run();
			return;
		}

		chain
			.insertContent({
				type: 'embed',
				attrs: { code: trimmed }
			})
			.run();
	}

	function openImageModal() {
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
	}

	// 更新代码块的语言标签
	function updateCodeBlockLabels(editorInstance: CoreEditor) {
		if (!editorInstance?.view?.dom) return;

		const editorElement = editorInstance.view.dom;
		// 查找所有 pre 元素（代码块），不仅仅是那些已经有 data-language 的
		const codeBlocks = editorElement.querySelectorAll('pre');

		codeBlocks.forEach((preElement) => {
			if (!(preElement instanceof HTMLElement)) return;

			// 检查是否是代码块（包含 code 子元素）
			const codeElement = preElement.querySelector('code');
			if (!codeElement) return;

			// 确保 pre 元素有相对定位
			if (!preElement.classList.contains('relative')) {
				preElement.classList.add('relative');
			}

			const language = preElement.getAttribute('data-language') || '';

			// 添加或更新语言标签
			let languageLabel = preElement.querySelector('.code-language-label') as HTMLElement;
			if (!languageLabel) {
				languageLabel = document.createElement('div');
				languageLabel.className = 'code-language-label';
				preElement.insertBefore(languageLabel, preElement.firstChild);
			}

			// 如果有指定语言，显示语言标签
			if (language) {
				languageLabel.textContent = getLanguageDisplayName(language);
				languageLabel.style.display = '';
			} else {
				languageLabel.style.display = 'none';
			}
		});
	}

	function handleSelect(images: SelectedImage[]) {
		if (!editor) return;

		const editorInstance = $editor;
		if (!editorInstance) return;

		const nodeLists = images.map((image) => ({
			type: 'image',
			attrs: image
		}));
		editorInstance.chain().focus().insertContent(nodeLists).run();
	}

	const setCodeLanguage = () => {
		if (!editor) return;

		const editorInstance = $editor;
		if (!editorInstance) return;

		const language = codeLanguage.trim().toLowerCase();
		if (!language) {
			return;
		}

		editorInstance
			.chain()
			.focus()
			.updateAttributes('codeBlock', {
				'data-language': language,
				language: language
			})
			.run();

		// 更新后更新语言标签
		setTimeout(() => {
			updateCodeBlockLabels(editorInstance);
		}, 50);
	};

	export function updateContent(newContent: Content) {
		if (!editor) return;

		const editorInstance = $editor;
		if (!editorInstance) return;

		editorInstance.chain().setContent(newContent, { emitUpdate: false }).run();
	}
</script>

{#if isModalOpen}
	<ImagesModel {data} closeModel={closeModal} onSelect={handleSelect} />
{/if}
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
			<div class="p-2 flex gap-1 flex-wrap">
				{#each tableItems as item (item.name)}
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
			<div class="p-2 flex items-center gap-2">
				<select
					bind:value={codeLanguage}
					on:change={setCodeLanguage}
					class="rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
				>
					<option value="">选择语言</option>
					{#each supportedLanguages as lang}
						<option value={lang.toLowerCase()}>{lang}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

	{#if editor}
		{#if $editor}
			<EditorContent editor={$editor} />
		{/if}
	{/if}

	<!-- 调试模块 -->
	<div class="mt-4">
		<button
			type="button"
			on:click={() => (showDebug = !showDebug)}
			class="mb-2 text-sm text-gray-600 hover:text-gray-900 underline font-medium"
		>
			{showDebug ? '▼ 隐藏' : '▶ 显示'}调试数据
		</button>

		{#if showDebug && debugData}
			<div class="bg-gray-50 rounded-md p-4 border border-gray-200">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-semibold text-gray-700">编辑器原始 JSON 数据：</h3>
					<button
						type="button"
						on:click={() => {
							if (navigator.clipboard) {
								navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
							}
						}}
						class="text-xs text-gray-500 hover:text-gray-700 underline"
					>
						复制
					</button>
				</div>
				<pre
					class="text-xs overflow-x-auto bg-white p-4 rounded border border-gray-200 max-h-96 overflow-y-auto font-mono"><code
						class="text-gray-800 whitespace-pre">{JSON.stringify(debugData, null, 2)}</code
					></pre>
			</div>
		{/if}
	</div>
</div>
