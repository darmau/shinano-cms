-- ============================================================================
-- P0 安全修复
--
-- 对应 CODE_REVIEW_PLAN.md 的 P0-1 / P0-2 / P0-5 及 P0-7 的一部分。
--
-- 应用方式（二选一）：
--   1. 粘贴进 Supabase SQL Editor 执行
--   2. psql "$SUPABASE_DB_URL" -f supabase/migrations/20260807000000_p0_security_fixes.sql
--
-- 整个文件包在一个事务里，任何一句失败都会整体回滚。
--
-- ⚠️ 本文件刻意不硬编码列名。
--    src/migration/init.sql 已经与生产库漂移（例如它声明了 comment.upvote /
--    downvote，而生产库没有这两列），因此凡是涉及列清单的地方都改成从
--    information_schema 实时读取。这样无论生产库的实际形态如何都能执行。
--
-- ⚠️ 本文件收紧了 anon 角色对 comment / users 两张表的列权限。
--    如果公开站点（前台）用 `select=*` 读取这两张表，需要同步改成显式列清单，
--    否则前台会收到 42501 权限错误。详见文件末尾的"对前台的影响"。
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- P0-1【CRITICAL】任何登录用户可把自己的 role 改成 admin
--
-- "Update User Info" 策略只做了行级限定（auth.uid() = user_id），没有列级限定，
-- 而 users.role 就在这一行里。Supabase 默认把 public schema 的 UPDATE 授予
-- authenticated，因此 PostgREST 接受对 role 列的直接写入：
--     PATCH /rest/v1/users?user_id=eq.<自己的uid>  {"role":"admin"}
-- 而全系统所有授权判断都走 is_admin() 读这一列。
--
-- 这里用触发器而不是列级 GRANT，因为管理员本身也是 authenticated 角色：
-- 撤销表级 UPDATE 权限会连带让管理员无法在后台管理用户角色。
-- 触发器能区分"谁在改"，列级 GRANT 不能。
-- ---------------------------------------------------------------------------

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Insufficient privileges: role can only be changed by an admin'
      using errcode = '42501';
  end if;

  -- user_id 是指向 auth.users 的身份锚点，非管理员不得改动
  if new.user_id is distinct from old.user_id and not public.is_admin() then
    raise exception 'Insufficient privileges: user_id is immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_user_privileges on public.users;
create trigger guard_user_privileges
  before update on public.users
  for each row
  execute function public.prevent_privilege_escalation();

-- 注：sync_new_user() 走的是 INSERT，不受本触发器影响，
-- 首个用户自动成为 admin 的引导逻辑保持不变。


-- ---------------------------------------------------------------------------
-- P0-2【CRITICAL】任何发过评论的用户可删除全站评论
--
-- user_is_comment_owner() 的函数体只查询"该用户是否拥有任意一条评论"，
-- 从不引用正在被删除的那一行，因此 FOR DELETE USING (...) 对所有行都返回 true。
-- ---------------------------------------------------------------------------

drop policy if exists "Delete Their Own Comments" on public.comment;
drop function if exists public.user_is_comment_owner();

create policy "Delete Their Own Comments" on public.comment
for delete to authenticated
using (
  user_id in (
    select id from public.users where user_id = (select auth.uid())
  )
);


-- ---------------------------------------------------------------------------
-- P0-5【HIGH】评论者 PII（email / ip / ip_info）与用户 current_ip 全世界可读
--
-- 两处问题：
--   1. 行级过滤用的是 is_blocked 而不是 is_public，导致尚未审核通过的匿名评论
--      对匿名访客可读（set_comment_is_public 会把新匿名评论强制设为
--      is_public = false，后台正是按此把它们当作待审核）。
--   2. RLS 是行级的，一旦某行可读，它的**每一列**都可读。任何人拿页面 bundle
--      里的公开 anon key 执行 GET /rest/v1/comment?select=email,ip,ip_info
--      就能完整导出评论者 PII。
--
-- 行级用策略修，列级只能用 GRANT 修。
-- ---------------------------------------------------------------------------

drop policy if exists "List All Comments" on public.comment;
drop policy if exists "List All Comments for Authenticated" on public.comment;

create policy "List public comments" on public.comment
for select to anon
using (is_public and not is_blocked);

-- 登录用户看到的行与匿名一致；管理员额外看到待审核和被屏蔽的评论
create policy "List comments for authenticated" on public.comment
for select to authenticated
using ((is_public and not is_blocked) or public.is_admin());

-- 列级权限：用「敏感列黑名单」而不是「安全列白名单」。
--
-- 白名单需要预先知道全部列名，而 init.sql 已经不可信；黑名单只需要知道哪些列
-- 是敏感的（这一点是确定的），其余列照常放行，因此不会因为漏列而误伤前台。
-- 代价是将来新增的列会默认对 anon 可读 —— 新增敏感列时要记得回来补进黑名单。
do $$
declare
  comment_cols text;
  users_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into comment_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'comment'
    and column_name not in ('email', 'ip', 'ip_info', 'toxic_score', 'receive_notification');

  if comment_cols is null then
    raise exception 'public.comment 不存在或没有可授权的列';
  end if;

  execute 'revoke select on public.comment from anon';
  execute format('grant select (%s) on public.comment to anon', comment_cols);

  -- users 同理：anon 不需要看到 current_ip / source / role，也不需要看到
  -- auth UUID（它会让攻击者先枚举出管理员是谁，再实施 P0-1 那类攻击）
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into users_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'users'
    and column_name not in ('current_ip', 'source', 'role', 'user_id');

  if users_cols is null then
    raise exception 'public.users 不存在或没有可授权的列';
  end if;

  execute 'revoke select on public.users from anon';
  execute format('grant select (%s) on public.users to anon', users_cols);
