-- ============================================================================
-- P2-3 相册保存改为单事务
--
-- 对应 CODE_REVIEW_PLAN.md 的 P2-3。
--
-- 现在的保存流程是三次互相独立的浏览器请求：
--   1. update photo
--   2. delete from photo_image where photo_id = ?   ← 先把图片关系全删了
--   3. insert into photo_image ...                  ← 再重新插回去
--
-- 第 2 步成功、第 3 步失败（网络断了、标签页被关掉、RLS 拒绝），
-- 这个相册的**全部图片与排序就永久消失了**，而用户看到的只是一句报错提示。
-- 这不是理论风险：第 3 步是整个流程里最慢、数据量最大的一次请求。
--
-- 放进一个函数之后，三步在同一个事务里，要么全成要么全不成。
--
-- ⚠️ security invoker：函数以调用者身份执行，RLS 照常生效。
--    "Manage Albums" / "Manage Photos of Album" 两条 is_admin() 策略仍然是准绳，
--    这个函数不绕过任何权限，只提供原子性。
-- ============================================================================

begin;

create or replace function public.save_photo_with_images(
  p_photo jsonb,
  p_images jsonb default '[]'::jsonb,
  p_photo_id bigint default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_photo_id bigint;
begin
  if p_photo_id is null then
    insert into public.photo (
      title, slug, lang, category, abstract,
      content_json, content_html, content_text,
      cover, topic, is_top, is_featured, is_draft, published_at
    )
    values (
      p_photo->>'title',
      p_photo->>'slug',
      (p_photo->>'lang')::bigint,
      (p_photo->>'category')::bigint,
      p_photo->>'abstract',
      p_photo->'content_json',
      p_photo->>'content_html',
      p_photo->>'content_text',
      (p_photo->>'cover')::bigint,
      case
        when p_photo->'topic' is null or jsonb_typeof(p_photo->'topic') <> 'array' then null
        else array(select jsonb_array_elements_text(p_photo->'topic'))
      end,
      coalesce((p_photo->>'is_top')::boolean, false),
      coalesce((p_photo->>'is_featured')::boolean, false),
      coalesce((p_photo->>'is_draft')::boolean, true),
      (p_photo->>'published_at')::timestamptz
    )
    returning id into v_photo_id;
  else
    update public.photo set
      title = p_photo->>'title',
      slug = p_photo->>'slug',
      category = (p_photo->>'category')::bigint,
      abstract = p_photo->>'abstract',
      content_json = p_photo->'content_json',
      content_html = p_photo->>'content_html',
      content_text = p_photo->>'content_text',
      cover = (p_photo->>'cover')::bigint,
      topic = case
        when p_photo->'topic' is null or jsonb_typeof(p_photo->'topic') <> 'array' then null
        else array(select jsonb_array_elements_text(p_photo->'topic'))
      end,
      is_top = coalesce((p_photo->>'is_top')::boolean, false),
      is_featured = coalesce((p_photo->>'is_featured')::boolean, false),
      is_draft = coalesce((p_photo->>'is_draft')::boolean, true),
      published_at = (p_photo->>'published_at')::timestamptz
      -- lang 刻意不可改：换语言等于换成另一个语言版本，那是"新建变体"而不是"编辑"
    where id = p_photo_id
    returning id into v_photo_id;

    -- RLS 拒绝时 update 不报错，只是零行受影响。这里必须把它变成一个错误，
    -- 否则调用方会以为保存成功了。
    if v_photo_id is null then
      raise exception '相册 % 不存在，或没有权限修改', p_photo_id
        using errcode = '42501';
    end if;
  end if;

  delete from public.photo_image where photo_id = v_photo_id;

  -- distinct on (image_id)：同一张图片在一个相册里只能出现一次（主键就是这么定的），
  -- 客户端传重了的话取排序值最小的那条，而不是让整个保存失败
  insert into public.photo_image (photo_id, image_id, "order")
  select v_photo_id, deduped.image_id, deduped.sort_order
  from (
    select distinct on ((elem->>'image_id')::bigint)
      (elem->>'image_id')::bigint as image_id,
      (elem->>'order')::int as sort_order
    from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) as elem
    where elem->>'image_id' is not null
    order by (elem->>'image_id')::bigint, (elem->>'order')::int nulls last
  ) as deduped;

  return v_photo_id;
end;
$$;

grant execute on function public.save_photo_with_images(jsonb, jsonb, bigint) to authenticated;

commit;

-- ============================================================================
-- 应用后请重新生成类型，PhotoEditor 里那个临时的类型垫片就可以删掉了：
--
--   pnpm db:push
--   pnpm db:types
--
-- 验证（在 SQL Editor 里，用一个真实的相册 id）：
--   select public.save_photo_with_images(
--     jsonb_build_object('title','测试','slug','test','category',1,'is_draft',true),
--     '[{"image_id": 1, "order": 1}]'::jsonb,
--     <photo_id>
--   );
-- 然后确认 photo_image 里只剩这一行，且 photo 的标题被改了。
-- ============================================================================
