-- ============================================================================
-- P1-4 索引优化
--
-- 对应 CODE_REVIEW_PLAN.md 的 P1-4。
--
-- 三件事：把用错类型的索引换掉、补上缺失的（尤其是无索引的外键）、删掉纯负担的。
-- 整个文件包在一个事务里，重复执行安全。
--
-- ⚠️ 删除部分不按索引名匹配。init.sql 里的索引全是 `CREATE INDEX ON t (c)` 这种
--    不指定名字的写法，实际名字由 Postgres 生成，而生产库与快照文件已确认漂移，
--    名字未必是 <表>_<列>_idx。所以这里按「表 + 列组合」在 pg_index 里精确定位，
--    并显式排除主键、唯一约束背后的索引和部分索引（published_at 那两个要留着）。
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- P1-4.1 topic 的 B-tree 换成 GIN
--
-- topic 是 TEXT[]。B-tree 在数组上只能支持整个数组的相等/排序比较，而实际查询
-- 一定是「包含某个话题」（@> / &&），这类查询用不上 B-tree，只能全表扫。
-- GIN 是数组包含查询的正确索引类型。
-- ---------------------------------------------------------------------------

create index if not exists article_topic_gin_idx on public.article using gin (topic);

-- photo.topic 同为 TEXT[]，此前完全没有索引，一并补上
create index if not exists photo_topic_gin_idx on public.photo using gin (topic);


-- ---------------------------------------------------------------------------
-- P1-4.2 补上缺失的索引
--
-- 前三条是**无索引的外键**。Postgres 不会为外键自动建索引，而删除被引用行时
-- 必须回扫引用方来执行级联/置空——没有索引就是全表扫。ImageGrid 支持批量删图片，
-- 每删一张都要扫一遍 photo_image 和 thought_image。
--
-- 后四条匹配后台列表的真实查询形态：where <过滤列> = ? order by <时间列> desc。
-- 单列索引在这种查询下只能用于过滤，排序仍要走一次 sort；复合索引可以直接
-- 按索引顺序取前 N 行。
-- ---------------------------------------------------------------------------

create index if not exists photo_image_image_id_idx   on public.photo_image (image_id);
create index if not exists thought_image_image_id_idx on public.thought_image (image_id);
create index if not exists comment_reply_to_idx       on public.comment (reply_to);

create index if not exists article_lang_updated_at_idx on public.article (lang, updated_at desc);
create index if not exists photo_lang_updated_at_idx   on public.photo (lang, updated_at desc);
create index if not exists comment_is_public_created_at_idx on public.comment (is_public, created_at desc);
create index if not exists message_is_read_created_at_idx   on public.message (is_read, created_at desc);


-- ---------------------------------------------------------------------------
-- P1-4.3 删除纯负担的索引
--
-- 每个索引都要在每次写入时维护，还占内存和磁盘。以下几类完全不划算：
--
--   · thought_image(thought_id) / photo_image(photo_id)
--     与主键 (thought_id, image_id) / (photo_id, image_id) 的前导列重复，
--     主键索引已经能服务所有以该列为前缀的查询。
--
--   · article(is_draft) / photo(is_draft)
--     布尔列只有两个值，选择性极低，规划器基本不会选它；
--     而 published_at 的部分索引（where is_draft = false）已经覆盖了真正有用的场景。
--
--   · image(date)
--     date 是 TEXT 列且与 taken_at 重复（见 P1-5），应用从不按它查询或排序。
--
--   · category(title)
--     应用只按 (lang, type) 列分类、按 slug 查找，从不按 title 检索。
-- ---------------------------------------------------------------------------

do $$
declare
  target record;
  idx record;
  dropped text[] := '{}';
begin
  for target in
    select *
    from (values
      ('thought_image', array['thought_id']),
      ('photo_image',   array['photo_id']),
      ('article',       array['is_draft']),
      ('photo',         array['is_draft']),
      ('image',         array['date']),
      ('category',      array['title'])
    ) as t(tbl, cols)
  loop
    for idx in
      select ic.relname as index_name
      from pg_index i
      join pg_class c  on c.oid = i.indrelid
      join pg_class ic on ic.oid = i.indexrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target.tbl
        and not i.indisprimary
        and not i.indisunique
        and i.indpred is null                    -- 排除部分索引（published_at 的要留着）
        and not exists (                          -- 排除约束背后的索引
          select 1 from pg_constraint con where con.conindid = i.indexrelid
        )
        and 0 <> all (i.indkey::int2[])                   -- 排除表达式索引
        and (
          select array_agg(a.attname::text order by k.ord)
          from unnest(i.indkey::int2[]) with ordinality as k(attnum, ord)
          join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
        ) = target.cols
    loop
      execute format('drop index public.%I', idx.index_name);
      dropped := dropped || format('%s(%s) → %s',
        target.tbl, array_to_string(target.cols, ', '), idx.index_name);
    end loop;
  end loop;

  if array_length(dropped, 1) is not null then
    raise notice E'P1-4.3 已删除冗余索引：\n  %', array_to_string(dropped, E'\n  ');
  else
    raise notice 'P1-4.3 没有找到匹配的冗余索引（可能已经删过了）';
  end if;
end;
$$;

-- 旧的 article(topic) B-tree 单独处理：GIN 已在上面建好，这里删掉 B-tree 版本。
-- 放在最后是为了确保新索引先存在，中途失败时不会留下"两个都没有"的窗口。
do $$
declare
  idx record;
begin
  for idx in
    select ic.relname as index_name
    from pg_index i
    join pg_class c  on c.oid = i.indrelid
    join pg_class ic on ic.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_am am on am.oid = ic.relam
    where n.nspname = 'public'
      and c.relname = 'article'
      and am.amname = 'btree'
      and not i.indisprimary
      and not i.indisunique
      and i.indpred is null
      and 0 <> all (i.indkey::int2[])
      and (
        select array_agg(a.attname::text order by k.ord)
        from unnest(i.indkey::int2[]) with ordinality as k(attnum, ord)
        join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
      ) = array['topic']
  loop
    execute format('drop index public.%I', idx.index_name);
    raise notice 'P1-4.1 已删除 article.topic 上的 B-tree 索引：%', idx.index_name;
  end loop;
end;
$$;

commit;

-- ============================================================================
-- 应用后可以这样验证复合索引确实被用上了（在 SQL Editor 里跑）：
--
--   explain analyze
--   select id, title from article where lang = 1 order by updated_at desc limit 16;
--
-- 期望看到 Index Scan using article_lang_updated_at_idx，而不是 Seq Scan + Sort。
-- 数据量小的时候规划器仍可能选 Seq Scan——那是对的，不是索引没生效。
-- ============================================================================
