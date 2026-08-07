/**
 * 编辑器用到的 AI / slug 端点的调用层。
 *
 * ArticleEditor 与 PhotoEditor 此前各自完整实现了这五个函数（合计约 300 行几乎
 * 逐字相同的代码），差别只有 type: 'article' | 'photo' 和读的是哪个 content 字段。
 *
 * 除了去重，这里还统一修掉了一个真实的坏行为：原来的写法是
 * `fetch(...).then((res) => res.text())`，**从不检查 res.ok**。端点返回 500 时，
 * SvelteKit 错误页的整段 HTML 会被当成结果写进 slug 输入框或摘要框。
 * 现在非 2xx 一律抛错，由调用方决定怎么提示。
 */

export class AiRequestError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'AiRequestError';
		this.status = status;
	}
}

async function postJson(path: string, body: unknown): Promise<Response> {
	const response = await fetch(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw new AiRequestError(`${path} 返回 ${response.status}`, response.status);
	}

	return response;
}

export type SlugCheckTarget = 'article' | 'photo';

export type SlugCheckResult = {
	available: boolean;
	/** 不可用时的原因，可直接展示 */
	message?: string;
};

export async function checkSlugAvailability(params: {
	type: SlugCheckTarget;
	langId: number;
	slug: string;
	contentId?: number | null;
}): Promise<SlugCheckResult> {
	const response = await postJson('/api/slug-check', {
		type: params.type,
		langId: params.langId,
		slug: params.slug,
		contentId: params.contentId ?? null
	});

	const payload = (await response.json()) as { error?: string };

	return payload.error ? { available: false, message: payload.error } : { available: true };
}

export async function requestSlug(title: string): Promise<string> {
	const response = await postJson('/api/slug', { title });
	return (await response.text()).trim();
}

export async function requestAbstract(content: string): Promise<string> {
	const response = await postJson('/api/abstract', { content });
	return await response.text();
}

export async function requestTags(content: string): Promise<string[]> {
	const response = await postJson('/api/tags', { content });
	const payload = (await response.json()) as { tags?: string[] };
	return payload.tags ?? [];
}

export async function requestTranslation(params: {
	/** 目标语言的 locale，例如 '简体中文' */
	lang: string;
	content: string;
}): Promise<string> {
	const response = await postJson('/api/translation', params);
	return await response.text();
}
