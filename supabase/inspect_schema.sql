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

-- ============================================================================
-- 以下几段服务于 P1（数据完整性 / 索引 / 类型清理）。
-- P1 的迁移全部写成了自适应形式，不跑这几段也能安全执行；
-- 但跑一遍能让你在应用迁移前就知道它到底会改什么。
-- ============================================================================

-- 5. 关键列的可空性与类型（P1-3 的 NOT NULL、P1-5 的 JSON→JSONB 都看这张表）
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name in ('article', 'photo') and column_name in ('title', 'slug', 'lang', 'category', 'is_draft', 'content_json', 'updated_at'))
    or (table_name = 'category' and column_name in ('lang', 'slug', 'title', 'type'))
    or (table_name = 'language' and column_name in ('lang', 'locale', 'is_default'))
    or (table_name = 'thought' and column_name in ('slug', 'content_json'))
    or (table_name = 'book' and column_name in ('title', 'rate'))
    or (table_name = 'image' and column_name in ('exif', 'date', 'taken_at', 'storage_key'))
    or (table_name = 'comment' and column_name in ('ip_info', 'content_json'))
    or (table_name = 'users' and column_name = 'current_ip')
    or (table_name in ('photo_image', 'thought_image'))
    or (table_name = 'stats' and column_name = 'date')
    or (table_name = 'message' and column_name = 'contact_type')
  )
order by table_name, column_name;

-- 6. 上述列里实际存在多少 NULL —— 若某列有 NULL，P1-3 的 SET NOT NULL 会失败并整体回滚。
--    迁移本身会给出同样的清单并 raise exception，这里只是让你能提前知道。
select 'article.title'    as col, count(*) as nulls from public.article  where title is null
union all select 'article.slug',     count(*) from public.article  where slug is null
union all select 'article.lang',     count(*) from public.article  where lang is null
union all select 'article.category', count(*) from public.article  where category is null
union all select 'photo.title',      count(*) from public.photo    where title is null
union all select 'photo.slug',       count(*) from public.photo    where slug is null
union all select 'photo.lang',       count(*) from public.photo    where lang is null
union all select 'photo.category',   count(*) from public.photo    where category is null
union all select 'category.lang',    count(*) from public.category where lang is null
union all select 'category.slug',    count(*) from public.category where slug is null
union all select 'category.title',   count(*) from public.category where title is null
union all select 'category.type',    count(*) from public.category where type is null
union all select 'language.lang',    count(*) from public.language where lang is null
union all select 'language.locale',  count(*) from public.language where locale is null
union all select 'language.is_default', count(*) from public.language where is_default is null
union all select 'thought.slug',     count(*) from public.thought  where slug is null
union all select 'book.title',       count(*) from public.book     where title is null
order by col;

-- 7. 现有索引（P1-4 要删掉冗余的、补上缺失的）
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 8. 触发器与函数定义原文（P1-3 要替换 manage_default_language / sync_new_user /
--    update_published_time —— 先确认生产库里的版本和 legacy/init_snapshot.sql 是否一致）
select
  t.tgname as trigger_name,
  c.relname as table_name,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'auth') and not t.tgisinternal
order by c.relname, t.tgname;

select pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'manage_default_language', 'sync_new_user', 'update_published_time',
    'is_admin', 'user_is_blocked', 'get_article_count_by_year', 'add_reaction'
  )
order by p.proname;

-- 9. 约束（确认 P1-5 要补的 CHECK 是否已经存在）
select
  rel.relname as table_name,
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public' and con.contype in ('c', 'u')
order by rel.relname, con.conname;
