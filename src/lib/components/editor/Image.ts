import { mergeAttributes, Node } from '@tiptap/core';

type ImageAttributes = {
	prefix?: string;
	storage_key?: string;
};

const buildImageSrc = ({ prefix, storage_key }: ImageAttributes): string => {
	if (!prefix || !storage_key) {
		return '';
	}

	return `${prefix}/cdn-cgi/image/format=auto,width=960/${prefix}/${storage_key}`;
};

export default Node.create({
	name: 'image',
	group: 'block',
	atom: true,
	draggable: true,
	parseHTML() {
		return [
			{
				tag: 'img[data-storage-key]'
			}
		];
	},
	renderHTML({ HTMLAttributes }) {
		const { prefix, storage_key, caption, ...rest } = HTMLAttributes;
		const src = buildImageSrc({ prefix, storage_key }) || rest.src || '';
		const classList = ['w-1/2', rest.class].filter(Boolean).join(' ');

		return [
			'img',
			mergeAttributes(rest, {
				src,
				alt: rest.alt ?? '',
				class: classList,
				'data-prefix': prefix ?? '',
				'data-storage-key': storage_key ?? '',
				'data-caption': caption ?? ''
			})
		];
	},
	addNodeView() {
		return ({ node }) => {
			const figure = document.createElement('figure');
			figure.classList.add('w-1/3');

			const img = document.createElement('img');
			const computedSrc = buildImageSrc(node.attrs) || node.attrs.src || '';
			img.src = computedSrc;
			img.alt = node.attrs.alt ?? '';

			const figcaption = document.createElement('figcaption');
			figcaption.textContent = node.attrs.caption ?? '';

			figure.appendChild(img);
			figure.appendChild(figcaption);

			return {
				dom: figure,
				ignoreMutation: () => true
			};
		};
	},
	addAttributes() {
		return {
			id: {
				default: null
			},
			alt: {
				default: '',
				parseHTML: (element) => element.getAttribute('alt') ?? ''
			},
			storage_key: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-storage-key') ?? ''
			},
			prefix: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-prefix') ?? ''
			},
			caption: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-caption') ?? ''
			}
		};
	}
});
