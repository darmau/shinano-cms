-- 模拟已确认的生产库漂移：comment 没有 upvote / downvote
alter table public.comment drop column if exists upvote;
alter table public.comment drop column if exists downvote;

-- 种子数据
insert into image (file_name, alt) values ('a.jpg', 'a') returning id;
-- 正常文章（有分类）
insert into article (title, slug, lang, category, is_draft) values ('正常', 'ok', 1, 1, true);
-- 分类为 NULL 的文章 —— P1-3.1 应该把它回填到默认分类
insert into article (title, slug, lang, is_draft) values ('缺分类', 'no-cat', 1, true);
-- title / slug 为 NULL 的文章 —— P1-3.1 应该跳过并 warning
insert into article (lang, category, is_draft) values (1, 1, true);
insert into photo (title, slug, lang, category, is_draft) values ('相册', 'p1', 1, 2, true);
insert into thought (content_text) values ('t');
insert into message (name, message) values ('m', 'hi');
