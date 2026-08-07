-- ============================================================================
-- P1-5 类型修正与函数清理
--
-- 对应 CODE_REVIEW_PLAN.md 的 P1-5。
--
-- 整个文件包在一个事务里，重复执行安全。
--
-- ⚠️ 类型转换（JSON → JSONB、TEXT → INET）可能被依赖该列的视图挡住，也可能被
--    脏数据挡住。这类操作全部单独包在 exception block 里：失败只跳过该列并
--    raise warning，不会让整个迁移回滚。生产库里存在快照文件中没有的视图
--    （random_{en,jp,zh}_photos），所以不能假设依赖关系。
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- P1-5.1 JSON → JSONB
--
-- JSON 类型存的是原始文本：每次读取都要重新解析整篇文档，且不能建索引、
-- 不支持 -> 之外的运算符。get_photo_map_geojson 目前每行都要重新解析一遍 exif。
-- JSONB 存解析后的二进制形式，读取零解析开销。
--
-- 代价是写入时多一次解析、且不保留键序和空白——对这里的用途都无所谓。
-- content_json 是写多读少的 Tiptap 状态，收益最小，但统一类型省得以后再想。
-- ---------------------------------------------------------------------------

do $$
declare
  target record;
  failed text[] := '{}';
  converted text[] := '{}';
begin
  for target in
    select *
    from (values
      ('article', 'content_json'),
      ('photo',   'content_json'),
      ('thought', 'content_json'),
      ('comment', 'content_json'),
      ('comment', 'ip_info'),
      ('image',   'exif')
    ) as t(tbl, col)
  loop
    -- 列不存在（漂移）或已经是 jsonb：跳过
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target.tbl
        and column_name = target.col and data_type = 'json'
    ) then
      continue;
    end if;

    begin
      execute format(
        'alter table public.%I alter column %I type jsonb using %I::jsonb',
        target.tbl, target.col, target.col
      );
      converted := converted || format('%s.%s', target.tbl, target.col);
    exception when others then
      failed := failed || format('%s.%s（%s）', target.tbl, target.col, sqlerrm);
    end;
  end loop;

  if array_length(converted, 1) is not null then
    raise notice 'P1-5.1 已转为 JSONB：%', array_to_string(converted, ', ');
  end if;
  if array_length(failed, 1) is not null then
    raise warning E'P1-5.1 以下列转换失败（通常是被视图依赖，需先 drop view）：\n  %',
      array_to_string(failed, E'\n  ');
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-5.2 users.current_ip TEXT → INET
--
-- comment.ip 已经是 INET，users.current_ip 却是 TEXT——同一个概念两种类型，
-- 没法跨表比较，也拿不到 INET 的格式校验和网段运算。
-- 转换用 nullif + 正则兜底：转不动的值置 NULL 而不是让迁移失败。
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
      and column_name = 'current_ip' and data_type = 'text'
  ) then
    begin
      -- 先把明显不是 IP 的值清成 NULL，避免整列转换失败
      update public.users
      set current_ip = null
      where current_ip is not null
        and current_ip !~ '^[0-9a-fA-F:.]+(/[0-9]+)?$';

      alter table public.users
        alter column current_ip type inet using nullif(current_ip, '')::inet;

      raise notice 'P1-5.2 users.current_ip 已转为 INET';
    exception when others then
      raise warning 'P1-5.2 users.current_ip 转换失败，保持 TEXT：%', sqlerrm;
    end;
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-5.3 is_admin() / user_is_blocked() 改为 SQL STABLE
--
-- 这两个函数当前是 VOLATILE 的 plpgsql（plpgsql 函数默认 VOLATILE）。它们出现在
-- 十几条 RLS 策略里，而 VOLATILE 意味着规划器**每一行**都要重新调用一次，
-- 每次调用又是一次对 users 表的查询。
--
-- 改成 language sql + stable 之后：函数可以被内联，且同一条语句内结果可复用。
-- 下面 P1-5.4 再把策略里的调用包成 (select ...) 子查询，让它变成 InitPlan——
-- 整条语句只算一次。
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.user_is_blocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where user_id = (select auth.uid()) and role = 'banned'
  );
