import type { StatsRow } from '$lib/types/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: isAdmin, error: isAdminError }, { count, error: unreadError }, { data: statsRows, error: statsError }] =
		await Promise.all([
			supabase.rpc('is_admin'),
			supabase.from('message').select('id', { count: 'exact', head: true }).eq('is_read', false),
			supabase
				.from('stats')
				.select(
					'date, article_count, photo_count, thought_count, image_count, comment_count, message_count, user_count'
				)
				.order('date', { ascending: false })
				.limit(30)
		]);

	if (isAdminError) console.error(isAdminError);
	if (unreadError) console.error(unreadError);
	if (statsError) console.error(statsError);

	const stats: StatsRow[] = (statsRows ?? []).sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);

	return {
		is_admin: isAdmin ?? false,
		unread_message_count: count ?? 0,
		stats
	};
};
