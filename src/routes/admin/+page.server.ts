import type { StatsRow } from '$lib/types/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const [{ count, error: unreadError }, { data: statsRows, error: statsError }] = await Promise.all(
		[
			supabase.from('message').select('id', { count: 'exact', head: true }).eq('is_read', false),
			supabase
				.from('stats')
				.select(
					'date, article_count, photo_count, thought_count, image_count, comment_count, message_count, user_count'
				)
				.order('date', { ascending: false })
				.limit(30)
		]
	);

	if (unreadError) console.error(unreadError);
	if (statsError) console.error(statsError);

	// stats 的每一列在库里都可空（快照没给 NOT NULL），而仪表盘的图表要的是数字。
	// 没有 date 的行没有任何意义，直接丢掉；计数缺失按 0 处理。
	const stats: StatsRow[] = (statsRows ?? [])
		.filter((row): row is typeof row & { date: string } => row.date !== null)
		.map((row) => ({
			date: row.date,
			article_count: row.article_count ?? 0,
			photo_count: row.photo_count ?? 0,
			thought_count: row.thought_count ?? 0,
			image_count: row.image_count ?? 0,
			comment_count: row.comment_count ?? 0,
			message_count: row.message_count ?? 0,
			user_count: row.user_count ?? 0
		}))
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	return {
		// authGuard 已经在放行这个请求之前解析过角色，这里直接复用，不再多打一次 RPC
		is_admin: locals.isAdmin ?? false,
		unread_message_count: count ?? 0,
		stats
	};
};
