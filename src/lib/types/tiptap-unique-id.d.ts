declare module 'tiptap-unique-id' {
	import { Extension } from '@tiptap/core';

	export interface UniqueIdOptions {
		attributeName?: string;
		types?: string[];
		createId?: () => string;
		filterTransaction?: ((transaction: unknown) => boolean) | null;
	}

	const UniqueId: Extension<UniqueIdOptions>;
	export default UniqueId;
}