end $$;

-- authenticated 保留完整列权限：后台评论审核页需要读 email 与 ip_info
-- （src/routes/admin/comment/[page=integer]/+page.server.ts）。
-- 残留风险：非管理员的登录用户仍能读到公开评论的 PII 列。彻底修复需要把后台
-- 改成走 SECURITY DEFINER 的管理员视图，已记入 CODE_REVIEW_PLAN.md 的 P1。
-- 在 P0-4 关闭自助注册后，实际上不存在非管理员账户，故按 P1 处理。


-- ---------------------------------------------------------------------------
-- P0-7【HIGH】匿名评论插入无任何约束
--
-- "Anon User Can Comment" 的 with check (true) 允许匿名访客：
--   - 把 user_id 设成任意已注册用户的 id（冒充他人发言）
--   - 预置点赞/点踩计数刷票
--   - 自设 is_blocked = false 绕过屏蔽
--   - 提交任意长度的正文
--
-- 约束条件按实际存在的列拼装：不同版本的 schema 里计数字段可能是
-- upvote/downvote 两列，也可能已经被 reactions JSONB 取代。
-- ---------------------------------------------------------------------------

drop policy if exists "Anon User Can Comment" on public.comment;

do $$
declare
  guard text := 'user_id is null';
  has_col boolean;
begin
  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='comment' and column_name='upvote')
    into has_col;
  if has_col then
    guard := guard || ' and coalesce(upvote, 0) = 0';
  end if;

  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='comment' and column_name='downvote')
    into has_col;
  if has_col then
    guard := guard || ' and coalesce(downvote, 0) = 0';
  end if;

  -- reactions 若存在（738531d 引入的计数字段），匿名插入必须交出空计数。
  -- 用 ::text 比较而不是 = ，因为 json 类型根本没有等值运算符，
  -- 而这一列在 jsonb 和 json 之间可能是任意一种。
  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='comment' and column_name='reactions')
    into has_col;
  if has_col then
    guard := guard || ' and (reactions is null or reactions::text in (''{}'', ''null''))';
  end if;

  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='comment' and column_name='is_blocked')
    into has_col;
  if has_col then
    guard := guard || ' and coalesce(is_blocked, false) = false';
  end if;

  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='comment' and column_name='toxic_score')
    into has_col;
  if has_col then
    guard := guard || ' and toxic_score is null';
  end if;

  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='comment' and column_name='content_text')
    into has_col;
  if has_col then
    guard := guard || ' and content_text is not null and length(content_text) <= 5000';
  end if;

  execute format(
    'create policy "Anon User Can Comment" on public.comment for insert to anon with check (%s)',
    guard
  );

  raise notice '匿名评论插入约束已应用: %', guard;
end $$;


-- ---------------------------------------------------------------------------
-- P0-7【MEDIUM】gallery_feed 视图绕过 RLS
--
-- 视图创建时未指定 security_invoker，PG 15+ 会以视图所有者（postgres）的权限
-- 执行，photo / thought / image 上的 RLS 完全不生效。目前因为视图自身硬编码了
-- WHERE is_draft = false 而没有造成泄露，但任何对 WHERE 的改动都会静默泄露草稿。
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'gallery_feed') then
    execute 'alter view public.gallery_feed set (security_invoker = on)';
  else
    raise notice 'public.gallery_feed 不存在，跳过 security_invoker 设置';
  end if;
end $$;


commit;

-- ============================================================================
-- 应用后的验证清单
--
-- 1. P0-1：用非管理员账户的 access token 执行
--      curl -X PATCH "$SUPABASE_URL/rest/v1/users?user_id=eq.<该用户uid>" \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer <该用户token>" \
--        -H "Content-Type: application/json" -d '{"role":"admin"}'
--    预期：42501 权限错误。管理员在后台改角色仍应成功。
--
-- 2. P0-2：用户 A 与 B 各发一条评论，以 A 的身份删除 B 的评论应返回 0 行。
--
-- 3. P0-5：用**匿名** anon key 执行
--      curl "$SUPABASE_URL/rest/v1/comment?select=email" -H "apikey: $ANON_KEY"
--    预期：42501 权限错误。
--      curl "$SUPABASE_URL/rest/v1/comment?select=id,name,content_text" ...
--    预期：只返回 is_public = true 且未被屏蔽的评论。
--
-- 4. 后台 /admin/comment/1 仍能正常显示邮箱与 IP 归属地。
--
-- 5. 前台评论列表与评论提交功能正常。
--
--
-- 对前台（公开站点）的影响
--
-- - comment：若前台用 `select=*` 读评论，改成显式列清单。
--   另外前台现在只能读到 is_public = true 的评论——这本来就是期望行为，
--   但如果前台此前依赖"评论提交后立即显示"，匿名评论会因为待审核而不再立即出现。
-- - users：anon 不再能读 current_ip / source / role / user_id。
-- ============================================================================
