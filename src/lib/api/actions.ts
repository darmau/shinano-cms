import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

/**
 * 从事件处理函数里调用当前页面的 form action。
 *
 * 这些操作现在都在服务端（见 $lib/server/actions.ts），但触发它们的仍然是表格里
 * 的按钮，而不是一个真正的 <form>。这个函数负责把参数拼成 FormData、POST 到
 * action、再把 SvelteKit 的响应解回来。
 *
 * 之所以不直接把整张表改成 <form use:enhance>，是因为那要连带重做批量选择的
 * 交互；写操作先落回服务端是更要紧的事，表单化可以之后再做。
 */
export type CallActionResult = { ok: true } | { ok: false; message: string };

export async function callAction(
	action: string,
	payload: Record<string, string | number | Array<string | number>> = {}
): Promise<CallActionResult> {
	const body = new FormData();

	for (const [key, value] of Object.entries(payload)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				body.append(key, String(item));
			}
		} else {
			body.append(key, String(value));
		}
	}

	let result;

	try {
		const response = await fetch(action, { method: 'POST', body });
		result = deserialize(await response.text());
	} catch (err) {
		console.error('Action request failed:', err);
		return { ok: false, message: '请求失败，请检查网络后重试。' };
	}

	if (result.type === 'failure') {
		const message = result.data?.message;
		return { ok: false, message: typeof message === 'string' ? message : '操作失败。' };
	}

	if (result.type === 'error') {
		return { ok: false, message: result.error?.message ?? '操作失败。' };
	}

	if (result.type === 'redirect') {
		return { ok: true };
	}

	await invalidateAll();
	return { ok: true };
}
