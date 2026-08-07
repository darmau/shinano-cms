import { error } from '@sveltejs/kit';
import type { TypedSupabaseClient } from '$lib/supabaseClient';

/**
 * 解析当前会话是否具备管理员角色。
 *
 * 出错时返回 false（fail closed）：解析不出角色就当作没有权限，
 * 否则数据库抖动会变成一次静默的权限放行。
 */
export async function resolveIsAdmin(supabase: TypedSupabaseClient): Promise<boolean> {
	const { data, error: rpcError } = await supabase.rpc('is_admin');

	if (rpcError) {
		console.error('Failed to resolve admin role', rpcError);
		return false;
	}

	return data === true;
}

/**
 * 在 API handler 内部再确认一次管理员身份。
 *
 * hooks.server.ts 的全局守卫已经拦住了所有 /api 路由，这里是纵深防御：
 * 将来往守卫的豁免名单里加一条路径时，不会静默地把端点暴露出去。
 * 复用 locals.isAdmin，正常路径下不产生额外的数据库往返。
 */
export async function requireAdmin(locals: App.Locals): Promise<void> {
	if (locals.isAdmin === true) {
		return;
	}

	if (!(await resolveIsAdmin(locals.supabase))) {
		error(403, 'Forbidden');
	}
}
