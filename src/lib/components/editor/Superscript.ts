import { Mark, mergeAttributes } from '@tiptap/core';

export interface SuperscriptOptions {
	HTMLAttributes: Record<string, any>;
}

/**
 * Minimal superscript mark so we don't need to pull another dependency.
 * Matches <sup> tags and exposes TipTap commands for toggling it.
 */
export const Superscript = Mark.create<SuperscriptOptions>({
	name: 'superscript',

	addOptions() {
		return {
			HTMLAttributes: {}
		};
	},

	parseHTML() {
		return [
			{ tag: 'sup' },
			{
				style: 'vertical-align',
				getAttrs: (value) => value === 'super' && null
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['sup', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
	},

	addCommands() {
		return {
			setSuperscript:
				() =>
				({ commands }) =>
					commands.setMark(this.name),
			toggleSuperscript:
				() =>
				({ commands }) =>
					commands.toggleMark(this.name),
			unsetSuperscript:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name)
		};
	}
});
