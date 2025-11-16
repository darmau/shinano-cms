import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

type EmbedAttributes = {
	code: string;
};

const hasDOMSupport = typeof window !== 'undefined' && typeof document !== 'undefined';

const sanitizeCode = (code: string | null | undefined): string => code?.trim() ?? '';

const decodeAttribute = (value: string | null): string => {
	if (!value) {
		return '';
	}

	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

const encodeAttribute = (value: string): string => {
	try {
		return encodeURIComponent(value);
	} catch {
		return value;
	}
};

const applyAttributes = (element: HTMLElement, attributes: Record<string, any>) => {
	Object.entries(attributes).forEach(([key, value]) => {
		if (value === null || value === undefined) {
			return;
		}

		element.setAttribute(key, value === true ? '' : String(value));
	});
};

export const Embed = Node.create({
	name: 'embed',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			code: {
				default: '',
				parseHTML: (element) => {
					const encoded = element.getAttribute('data-embed-code');
					if (encoded) {
						return decodeAttribute(encoded);
					}
					return element.innerHTML ?? '';
				},
				renderHTML: (attributes) => {
					const code = sanitizeCode(attributes.code);
					return {
						'data-embed-code': code ? encodeAttribute(code) : ''
					};
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-embed-block]'
			},
			{
				tag: 'figure[data-embed-block]'
			}
		];
	},

	renderText({ node }) {
		return node.attrs.code ?? '';
	},

	renderHTML({ node, HTMLAttributes }) {
		const code = sanitizeCode(node.attrs.code);
		const attributes = mergeAttributes(HTMLAttributes, {
			'data-embed-block': 'true'
		});

		if (!hasDOMSupport) {
			return ['div', attributes];
		}

		const wrapper = document.createElement('div');
		applyAttributes(wrapper, attributes);
		wrapper.innerHTML = code;

		return wrapper;
	},

	addCommands() {
		return {
			insertEmbed:
				(attrs: EmbedAttributes) =>
				({ commands }: CommandProps) => {
					const code = sanitizeCode(attrs.code);
					if (!code) {
						return false;
					}

					return commands.insertContent({
						type: this.name,
						attrs: { code }
					});
				},
			updateEmbed:
				(attrs: EmbedAttributes) =>
				({ commands }: CommandProps) => {
					const code = sanitizeCode(attrs.code);
					if (!code) {
						return false;
					}

					return commands.updateAttributes(this.name, { code });
				}
		};
	},

	addNodeView() {
		return ({ node }) => {
			const dom = document.createElement('div');
			dom.classList.add('tiptap-embed-block');
			dom.setAttribute('data-embed-block', 'true');
			dom.setAttribute('contenteditable', 'false');

			const label = document.createElement('div');
			label.classList.add('tiptap-embed-label');
			label.textContent = 'Embed';

			const content = document.createElement('div');
			content.classList.add('tiptap-embed-content');

			const setContent = (value: string) => {
				const sanitized = sanitizeCode(value);
				if (!sanitized) {
					content.innerHTML = '';
					const placeholder = document.createElement('div');
					placeholder.classList.add('tiptap-embed-placeholder');
					placeholder.textContent = '嵌入 HTML';
					content.appendChild(placeholder);
					return;
				}

				content.innerHTML = sanitized;
			};

			setContent(node.attrs.code ?? '');

			dom.append(label, content);

			return {
				dom,
				update: (updatedNode) => {
					if (updatedNode.type.name !== this.name) {
						return false;
					}

					setContent(updatedNode.attrs.code ?? '');
					return true;
				},
				ignoreMutation: () => true
			};
		};
	}
});

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		embed: {
			insertEmbed: (attrs: EmbedAttributes) => ReturnType;
			updateEmbed: (attrs: EmbedAttributes) => ReturnType;
		};
	}
}
