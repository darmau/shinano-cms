import { CodeBlock } from '@tiptap/extension-code-block';
import type { CodeBlockOptions } from '@tiptap/extension-code-block';

export interface CustomCodeBlockOptions extends CodeBlockOptions {
	HTMLAttributes?: Record<string, any>;
}

/**
 * CustomCodeBlock 扩展自 TipTap 自带的 CodeBlock
 * 保留了 CodeBlock 的所有原有功能，同时添加了：
 * 1. data-language 属性用于存储编程语言
 * 2. 自定义样式（深色背景、语法高亮支持）
 * 3. 完全兼容 TipTap CodeBlock 的所有命令和功能
 */
export const CustomCodeBlock = CodeBlock.extend<CustomCodeBlockOptions>({
	name: 'codeBlock',

	// 添加自定义属性，同时保留父类的所有属性
	addAttributes() {
		return {
			// 保留 CodeBlock 的所有原有属性
			...this.parent?.(),
			// 添加 data-language 属性用于存储编程语言
			'data-language': {
				default: null,
				parseHTML: (element) => element.getAttribute('data-language'),
				renderHTML: (attributes) => {
					if (!attributes['data-language']) {
						return {};
					}
					return {
						'data-language': attributes['data-language']
					};
				}
			},
			// 同步 language 属性（与 data-language 保持一致）
			language: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-language'),
				renderHTML: (attributes) => {
					// language 属性不直接渲染到 HTML，只用于内部存储
					return {};
				}
			}
		};
	},

	// 自定义渲染，保留原有结构，添加自定义样式和属性
	renderHTML({ node, HTMLAttributes }) {
		// 合并原有的 HTMLAttributes 和我们的自定义属性
		const mergedAttributes = {
			...HTMLAttributes,
			'data-language': node.attrs['data-language'] || '',
			class:
				`${HTMLAttributes?.class || ''} bg-gray-900 text-gray-100 rounded-md p-4 overflow-x-auto relative font-mono text-sm`.trim()
		};

		return ['pre', mergedAttributes, ['code', {}, 0]];
	}
});
