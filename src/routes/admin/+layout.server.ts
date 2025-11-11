import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	let messageCount = 0;
	let commentCount = 0;

	if (session) {
		const supabase = locals.supabase;

		const [{ count: messages }, { count: comments }] = await Promise.all([
			supabase.from('message').select('id', { count: 'exact', head: true }).eq('is_read', false),
			supabase.from('comment').select('id', { count: 'exact', head: true }).eq('is_public', false)
		]);

		messageCount = messages ?? 0;
		commentCount = comments ?? 0;
	}

	return {
		session,
		user,
		message_count: messageCount,
		comment_count: commentCount
	};
};
