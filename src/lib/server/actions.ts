import { fail, type ActionFailure } from '@sveltejs/kit';
import type { TypedSupabaseClient } from '$lib/supabaseClient';
import type { Database } from '$lib/types/database';

type TableName = keyof Database['public']['Tables'];

/**
 * 后台写操作的服务端落点。
 *
 * 此前 45 处 insert/update/delete 全部散在 22 个 .svelte 文件里，直连浏览器端
 * Supabase 客户端。这意味着**没有任何服务端校验**：能不能删、删什么，完全由
 * 浏览器发出的请求和 RLS 决定。而本轮审查里最严重的三个漏洞恰恰都出在 RLS 上
 * （见 CODE_REVIEW_PLAN.md 的 P0-1 / P0-2 / P0-5）。
 *
 * 走 form action 之后，删除请求要先经过 hooks.server.ts 的管理员守卫、再经过这里
 * 的参数校验，最后才轮到 RLS —— RLS 从"唯一防线"退回它应该在的位置：最后一道。
 */

/** form 里的 id 字段解析成正整数数组，任何一个不合法就整体拒绝 */
export function parseIds(formData: FormData, field = 'id'): number[] | null {
	const raw = formData.getAll(field);

	if (raw.length === 0) {
		return null;
	}

	const ids: number[] = [];

	for (const value of raw) {
		if (typeof value !== 'string') {
			return null;
		}

		const id = Number(value);
		if (!Number.isInteger(id) || id <= 0) {
			return null;
		}

		ids.push(id);
	}

	return ids;
}

export type ActionResult<T = { success: true }> = T | ActionFailure<{ message: string }>;

/**
 * 按 id 删除若干行。
 *
 * 刻意用 `.select('id')` 拿回真正被删掉的行：RLS 拒绝时 PostgREST 不报错，
 * 只是零行受影响。不看返回值的话，越权删除会得到一句"删除成功"。
 */
export async function deleteRows(
	supabase: TypedSupabaseClient,
	table: TableName,
	ids: number[],
	label = '内容'
): Promise<ActionResult> {
	const { data, error } = await supabase.from(table).delete().in('id', ids).select('id');

	if (error) {
		console.error(`[${table}] delete failed:`, error);
		return fail(500, { message: `删除${label}失败：${error.message}` });
	}

	if (!data || data.length === 0) {
		return fail(403, { message: `没有${label}被删除，可能是权限不足或它已经不存在。` });
	}

	if (data.length < ids.length) {
		return fail(403, {
			message: `只删除了 ${data.length} / ${ids.length} 项${label}，其余的权限不足或已不存在。`
		});
	}

	return { success: true };
}
