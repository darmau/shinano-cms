import { error, json, redirect, type Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { sequence } from '@sveltejs/kit/hooks';
import { resolveIsAdmin } from '$lib/server/auth';
import type { Database } from '$lib/types/database';
import type { Session, User } from '@supabase/supabase-js';

const supabase: Handle = async ({ event, resolve }) => {
	const supabaseClient = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	event.locals.supabase = supabaseClient;

	// 每个请求只解析一次。此前 authGuard、根 layout 和 admin/+layout.server 各调一次
	// safeGetSession，也就是每次页面加载都有三趟 getUser() 网络往返。
	let sessionPromise: Promise<{ session: Session | null; user: User | null }> | null = null;

	const resolveSession = async () => {
		try {
			const {
				data: { user },
				error: userError
			} = await supabaseClient.auth.getUser();

			if (userError) {
				// 未登录（没 cookie / token 过期）是正常状态，不值得记；
				// 其余错误意味着 Supabase 侧出了问题，静默吞掉的话表现为
				// 无限跳回登录页且日志里什么都没有。
				if (userError.status !== 401 && userError.status !== 403) {
					console.error('[auth] getUser failed:', userError.message);
				}
				return { session: null, user: null };
			}

			if (!user) {
				return { session: null, user: null };
			}

			const {
				data: { session }
			} = await supabaseClient.auth.getSession();

			return { session, user };
		} catch (err) {
			console.error('[auth] session resolution threw:', err);
			return { session: null, user: null };
		}
	};

	event.locals.safeGetSession = () => {
		sessionPromise ??= resolveSession();
		return sessionPromise;
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session ?? undefined;
	event.locals.user = user ?? undefined;

	const { pathname } = event.url;
	const isApiRoute = pathname.startsWith('/api/');
	// 邮件确认回调必须对未登录访问开放，否则注册与找回密码无法完成
	const isPublicAuthRoute =
		pathname.startsWith('/api/auth') || pathname.startsWith('/auth/confirm');

	if (!event.locals.session) {
		if (isPublicAuthRoute) {
			return resolve(event);
		}

		if (pathname.startsWith('/auth/signup')) {
			// 自助注册默认关闭：这是单人后台，首个管理员已经存在，而开放注册意味着
			// 任何人都能拿到一个 session。需要重新引导账户时把 ALLOW_SIGNUP 设为 'true'。
			if (env.ALLOW_SIGNUP !== 'true') {
				return redirect(303, '/auth/login');
			}
			return resolve(event);
		}

		// API 调用方需要的是状态码。重定向到登录页会让 fetch 拿到一份 HTML，
		// 调用方通常会把它当成成功响应解析。
		if (isApiRoute) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!pathname.startsWith('/auth/login')) {
			return redirect(303, '/auth/login');
		}

		return resolve(event);
	}

	// 有 session 不等于被授权。后台与所有非 auth 的 API 都要求管理员角色。
	if (pathname.startsWith('/admin') || (isApiRoute && !isPublicAuthRoute)) {
		event.locals.isAdmin = await resolveIsAdmin(event.locals.supabase);

		if (!event.locals.isAdmin) {
			if (isApiRoute) {
				return json({ error: 'Forbidden' }, { status: 403 });
			}
			// 这里刻意不重定向：/auth/logout 的 load 会把 GET 请求送回 /admin，
			// 重定向过去就成了死循环。而且角色解析是 fail closed 的，一次数据库抖动
			// 不应该顺手把管理员的会话也清掉。
			error(403, 'Forbidden');
		}
	}

	if (pathname.startsWith('/auth') && !pathname.startsWith('/auth/logout')) {
		return redirect(303, '/admin');
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
