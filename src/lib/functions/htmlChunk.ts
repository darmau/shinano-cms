const isBrowser = typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined';

const WRAPPER_TAG = 'div';
const WRAPPER_ATTR = 'data-html-chunk-wrapper';

export const splitHtmlByTopLevelNodes = (html: string): string[] => {
	if (!html || !html.trim()) {
		return [];
	}

	if (!isBrowser) {
		return [html];
	}

	const parser = new DOMParser();
	const wrappedHtml = `<${WRAPPER_TAG} ${WRAPPER_ATTR}="true">${html}</${WRAPPER_TAG}>`;
	const doc = parser.parseFromString(wrappedHtml, 'text/html');
	const container = doc.body.querySelector<HTMLElement>(`${WRAPPER_TAG}[${WRAPPER_ATTR}]`);

	if (!container) {
		return [html];
	}

	const chunks = Array.from(container.childNodes)
		.map((node) => {
			if (node.nodeType === Node.ELEMENT_NODE) {
				return (node as HTMLElement).outerHTML;
			}

			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent ?? '';
				return text.trim() ? text : '';
			}

			return '';
		})
		.filter((chunk) => chunk.length > 0);

	return chunks.length > 0 ? chunks : [html];
};

