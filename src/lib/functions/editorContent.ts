import type { JSONContent } from '@tiptap/core';
import type { Json } from '$lib/types/database';

const EMPTY_DOC: JSONContent = {
	type: 'doc',
	content: [{ type: 'paragraph' }]
};

/**
 * `content_json` 在数据库类型里是 `Json`（可以是数组、字符串、null……），
 * 而 Tiptap 要的是一个文档对象。这里做一次收窄，顺便给 null / 类型不对的行
 * 一个空文档兜底——编辑器拿到 null 会直接抛错，而抛错的时机恰好是用户点开
 * 一篇旧文章的时候。
 */
export function toEditorContent(value: Json | null | undefined): JSONContent {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return structuredClone(EMPTY_DOC);
	}

	return value as JSONContent;
}

/**
 * 反方向：写回数据库时的收窄。
 *
 * Tiptap 的 JSONContent 与数据库的 Json 在结构上是同一个东西，但 TS 证不出来
 * （JSONContent 带一个 `[key: string]: any` 索引签名）。这个函数把断言集中到一处，
 * 免得每个写入点各写一次 `as unknown as Json`。
 */
export function toJsonColumn(content: JSONContent | Record<string, unknown>): Json {
	return content as unknown as Json;
}