$$;


-- ---------------------------------------------------------------------------
-- P1-5.4 把策略里的 is_admin() 包成 (select ...)
--
-- Postgres 对 RLS 表达式里的 `(select f())` 会提升为 InitPlan：整条语句求值一次。
-- 直接写 `f()` 则是每行一次。这是 Supabase 官方 RLS 性能指南的头号建议。
--
-- 策略是按 pg_policies 里的实际定义原地重建的，不硬编码任何策略名或表名——
-- 生产库里有哪些策略、叫什么名字，以库为准。
-- ---------------------------------------------------------------------------

do $$
declare
  pol record;
  new_qual text;
  new_check text;
  stmt text;
  rebuilt text[] := '{}';
begin
  for pol in
    select
      p.tablename,
      p.policyname,
      p.permissive,
      p.roles,
      p.cmd,
      p.qual,
      p.with_check
    from pg_policies p
    where p.schemaname = 'public'
      and (p.qual like '%is_admin%' or p.with_check like '%is_admin%')
      -- 已经写成子查询形式的跳过，避免套娃
      and coalesce(p.qual, '') !~* 'select[^)]*is_admin'
      and coalesce(p.with_check, '') !~* 'select[^)]*is_admin'
  loop
    new_qual  := regexp_replace(pol.qual,       '(public\.)?is_admin\(\)', '( select public.is_admin() )', 'g');
    new_check := regexp_replace(pol.with_check, '(public\.)?is_admin\(\)', '( select public.is_admin() )', 'g');

    stmt := format(
      'create policy %I on public.%I as %s for %s to %s',
      pol.policyname,
      pol.tablename,
      case when pol.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      pol.cmd,
      array_to_string(pol.roles, ', ')
    );

    if new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;

    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
    execute stmt;
    rebuilt := rebuilt || format('%s / %s', pol.tablename, pol.policyname);
  end loop;

  if array_length(rebuilt, 1) is not null then
    raise notice E'P1-5.4 已重建策略（is_admin() → (select is_admin())）：\n  %',
      array_to_string(rebuilt, E'\n  ');
  else
    raise notice 'P1-5.4 没有需要重建的策略';
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-5.5 insert_default_categories() 在生产库里是坏的
--
-- 【本轮新发现，原审查未覆盖】
-- 函数体设了 search_path = '' 却用了不带 schema 的 `INSERT INTO category`，
-- 于是它必然抛 "relation \"category\" does not exist"。这个函数挂在 language 表的
-- AFTER INSERT 上——也就是说**新增语言这个操作在生产库里是直接失败的**，
-- 而多语言正是这个 CMS 的核心功能。
--
-- 同类问题在 manage_default_language() 里也有（`UPDATE language`），
-- 已在 20260807010000_p1_data_integrity.sql 里随修复一并限定。
--
-- 顺带补 on conflict do nothing：语言表已有默认分类时重复建不再中断事务。
-- ---------------------------------------------------------------------------

create or replace function public.insert_default_categories()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.category (lang, title, description, type, slug)
  values (new.id, 'Default', 'Default category', 'article', 'default')
  on conflict do nothing;

  insert into public.category (lang, title, description, type, slug)
  values (new.id, 'Default', 'Default category', 'photo', 'default')
  on conflict do nothing;

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-5.6 get_article_count_by_year 把草稿也算进去了
--
-- 它按 published_at 的年份分组，而草稿的 published_at 是 NULL，
-- 于是前台的归档年份列表里会出现一行 year = NULL 的"幽灵年份"，
-- 计数也把未发布内容算了进去。
-- ---------------------------------------------------------------------------

