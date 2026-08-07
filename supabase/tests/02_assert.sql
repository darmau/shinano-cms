\set ON_ERROR_STOP on
-- ① category 回填是否生效
select 'category backfill' as check,
       (select category from article where slug = 'no-cat')::text as got, '1' as want;

-- ② insert_default_categories 修好之后，新建语言应该成功并自动获得两个默认分类
insert into language (lang, locale, is_default) values ('en', 'English', false);
select 'new language gets default categories' as check,
       (select count(*)::text from category where lang = (select id from language where lang='en')) as got,
       '2' as want;

-- ③ manage_default_language：删掉默认语言后，剩下的语言应该接过 is_default
insert into language (lang, locale, is_default) values ('fr', 'French', true);
select 'setting a new default unsets the old one' as check,
       (select count(*)::text from language where is_default) as got, '1' as want;
delete from category where lang = (select id from language where lang = 'fr');
delete from language where lang = 'fr';
select 'default language survives delete' as check,
       (select lang from language where is_default) as got, 'zh-CN' as want;

-- ④ update_published_time：直接 INSERT 一行已发布内容
insert into article (title, slug, lang, category, is_draft)
values ('直接发布', 'direct', 1, 1, false);
select 'published_at filled on direct insert' as check,
       (select (published_at is not null)::text from article where slug = 'direct') as got, 'true' as want;

-- ⑤ touch_updated_at：访客侧写入（page_view / reactions）不应改 updated_at
create temp table ts_before as select updated_at from article where slug = 'direct';
update article set page_view = page_view + 1 where slug = 'direct';
update article set reactions = '{"like":1}'::jsonb where slug = 'direct';
select 'visitor writes do not touch updated_at' as check,
       ((select updated_at from article where slug = 'direct') = (select updated_at from ts_before))::text as got,
       'true' as want;

-- ⑥ touch_updated_at：内容改动必须刷新 updated_at，并忽略客户端传来的时间
update article set title = '改了标题', updated_at = '1999-01-01' where slug = 'direct';
select 'content edit refreshes updated_at' as check,
       (select (updated_at > now() - interval '1 minute')::text from article where slug = 'direct') as got, 'true' as want;

-- ⑦ sync_new_user：首个用户 admin，第二个 reader；重复的 user_id 不报错
insert into auth.users (email, raw_user_meta_data) values ('a@x.com', '{"name":"A"}');
insert into auth.users (email, raw_user_meta_data) values ('b@x.com', '{"name":"B"}');
select 'first user is admin' as check, (select role::text from users order by id limit 1) as got, 'admin' as want;
select 'second user is reader' as check, (select role::text from users order by id offset 1 limit 1) as got, 'reader' as want;

-- ⑧ 类型
select 'article.content_json is jsonb' as check,
       (select data_type from information_schema.columns where table_name='article' and column_name='content_json') as got, 'jsonb' as want;
select 'users.current_ip is inet' as check,
       (select data_type from information_schema.columns where table_name='users' and column_name='current_ip') as got, 'inet' as want;
select 'is_admin is stable sql' as check,
       (select p.provolatile::text || l.lanname from pg_proc p join pg_language l on l.oid=p.prolang where p.proname='is_admin') as got, 'ssql' as want;

-- ⑨ 索引
select 'gin on article.topic' as check,
       (select count(*)::text from pg_indexes where indexname='article_topic_gin_idx') as got, '1' as want;
select 'article_lang_updated_at_idx' as check,
       (select count(*)::text from pg_indexes where indexname='article_lang_updated_at_idx') as got, '1' as want;
select 'is_draft index gone' as check,
       (select count(*)::text from pg_indexes where tablename='article' and indexdef like '%(is_draft)%') as got, '0' as want;
select 'partial published_at index kept' as check,
       (select count(*)::text from pg_indexes where tablename='article' and indexdef like '%published_at%WHERE%') as got, '1' as want;

-- ⑩ book.rate 约束真的挡得住
do $$
declare blocked boolean := false;
begin
  begin
    insert into book (title, rate) values ('bad', 9);
  exception when check_violation then blocked := true;
  end;
  raise notice 'book.rate CHECK blocks 9 (want true): %', blocked;
end $$;

-- ⑪ save_photo_with_images：原子性是这个函数存在的全部理由
insert into image (file_name, alt) values ('b.jpg', 'b'), ('c.jpg', 'c');
select public.save_photo_with_images(
  jsonb_build_object('title','原子相册','slug','atomic','lang',1,'category',2,'is_draft',true),
  '[{"image_id":1,"order":2},{"image_id":2,"order":1},{"image_id":1,"order":5}]'::jsonb
) as ignored;
select 'album save writes images' as check,
       (select count(*)::text from photo_image where photo_id = (select id from photo where slug='atomic')) as got,
       '2' as want;
select 'duplicate image_id is deduped' as check,
       (select "order"::text from photo_image
        where photo_id=(select id from photo where slug='atomic') and image_id=1) as got,
       '2' as want;

-- 再存一次，图片换成一张：先删后插必须在同一个事务里
select public.save_photo_with_images(
  jsonb_build_object('title','改了标题','slug','atomic','lang',1,'category',2,'is_draft',false),
  '[{"image_id":2,"order":1}]'::jsonb,
  (select id from photo where slug='atomic')
) as ignored;
select 'album re-save replaces images' as check,
       (select count(*)::text from photo_image where photo_id=(select id from photo where slug='atomic')) as got,
       '1' as want;

-- 关键断言：插入失败时，原有的图片与排序不能消失
do $$
declare after_count int; kept_title text;
begin
  begin
    perform public.save_photo_with_images(
      jsonb_build_object('title','不该生效','slug','atomic','lang',1,'category',2),
      '[{"image_id":999999,"order":1}]'::jsonb,
      (select id from photo where slug='atomic'));
  exception when others then null;
  end;
  select count(*) into after_count from photo_image where photo_id=(select id from photo where slug='atomic');
  select title into kept_title from photo where slug='atomic';
  raise notice 'failed image insert rolls back — images kept (want 1): %, title (want 改了标题): %',
    after_count, kept_title;
end $$;

-- 不存在 / 无权限的相册必须报错，而不是静默"保存成功"
do $$
declare blocked boolean := false;
begin
  begin
    perform public.save_photo_with_images(
      jsonb_build_object('title','x','slug','y','lang',1,'category',2), '[]'::jsonb, 999999);
  exception when others then blocked := true;
  end;
  raise notice 'saving a missing album raises (want true): %', blocked;
end $$;
