-- ============================================================================
-- P1-3 数据完整性修复
--
-- 对应 CODE_REVIEW_PLAN.md 的 P1-3。
--
-- 应用方式（二选一）：
--   1. pnpm db:push（推荐，见 supabase/README.md）
--   2. 粘贴进 Supabase SQL Editor 执行
--
-- 整个文件包在一个事务里，任何一句失败都会整体回滚；重复执行安全。
--
-- ⚠️ 与 P0 迁移同样的原则：不硬编码 schema 假设。
--    生产库与 legacy/init_snapshot.sql 已确认漂移，因此所有涉及列的操作都先查
--    information_schema 确认列存在、再决定做什么。缺列只会跳过并 raise notice，
--    不会让整个迁移失败。
--
-- ⚠️ 关于 SET NOT NULL：如果某列现存 NULL 值，本迁移**不会**强行加约束，
--    而是跳过该列并在末尾列出。这是刻意的——在不知道那些行该填什么的情况下
--    编造数据比留着 NULL 更糟。清理完数据后重新执行本文件即可补上。
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- P1-3.1 身份关键列补 NOT NULL
--
-- 为什么重要：UNIQUE(lang, slug) 对 NULL 不生效（SQL 语义里 NULL 永不等于 NULL），
-- 所以两篇 slug 都为 NULL 的文章可以共存，而路由是按 slug 找内容的。
-- 更隐蔽的是应用层：toArticleListItem 会静默丢弃 title/slug 为 null 的行，
-- 于是这些行留在库里却在后台完全看不见——既删不掉也改不了。
--
-- 先把能确定性回填的回填掉（category 有"默认分类"这个明确答案），剩下的只报告。
-- ---------------------------------------------------------------------------

-- article / photo 的 category 回填到同语言的默认分类。
-- 默认分类由 insert_default_categories() 在建语言时自动创建，slug 固定为 'default'。
do $$
begin
  if to_regclass('public.category') is not null then
    update public.article a
    set category = c.id
    from public.category c
    where a.category is null
      and a.lang is not null
      and c.lang = a.lang
      and c.type = 'article'
      and c.slug = 'default';

    update public.photo p
    set category = c.id
    from public.category c
    where p.category is null
      and p.lang is not null
      and c.lang = p.lang
      and c.type = 'photo'
      and c.slug = 'default';
  end if;
end;
$$;

-- language.is_default 的 NULL 在语义上就是 false，直接回填。
update public.language set is_default = false where is_default is null;
alter table public.language alter column is_default set default false;

do $$
declare
  target record;
  null_count bigint;
  skipped text[] := '{}';
  applied text[] := '{}';
begin
  for target in
    select *
    from (values
      ('article',  'title'),
      ('article',  'slug'),
      ('article',  'lang'),
      ('article',  'category'),
      ('photo',    'title'),
      ('photo',    'slug'),
      ('photo',    'lang'),
      ('photo',    'category'),
      ('category', 'lang'),
      ('category', 'slug'),
      ('category', 'title'),
      ('category', 'type'),
      ('language', 'lang'),
      ('language', 'locale'),
      ('language', 'is_default'),
      ('thought',  'slug'),
      ('book',     'title')
    ) as t(table_name, column_name)
  loop
    -- 列不存在（漂移）或已经是 NOT NULL：跳过
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = target.table_name
        and column_name = target.column_name
        and is_nullable = 'YES'
    ) then
      continue;
    end if;

    execute format(
      'select count(*) from public.%I where %I is null',
      target.table_name, target.column_name
    ) into null_count;

    if null_count > 0 then
      skipped := skipped || format('%s.%s (%s 行为 NULL)',
        target.table_name, target.column_name, null_count);
    else
      execute format('alter table public.%I alter column %I set not null',
        target.table_name, target.column_name);
      applied := applied || format('%s.%s', target.table_name, target.column_name);
    end if;
  end loop;

  if array_length(applied, 1) is not null then
    raise notice 'P1-3.1 已加上 NOT NULL：%', array_to_string(applied, ', ');
  end if;

  if array_length(skipped, 1) is not null then
    raise warning E'P1-3.1 以下列因为存在 NULL 值被跳过，清理数据后重新执行本迁移：\n  %',
      array_to_string(skipped, E'\n  ');
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-3.2 默认语言可被删空
--
-- 原实现在 BEFORE DELETE 里用 `ORDER BY id ASC LIMIT 1` 挑下一个默认语言，
-- 完全没有排除正在被删除的那一行。而"删掉的正是默认语言"恰恰是这个分支唯一会
-- 触发的场景，且默认语言通常就是 id 最小的那一行——于是它把 is_default 设回
-- 那条马上要消失的行，系统随即失去默认语言。
--
-- 后果具体而致命：/admin/article/new 的 .eq('is_default', true).single() 会因为
-- 零行而抛错，创建文章的入口直接崩掉。
-- ---------------------------------------------------------------------------

create or replace function public.manage_default_language()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.is_default is true then
    update public.language set is_default = false where id <> new.id and is_default is true;
    return new;
  end if;

  if tg_op = 'DELETE' and old.is_default is true then
    -- 关键修复：排除正在被删除的行。若这是最后一门语言，则不做任何事。
    update public.language
    set is_default = true
    where id = (
      select id from public.language
      where id <> old.id
      order by id asc
      limit 1
    );
    return old;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-3.3 首个用户成为 admin 存在竞态
