import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { BASE_URL } from '$env/static/private';
import { getPagination } from '$lib/server/pagination';
import { deleteRows, parseIds } from '$lib/server/actions';

export const load: PageServerLoad = async ({ url, params: { page }, locals: { supabase } }) => {
	const { page: pageNumber, limit, from, to, path } = getPagination(url, page);

	const [{ data: comments, error: fetchError }, { count, error: countError }] = await Promise.all([
		supabase
			.from('comment')
			.select(
				`
	  id,
	  user_id (name),
	  name,
	  email,
	  website,
	  content_text,
	  is_public,
	  is_blocked,
	  is_anonymous,
	  created_at,
	  to_article (title, slug, language!inner (lang)),
	  to_photo (title, slug, language!inner (lang)),
	  to_thought (content_text, slug),
		ip_info
	`
			)
			.range(from, to)
			.order('is_public', { ascending: true })
			.order('created_at', { ascending: false }),
		supabase.from('comment').select('id', { count: 'exact', head: true })
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
		comments,
		count: count ?? 0,
		limit,
		path,
		baseUrl: BASE_URL
	};
};

/** 审核动作与它们对应的列改动。写在服务端，浏览器只能挑其中一个名字。 */
const MODERATION = {
	publish: { patch: { is_public: true }, done: '成功设为公开' },
	block: { patch: { is_blocked: true, is_public: false }, done: '成功封禁评论' },
	unblock: { patch: { is_blocked: false }, done: '成功解封评论' }
} as const;

type ModerationAction = keyof typeof MODERATION;

async function moderate(
	supabase: App.Locals['supabase'],
	request: Request,
	action: ModerationAction
) {
	const ids = parseIds(await request.formData());

	if (!ids) {
		return fail(400, { message: '请求缺少有效的 id。' });
	}

	const { data, error: updateError } = await supabase
		.from('comment')
		.update(MODERATION[action].patch)
		.in('id', ids)
		.select('id');

	if (updateError) {
		console.error('[comment] moderation failed:', updateError);
		return fail(500, { message: updateError.message });
	}

	// RLS 拒绝时 PostgREST 不报错，只是零行受影响——不看返回值就会提示"成功"
	if (!data || data.length === 0) {
		return fail(403, { message: '没有评论被更新，可能是权限不足或它已经不存在。' });
	}

	return { success: true, message: MODERATION[action].done };
}

export const actions: Actions = {
	// 通过审核。屏蔽时顺手把 is_public 也关掉：此前两个标记各改各的，
	// 一条评论可以同时是"已屏蔽"和"公开"，前台读到哪个取决于它查了哪一列。
	publish: ({ request, locals: { supabase } }) => moderate(supabase, request, 'publish'),
	block: ({ request, locals: { supabase } }) => moderate(supabase, request, 'block'),
	unblock: ({ request, locals: { supabase } }) => moderate(supabase, request, 'unblock'),

	delete: async ({ request, locals: { supabase } }) => {
		const ids = parseIds(await request.formData());

		if (!ids) {
			return fail(400, { message: '请求缺少有效的 id。' });
		}

		return deleteRows(supabase, 'comment', ids, '评论');
	}
};
