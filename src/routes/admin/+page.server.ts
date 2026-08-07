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

	const stats: StatsRow[] = (statsRows ?? []).sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);

	return {
		// authGuard 已经在放行这个请求之前解析过角色，这里直接复用，不再多打一次 RPC
		is_admin: locals.isAdmin ?? false,
		unread_message_count: count ?? 0,
		stats
	};
};
