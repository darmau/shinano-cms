-- ============================================================================
-- 只读探查脚本：导出生产库的真实形态
--
-- src/migration/init.sql 已与生产库漂移（它声明了 comment.upvote / downvote，
-- 而生产库没有这两列），所以在写任何后续迁移之前，先用这个脚本拿到事实。
--
-- 用法：粘贴进 Supabase SQL Editor 执行，把四段结果贴回来。
-- 全部是 SELECT，不修改任何数据。
-- ============================================================================

-- 1. 核心表的实际列
select
  table_name,
  string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in ('comment', 'users', 'article', 'photo', 'thought', 'image', 'config')
group by table_name
order by table_name;

-- 2. 现有的 RLS 策略（这是 P0 修复的真正战场）
select
  tablename,
  policyname,
  cmd,
  roles::text,
  qual as using_expr,
  with_check as check_expr
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. 现有的自定义函数（确认 is_admin / user_is_comment_owner 等是否存在、
--    以及有没有 SECURITY DEFINER 却没设 search_path 的）
select
  p.proname as function_name,
  case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security,
  coalesce(array_to_string(p.proconfig, ', '), '(未设置 search_path)') as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- 4. 视图及其 security_invoker 设置（gallery_feed 相关）
select
  c.relname as view_name,
  coalesce(array_to_string(c.reloptions, ', '), '(无选项 → 等同 SECURITY DEFINER)') as options
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
order by c.relname;
