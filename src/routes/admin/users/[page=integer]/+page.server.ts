import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getPagination } from '$lib/server/pagination';
import { parseIds } from '$lib/server/actions';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const { page: pageNumber, limit, from, to, path } = getPagination(url, page);

	const [{ data: users, error: fetchError }, { count, error: countError }] = await Promise.all([
		supabase
			.from('users')
			.select('id, name, user_id, source, created_at, role')
			.range(from, to)
			.order('created_at', { ascending: false }),
		supabase.from('users').select('id', { count: 'exact', head: true })
	]);

	if (fetchError) {
		console.error(fetchError);
		error(500, { message: fetchError.message });
	}

	if (countError) {
		error(500, { message: countError.message });
	}

	return {
		page: pageNumber,
		users,
		count: count ?? 0,
		limit,
		path
	};
};

/**
 * 角色改动只允许在 reader 与 banned 之间切换。
 *
 * admin 刻意不在这个集合里：授予管理员是唯一能把整个 CMS 交出去的操作，
 * 不应该由后台列表里的一个按钮完成。数据库侧还有 prevent_privilege_escalation()
 * 触发器兜底（P0-1），这里是同一条规则在应用层的复述。
 */
const ASSIGNABLE_ROLES = ['reader', 'banned'] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const isAssignableRole = (value: unknown): value is AssignableRole =>
	typeof value === 'string' && (ASSIGNABLE_ROLES as readonly string[]).includes(value);

export const actions: Actions = {
	setRole: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const ids = parseIds(formData);
		const role = formData.get('role');

		if (!ids) {
			return fail(400, { message: '请求缺少有效的 id。' });
		}

		if (!isAssignableRole(role)) {
			return fail(400, { message: '只能把用户设为 reader 或 banned。' });
		}

		const { data, error: updateError } = await supabase
			.from('users')
			.update({ role })
			.in('id', ids)
			.select('id');

		if (updateError) {
			console.error('[users] role update failed:', updateError);
			return fail(500, { message: updateError.message });
		}

		if (!data || data.length === 0) {
			return fail(403, { message: '没有用户被更新，可能是权限不足或账号已不存在。' });
		}

		return { success: true };
	}
};