create or replace function public.get_article_count_by_year(lang_name text)
returns table (year text, count bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  lang_id integer;
begin
  select id into lang_id from public.language where lang = lang_name;

  if lang_id is null then
    return;
  end if;

  return query
  select
    extract(year from a.published_at)::text as year,
    count(a.id)::bigint as count
  from public.article a
  where a.lang = lang_id
    and a.is_draft = false
    and a.published_at is not null
  group by extract(year from a.published_at)
  order by year desc;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-5.7 缺失的约束与默认值
-- ---------------------------------------------------------------------------

-- book.rate：界面上是 1–5 星，数据库却接受任意 smallint（包括负数）。
-- 有越界数据时只警告不加约束，避免迁移整体失败。
do $$
declare
  bad bigint;
begin
  if to_regclass('public.book') is null then
    return;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.book'::regclass and conname = 'book_rate_range'
  ) then
    return;
  end if;

  select count(*) into bad from public.book where rate is not null and (rate < 1 or rate > 5);

  if bad > 0 then
    raise warning 'P1-5.7 book.rate 有 % 行超出 1–5，跳过 CHECK 约束', bad;
  else
    alter table public.book add constraint book_rate_range check (rate is null or rate between 1 and 5);
    raise notice 'P1-5.7 已加 book_rate_range';
  end if;
end;
$$;

-- stats.date 默认值：原本是 NOW()（timestamptz）隐式转成 date，
-- 依赖服务器时区。CURRENT_DATE 表达的就是"今天"这个意图。
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stats' and column_name = 'date'
  ) then
    alter table public.stats alter column date set default current_date;
  end if;
end;
$$;

-- message.contact_type：补默认值与 NOT NULL。
-- 不加 CHECK / 枚举——允许哪些联系方式是产品决策，且这张表由公开站点写入，
-- 猜错取值集合会让访客留言直接失败。留给做留言表单时一并定。
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'message'
      and column_name = 'contact_type' and is_nullable = 'YES'
  ) then
    update public.message set contact_type = 'email' where contact_type is null;
    alter table public.message alter column contact_type set default 'email';
    alter table public.message alter column contact_type set not null;
    raise notice 'P1-5.7 message.contact_type 已补 default + NOT NULL';
  end if;
end;
$$;

-- image.storage_key 的默认值改用内置的 gen_random_uuid()。
-- 原本是 uuid_generate_v4()，来自 uuid-ossp 扩展——而快照文件里从未创建过它，
-- 这个默认值一直悬在一个可能不存在的扩展上。gen_random_uuid() 是 PG13+ 内置的。
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'image' and column_name = 'storage_key'
  ) then
    alter table public.image alter column storage_key set default gen_random_uuid();
  end if;
end;
$$;

commit;

-- ============================================================================
-- 本轮**没有**做的 P1-5 项，以及原因：
--
-- · photo_image."order" → sort_order 改名 + UNIQUE(photo_id, sort_order)
--   改名会同时打断 gallery_feed 视图、PhotoEditor 与 thought 编辑器的写入路径，
--   而 P2-3（把"先删后插"改成单事务 RPC）本来就要重写这条路径。两件事一起做
--   只需要改一次调用方，分开做要改两次，且中间那次是半成品状态。
--
-- · image.date TEXT 与 taken_at TIMESTAMPTZ 二选一
--   /api/image 目前仍在写 date（一个格式化好的日期字符串），删列会直接打断上传。
--   要先把写入方改成只写 taken_at，确认前台不再读 date，才能删。
--
-- · message.contact_type 的 CHECK / 枚举
--   见上方说明：取值集合是产品决策，猜错会让访客留言失败。
--
-- · config 表迁移到 Supabase Vault
--   RLS 目前是 admin-only（P0 已核实正确），不是漏洞而是加固。Vault 会改变
--   所有读取密钥的服务端代码路径，值得单独做一轮。
--
-- · 合并重复的 anon / authenticated SELECT 策略
--   纯整洁性收益，而每一次改 RLS 都是一次引入漏洞的机会。P0 刚重写过这些策略，
--   不在没有 RLS 测试（P4-1）的情况下再动它们。
-- ============================================================================