--
-- 原实现先 `select count(*)`，再据此决定 role。两个并发注册可以都读到 0，
-- 于是两个人都成为 admin。概率低，但影响是"陌生人拿到管理员"。
--
-- 事务级 advisory lock 让这段判断串行化（锁在事务结束时自动释放，无需解锁）。
-- 顺带补 on conflict do nothing：Auth webhook 重放时不会再中断整个注册事务。
-- ---------------------------------------------------------------------------

create or replace function public.sync_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  count_users int;
  user_name_value text;
begin
  -- 同一时刻只允许一个注册事务走到这里
  perform pg_advisory_xact_lock(42);

  select count(*) into count_users from public.users;

  if new.raw_user_meta_data->>'name' is not null then
    user_name_value := new.raw_user_meta_data->>'name';
  else
    user_name_value := new.raw_user_meta_data->>'user_name';
  end if;

  insert into public.users (user_id, name, source, role)
  values (
    new.id,
    user_name_value,
    new.raw_app_meta_data->>'provider',
    case
      when count_users > 0 then 'reader'::public.role
      else 'admin'::public.role
    end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-3.4 published_at 可能为空
--
-- 原触发器只挂在 UPDATE 上，并且函数体直接读 OLD.is_draft。因此：
--   · 直接 INSERT 一行 is_draft = false 的内容，published_at 会留在 NULL，
--     它会掉出 `where is_draft = false` 的部分索引，前台按 published_at 排序时消失；
--   · 若将来给它挂上 INSERT，OLD 在 INSERT 时为 NULL，原函数会直接报错。
--
-- 改为 INSERT OR UPDATE 并按 TG_OP 分支。
-- ---------------------------------------------------------------------------

create or replace function public.update_published_time()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_draft is false and new.published_at is null then
      new.published_at := now();
    end if;
    return new;
  end if;

  -- UPDATE：草稿 → 发布
  if new.is_draft is false and old.is_draft is true then
    if new.published_at is null then
      new.published_at := now();
    end if;
  -- 发布 → 撤回
  elsif new.is_draft is true and old.is_draft is false then
    new.published_at := null;
  end if;

  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['article', 'photo'] loop
    if to_regclass('public.' || tbl) is null then
      raise notice 'P1-3.4 跳过 %：表不存在', tbl;
      continue;
    end if;

    execute format('drop trigger if exists check_%s_update_time on public.%I', tbl, tbl);
    execute format(
      'create trigger check_%s_update_time
         before insert or update on public.%I
         for each row execute function public.update_published_time()',
      tbl, tbl
    );
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- P1-3.5 updated_at 由浏览器时钟决定
--
-- 后台列表按 updated_at 排序，而这个值目前是编辑器在浏览器里 new Date() 算出来
-- 再发过来的：客户端时钟偏几分钟，列表顺序就是错的；任何忘记赋值的写路径
-- （例如 thought 的保存）则会留下永远陈旧的值。
--
-- 这里不用 moddatetime 扩展，而是自己写一个触发器，原因是要排除访客侧的写入：
-- add_reaction() 和 page_view 自增都是 UPDATE，用 moddatetime 的话，
-- 一个陌生人点个表情就能把三年前的文章顶到后台列表最前面。
--
-- 用 to_jsonb(new) - '...' 的写法而不是逐列比较，是为了不依赖具体列名——
-- 生产库与快照文件已经漂移过，列名清单不可信。
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'updated_at' - 'page_view' - 'reactions')
     is distinct from
     (to_jsonb(old) - 'updated_at' - 'page_view' - 'reactions')
  then
    new.updated_at := now();
  else
    -- 只有访客计数变化：保持原值，不让内容在后台列表里跳位
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['article', 'photo', 'thought'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl and column_name = 'updated_at'
    ) then
      raise notice 'P1-3.5 跳过 %：没有 updated_at 列', tbl;
      continue;
    end if;

    execute format('alter table public.%I alter column updated_at set default now()', tbl);

    -- 回填历史 NULL：优先沿用 created_at，没有这一列就退到 now()
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl and column_name = 'created_at'
    ) then
      execute format(
        'update public.%I set updated_at = coalesce(created_at, now()) where updated_at is null',
        tbl
      );
    else
      execute format('update public.%I set updated_at = now() where updated_at is null', tbl);
    end if;

    execute format('alter table public.%I alter column updated_at set not null', tbl);

    execute format('drop trigger if exists set_updated_at on public.%I', tbl);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()',
      tbl
    );
  end loop;
end;
$$;

commit;

-- ============================================================================
-- 对应用层的影响
--
-- 1. 编辑器不再需要（也不应该）自己发 updated_at —— 触发器会覆盖它。
--    ArticleEditor.svelte / PhotoEditor.svelte 里的客户端赋值已在同一提交中删除。
--
-- 2. 若 P1-3.1 的 warning 里出现了 article.category / photo.category，
--    说明有内容所属语言没有 slug='default' 的默认分类。到 /admin/category
--    给对应语言建一个，或手工把这些行改到已有分类，然后重跑本迁移。
--
-- 3. article.category 变成 NOT NULL 之后，新建文章时必须选分类。
--    ArticleEditor 已改为默认选中列表里的第一个分类，避免用户撞上数据库报错。
-- ============================================================================
