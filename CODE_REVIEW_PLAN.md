# Shinano CMS 代码审查与改进计划

> 审查日期：2026-08-07 ｜ 分支：`upgrade` ｜ 审查维度：安全、数据库、架构、产品/UX、测试
> 本文件是给执行者（Opus）的工作说明书。每项包含：问题、位置、修复方案、验证方式。
> **执行顺序建议严格按 P0 → P4**，P0 中的数据库修复彼此独立，可并行。

---

## 0. 执行须知

**核心判断**：这个项目的代码质量本身不差（只有 4 处 `console.log`、3 处 `any`，函数普遍设了 `search_path`，约束和部分索引有认真设计）。真正的问题集中在两处结构性决策：

1. **授权模型建立在"有 session 即授权"之上**，而角色列本身可被用户自己改写 —— 这是完全沦陷级别的漏洞链。
2. **所有写操作都在浏览器端直连 Supabase**，正确性 100% 依赖手工维护的 RLS —— 而 RLS 里恰好有几条策略写错了。

这两点互为因果：正因为没有服务端写入层，RLS 成了唯一防线；而 RLS 又没有测试和版本管理。所以 P0 修完漏洞后，P1 建立迁移工作流、P2 把写入移回服务端，是让问题不再复发的根本手段。

**已亲自核实的关键结论**（非推测）：

- `src/migration/init.sql:266` 尾逗号确实存在，文件无法完整执行
- `init.sql:822-836` "Update User Info" 策略确实无列级限制
- `init.sql:599-611` `user_is_comment_owner()` 确实从不引用被删除的行
- `src/routes/api/r2/+server.ts` 确实零鉴权
- `src/routes/admin/+layout.server.ts` 确实不检查角色
- `src/lib/components/ArticleEditor.svelte:157` 的 `isChanged` 逻辑确实颠倒
- 全代码库确实无任何 `ilike`/`textSearch`（无搜索功能）

**依赖外部配置的假设**（执行前请确认）：

- Supabase 项目是否开放邮箱注册？若开放，P0-1 是可被任意陌生人利用的；若关闭，攻击面降低但漏洞仍在。
- R2 桶是否开启了版本控制？若无，P0-3 的媒体库删除不可恢复。

---

## P0 执行状态：✅ 全部完成（2026-08-07）

代码改动已通过 `svelte-check`（0 错误）、eslint、24 项单元测试与 `pnpm build`。
SQL 迁移 `supabase/migrations/20260807000000_p0_security_fixes.sql` **已在生产库执行成功**。

| 项                               | 状态          | 落点                                                                                                        |
| -------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| P0-1 自我提权                    | ✅ SQL 已应用 | `prevent_privilege_escalation()` 触发器                                                                     |
| P0-2 评论批量删除                | ✅ SQL 已应用 | 重写 DELETE 策略，删除有缺陷的 `user_is_comment_owner()`                                                    |
| P0-3 R2 桶可被清空               | ✅ 代码已改   | `api/r2`、`api/image` 加鉴权；DELETE 改为先删库再删 R2；新增 `lib/server/media.ts` 做 UUID 与 MIME/大小校验 |
| P0-4 开放注册 + 零角色校验       | ✅ 代码已改   | `hooks.server.ts` 统一守卫；`lib/server/auth.ts`                                                            |
| P0-5 PII 泄露                    | ✅ SQL 已应用 | 行级改 `is_public`，列级对 anon 收紧（comment 保留 15 列，users 保留 4 列）                                 |
| P0-6 img-alt SSRF                | ✅ 代码已改   | UUID 校验 + 查表确认对象归属                                                                                |
| P0-7 slug-check 白名单           | ✅ 代码已改   | `api/slug-check`                                                                                            |
| P0-7 gallery_feed / 匿名评论约束 | ✅ SQL 已应用 | gallery_feed 本就已是 invoker（幂等空操作）；匿名评论约束已生效                                             |
| P1-1 init.sql 尾逗号             | ✅ 已修       | 顺带修掉，否则迁移记录不可信                                                                                |

### 应用后仍需你确认的事项

1. **前台是否正常**：迁移收紧了 anon 对 `comment` / `users` 的列权限。若前台用 `select=*`
   读这两张表会收到 42501，需改成显式列清单。另外前台现在只能读到 `is_public = true`
   的评论——匿名评论会因待审核而不再立即显示。
2. **Supabase Auth 里关闭邮箱注册**。代码侧的 `ALLOW_SIGNUP` 默认已关闭自助注册，
   但从 Supabase 控制台再关一道更稳妥（纵深防御，且能挡住绕过应用直连 Auth 的情况）。
3. **轮换 `.env.local` 里的测试账户密码**（该账户有控制台权限，密码目前是明文）。

### 下一步建议顺序

**P1-2 建立版本化迁移工作流**优先级已经从"最佳实践"升为**硬性前置**——本轮两次踩到
`init.sql` 与生产库的漂移（`comment.upvote` 不存在、`gallery_feed` 早已是 invoker），
证明在没有可信 schema 记录之前，任何 schema 改动都是在猜。先 `supabase db pull` 拿基线。

之后按 P1-3（数据完整性）→ P2-1（生成 DB 类型）→ P2-2（写操作移回服务端）推进。
P2-2 完成后才能回头做 cookie 的 `httpOnly`（见下方说明）。

### ⚠️ 已实测确认：生产库与 `init.sql` 存在实质性漂移

首次执行迁移时报错 `column "upvote" of relation "comment" does not exist`。也就是说
`init.sql:250-251` 声明的 `comment.upvote` / `comment.downvote` **在生产库里根本不存在**
（很可能在 738531d 那次 reactions 改动中被 JSONB 取代）。

这把 P1-2 从"最佳实践建议"变成了**硬性前置条件**：在拿到生产库的真实形态之前，
任何按 `init.sql` 编写的迁移都是在猜。

应对：

1. 迁移文件已改为**自适应实际 schema** —— 凡涉及列清单的地方都从 `information_schema`
   实时读取，PII 收敛改用「敏感列黑名单」而非「安全列白名单」（白名单需要预知全部
   列名，黑名单只需知道哪些列敏感，后者是确定的，且不会因漏列而误伤前台）。
2. 新增 `supabase/inspect_schema.sql`（只读）导出真实的列、RLS 策略、函数与视图设置。
   **在做 P1 的任何 schema 改动之前先跑它。**

### 生产库探查结果（2026-08-07，已用 `inspect_schema.sql` 核实）

**四条 P0 漏洞在生产库中全部确认存在，且策略名与迁移文件完全一致**（这一点至关重要：
若策略名对不上，`drop policy if exists` 会静默跳过，漏洞原样留着而迁移却显示成功）：

| 策略                                    | 生产库中的实际定义                | 对应                                    |
| --------------------------------------- | --------------------------------- | --------------------------------------- |
| `users` / "Update User Info"            | UPDATE authenticated，无列级限定  | P0-1                                    |
| `comment` / "Delete Their Own Comments" | `using (user_is_comment_owner())` | P0-2                                    |
| `comment` / "List All Comments"         | anon `using (not is_blocked)`     | P0-5                                    |
| `users` / "Get Users"                   | anon `using (true)`               | P0-5                                    |
| `comment` / "Anon User Can Comment"     | INSERT anon `with check (true)`   | P0-7                                    |
| `image` / "Get Images"                  | anon `using (true)`               | P0-3 的前提（storage_key 可枚举）已坐实 |

**已更正的判断**：

- `gallery_feed` 在生产库里**早已是 `security_invoker=on`**，此前的判断来自 `init.sql:1169`，
  是这个文件第二次误导我们。迁移里的 `alter view` 因此是幂等空操作，无害。
- 生产库还存在 `random_en_photos` / `random_jp_photos` / `random_zh_photos` 三个视图，
  `init.sql` 里完全没有 —— 又一处漂移。三者均已正确设置 `security_invoker=true`。
- `comment` 表**没有** `upvote` / `downvote` / `reactions` 列（`reactions jsonb` 在
  article / photo / thought 上）。因此评论刷票不是问题，匿名插入约束会自动跳过这几项。
- `config` 的 "Manage Config" 是 `is_admin()`，第三方密钥确实只有管理员可读，
  这印证了 AI 端点当前是「偶然 fail closed」的判断。

### 🆕 新发现【HIGH】`image` 表的 EXIF 与 GPS 坐标全世界可读

探查中发现的、原审查未覆盖的问题。`image` 表策略是 `"Get Images" SELECT anon using (true)`，
而该表实际含有 `exif json`、`gps_location`、`latitude numeric`、`longitude numeric`。

与 P0-5 同一类问题：RLS 是行级的，一旦行可读则**每一列**可读。任何人用公开 anon key
执行 `GET /rest/v1/image?select=exif,latitude,longitude` 即可导出全部图片的原始 EXIF 与
精确坐标 —— **包括尚未发布、仅存在于草稿中的照片**。

讽刺之处在于：上传时 `src/lib/server/r2.ts` 的 `stripExifSegments` 会把 EXIF 从 R2 对象里
剥掉（说明作者明确意识到 EXIF 是敏感的），但解析后的 EXIF 原样存进了数据库，而数据库这一侧
对匿名用户完全敞开。防护做了一半。

**为什么没有直接写进 P0 迁移**：修复方式取决于前台的实际需求，存在真实取舍——

- 摄影站的照片地图（`get_photo_map_geojson`）需要坐标，直接封掉 `latitude`/`longitude` 会弄坏它。
- 代码库里有 `shutterSpeed.ts` 这类助手，说明前台很可能展示光圈/快门等相机参数，
  而这些来自 `exif`，封掉整列会弄坏照片详情页。

**建议的修复方向**（需要你先确认前台读了哪些字段）：

1. 最小改动：只对 anon 撤销 `exif` 一列（原始 EXIF 常含机身序列号、拥有者姓名、软件信息），
   保留 `latitude`/`longitude` 供地图使用；前台若要展示相机参数，改为读取几个提取出来的
   具名列（`aperture`、`shutter_speed` 等），而不是整个 EXIF blob。
2. 更彻底：建 `image_public` 视图（`security_invoker`）只暴露前台需要的字段，
   并加上「仅限已发布内容引用的图片」这一行级条件，把草稿照片一并挡住。

### ⚠️ 一处必须更正的判断：cookie 的 `httpOnly` 现在不能加

原计划把"给认证 cookie 加 `httpOnly`"列为 P0-7。**这是错的，会让整个 CMS 无法写入。**

`src/routes/+layout.svelte:19` 用 `createBrowserClient` 建了浏览器端 Supabase 客户端，它必须从
`document.cookie` 读会话；而 P2-2 指出的 45 处写操作**全部**走这个浏览器客户端。一旦加上
`httpOnly`，浏览器客户端将以匿名身份运行，所有保存/删除/发布操作都会被 RLS 拒绝。

**正确顺序是：先做 P2-2（把写操作移回服务端），再加 `httpOnly`。** 这条依赖关系已并入 P2-2。

### 尚未处理、留给下一批的 P0-7 项

- **密钥掩码**（`setting/apis`、`setting/ai` 把明文密钥下发到浏览器）—— 需要改造设置页的读写路径，属于独立改动。
- **Tiptap XSS 消毒**（引入 dompurify）—— 会新增依赖并触及编辑器渲染，需要单独验证编辑体验。
- **`add_reaction` 草稿枚举与限流** —— 需要重写该函数，且限流应在 Cloudflare 边缘做。

---

## P0 — 安全紧急（建议今天完成）

### P0-1 【CRITICAL】任何登录用户可自我提权为 admin

**位置**：`src/migration/init.sql:822-836`

策略只做了行级限定（`auth.uid() = user_id`），没有列级限定，而 `users.role` 就在这一行里。Supabase 默认把 public schema 的 UPDATE 权限授予 `authenticated` 角色，因此 PostgREST 接受对 `role` 列的直接写入。全系统所有授权判断都走 `is_admin()`（`init.sql:588`）读这一列。

**利用链**：注册账号 → `PATCH /rest/v1/users?user_id=eq.<自己的uid>` 带 `{"role":"admin"}` → 获得 article/photo/image/config/users/message/comment 的完全读写 → 其中 `SELECT config` 可导出 OpenAI key、`cf_AIG_TOKEN`、Mapbox token、Unsplash secret。攻击者甚至可以先通过公开可读的 `users` 表（P0-5）枚举出管理员 UUID。

**修复**：

```sql
drop policy "Update User Info" on public.users;
revoke update on public.users from authenticated;
grant update (name, website) on public.users to authenticated;

create policy "Update own profile" on public.users
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

再加一道防线（防止将来误授列权限）：

```sql
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.role is distinct from OLD.role and not public.is_admin() then
    raise exception 'Insufficient privileges to change role';
  end if;
  return NEW;
end;
$$;

create trigger guard_role before update on public.users
for each row execute function public.prevent_role_escalation();
```

**验证**：用一个 reader 账户的 token 调用上述 PATCH，应返回 403/无行受影响；确认管理员在后台仍能改用户角色。

---

### P0-2 【CRITICAL】任何发过评论的用户可删除全站评论

**位置**：`src/migration/init.sql:599-611`（函数）+ `:770`（策略）

`user_is_comment_owner()` 的函数体只查询"该用户是否拥有任意一条评论"，**从不引用正在被删除的那一行**。因此 `FOR DELETE USING (user_is_comment_owner())` 对所有行都返回 true —— 任何发过一条评论的用户都能通过 PostgREST 一次请求删光整张 comment 表。

**修复**：

```sql
drop policy "Delete Their Own Comments" on public.comment;
drop function if exists public.user_is_comment_owner();

create policy "Delete Their Own Comments" on public.comment
for delete to authenticated
using (user_id in (select id from public.users where user_id = (select auth.uid())));
```

**验证**：用户 A 发评论，用户 B 发评论；以 A 的身份尝试删除 B 的评论应失败，删自己的应成功。

---

### P0-3 【HIGH】R2 媒体桶可被任意登录用户清空

**位置**：`src/routes/api/r2/+server.ts`（POST 与 DELETE 均无任何鉴权）、`src/lib/server/r2.ts:72-78`、`src/routes/api/image/+server.ts:301-329`

`/api/r2` 完全不接触数据库，因此 **RLS 提供零保护** —— handler 直接拿 `{keys:[...]}` 调 `deleteFromR2()`。而 `storage_key` 并不机密：`init.sql:775` 的 `"Get Images"` 策略对 anon 是 `using (true)`，任何持有公开 anon key 的人都能列举全部 storage_key。

`/api/image` 的 DELETE 顺序更糟：313 行先删 R2 对象，315 行才执行受 RLS 检查的数据库删除 —— 非管理员会导致对象被真实销毁却收到 502。同理 POST 在 251 行先写 R2、288 行才做被 RLS 拦下的 insert，在桶里留下攻击者可控的孤儿对象。

**利用链**：用 anon key 拉取全部 storage_key → 注册账号 → `DELETE /api/r2` 提交全部 key → 媒体库全灭（R2 无版本控制则不可恢复）。

**修复**：

1. 两个 handler 顶部加管理员校验（见 P0-4 的统一守卫）。
2. `/api/image` DELETE 改为**先删数据库、再按 `.select()` 实际返回的 storage_key 删 R2**；POST 同理改为先入库再上传，或失败时补偿删除。
3. 校验 key 符合 UUID 格式（schema 中 `storage_key` 就是 UUID）后才传给 `bucket.delete`。
4. POST 补充文件大小与 MIME 类型校验（当前 `uploadToR2` 来者不拒）。

---

### P0-4 【HIGH】开放注册 + 应用层零角色校验

**位置**：`src/hooks.server.ts:57-67`、`src/routes/auth/signup/+page.server.ts:5-26`、`src/routes/admin/+layout.server.ts`

`authGuard` 放行 `/auth/signup`，该页无条件调用 `supabase.auth.signUp()`。`sync_new_user()`（`init.sql:456-486`）让首个用户成为 admin、其余为 reader —— 设计是对的，但**没有任何路由检查这个角色**。`admin/+layout.server.ts` 只调 `safeGetSession()`；全应用唯一一处 `is_admin` 调用（`admin/+page.server.ts:10`）仅用于渲染一个横幅（`admin/+page.svelte:40`），不做拦截。

于是整个授权模型退化成"有 session 即授权"，而 session 是自助获取的。

**修复**：

1. 在 Supabase Auth 设置中关闭邮箱注册（管理员已存在），或移除 `hooks.server.ts:59` 的 signup 豁免。
2. 在 `src/routes/admin/+layout.server.ts` 加角色拦截：
   ```ts
   const { data: isAdmin } = await locals.supabase.rpc('is_admin');
   if (!isAdmin) throw error(403, 'Forbidden');
   ```
3. **在 `hooks.server.ts` 对整个 `/api` 子树加统一守卫**（一处修复覆盖 P0-3 和 P0-6）：
   ```ts
   if (event.url.pathname.startsWith('/api/') && !event.url.pathname.startsWith('/api/auth')) {
   	const { data: isAdmin } = await event.locals.supabase.rpc('is_admin');
   	if (!isAdmin) return new Response('Forbidden', { status: 403 });
   }
   ```
   注意这同时修复了当前"未认证的 API 调用会收到 303 跳转到登录页 HTML"这一对 `fetch` 调用方极其迷惑的失败模式 —— 应该返回 401/403。
4. 额外在每个 API handler 顶部加 `requireAdmin(locals)` 小工具作为纵深防御，避免将来往白名单加豁免时静默暴露。

---

### P0-5 【HIGH】评论者与用户 PII 全世界可读

**位置**：`init.sql:754-760`（comment SELECT 策略）、`:812-818`（users SELECT 策略）

`comment` 表存有 `email`、`ip INET`、`ip_info JSON`、`toxic_score`，而策略是 `using (not is_blocked)` —— RLS 是行级的，所以**每一列**都可读。任何人用页面 bundle 里的 anon key 执行 `GET /rest/v1/comment?select=name,email,ip,ip_info` 即可完整导出评论者 PII。且策略过滤的是 `is_blocked` 而非 `is_public`，连尚未审核通过的匿名评论也公开可读（`set_comment_is_public` 在 `init.sql:516-527` 强制新匿名评论 `is_public=false`，后台按此视为私密）。

`users` 表同理：`using (true)` 暴露 `current_ip`、`source`、auth UUID 和 role。

这是 GDPR 相关问题。

**修复**（视图方案，比列级 REVOKE 更稳妥，因为客户端常写 `select=*`）：

```sql
drop policy "List All Comments" on public.comment;
drop policy "List All Comments for Authenticated" on public.comment;
revoke select on public.comment from anon, authenticated;

create view public.comment_public with (security_invoker = on) as
  select id, user_id, name, website, content_html, content_text, created_at,
         reply_to, to_article, to_photo, to_thought, upvote, downvote
  from public.comment
  where not is_blocked and is_public;

grant select on public.comment_public to anon, authenticated;
```

`users` 表同样处理：建 `security_invoker` 视图只暴露 `id, name, website`，`revoke select on public.users from anon`。保留 `is_admin()` 的 "Manage Comments" / "Manage Users" 策略供后台使用。

**注意**：修改后需同步更新公开站点（前台项目）读取评论/用户的查询目标表名。

---

### P0-6 【MEDIUM-HIGH】`/api/img-alt` 的 SSRF + 配额滥用

**位置**：`src/routes/api/img-alt/+server.ts:15-57`

```ts
const targetKey = typeof storage_key === 'string' ? storage_key : img_key;
const resizedImageUrl = `${URL_PREFIX}/cdn-cgi/image/width=512,format=jpeg/${targetKey}`;
imageResponse = await fetch(resizedImageUrl);
```

`targetKey` 未经任何校验就拼进 URL 并由服务端发起请求。Cloudflare 的 `/cdn-cgi/image/<options>/<source>` **接受绝对 URL 作为源**，`../` 段也能改写路径。

与其他 AI 端点不同，这个端点**没有被 RLS 间接保护**：config 读取用了 `.maybeSingle()` 并在 34 行静默回退到 `DEFAULT_PROMPT`，AI binding 来自 `platform.env`（37 行），全程不碰数据库。

**修复**：加管理员校验（P0-4 已覆盖）+ 先在 `image` 表按 `storage_key` 查表，只允许已知对象；至少也要做 UUID 正则校验。同时对 `/api/generate-image` 和 `/api/img-alt` 加 per-user 频率限制。

---

### P0-7 【MEDIUM】其余安全加固（可与 P1 一批做）

| 项                                                     | 位置                                                                           | 修复                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 密钥明文下发浏览器                                     | `admin/setting/apis/+page.server.ts:11-31`、`setting/ai/+page.server.ts:11-32` | 返回掩码值 + `isSet` 布尔；更新走 form action，只接受新值、永不回显。输入框改 `type="password"`                                                                                                                                                                                                                                                                  |
| 认证 cookie 可被 JS 读取（**被 P2-2 阻塞，勿现在改**） | `hooks.server.ts:10-14`                                                        | `@supabase/ssr` 的默认 `httpOnly:false` + 400 天 maxAge 覆盖了 SvelteKit 的安全默认值。**但现在加 `httpOnly` 会让整个 CMS 无法写入**：`+layout.svelte:19` 的浏览器端 Supabase 客户端必须从 `document.cookie` 读会话，而全部 45 处写操作都走它。必须先完成 P2-2 把写操作移回服务端，再改为 `{ ...options, path:'/', httpOnly:true, secure:true, sameSite:'lax' }` |
| Tiptap 存储型 XSS sink                                 | `editor/Embed.ts:96,154`、`ArticleEditor.svelte:508`、`PhotoEditor.svelte:622` | `sanitizeCode`（Embed.ts:10）只 trim 不消毒。引入 `dompurify` 做白名单消毒；两处纯为取 `textContent` 的改用 `new DOMParser().parseFromString(html,'text/html').body.textContent`（惰性文档，不触发 `onerror`）                                                                                                                                                   |
| `gallery_feed` 视图绕过 RLS                            | `init.sql:1169,1246`                                                           | `alter view public.gallery_feed set (security_invoker = on);` 并同步改 `CREATE VIEW` 语句。（1245 行注释"通过授权添加 RLS"是错误理解，GRANT 不是 RLS）                                                                                                                                                                                                           |
| 匿名评论插入无约束                                     | `init.sql:762-764`                                                             | `with check (true)` 允许冒充任意 `user_id`、预置 upvote/downvote、设 `is_blocked=false`。收紧为 `with check (is_anonymous is true and user_id is null and upvote = 0 and downvote = 0 and is_blocked = false and length(content_text) < 5000)`                                                                                                                   |
| `add_reaction` 无限刷                                  | `init.sql:991-1047`                                                            | SECURITY DEFINER + GRANT anon 且无限流；且对草稿也生效（可枚举草稿 id）。加 `and is_draft = false`、统一错误消息（不区分"草稿"与"不存在"）、边缘限流                                                                                                                                                                                                             |
| `/api/slug-check` 表名未校验                           | `api/slug-check/+server.ts:4-17`                                               | `type` 由调用方指定并传给 `.from(type)`。加白名单 `['article','photo']`                                                                                                                                                                                                                                                                                          |
| 测试凭据明文                                           | `.env.local:6-7`                                                               | 已正确 gitignore 且 git 历史干净（已验证），但这是有控制台权限账户的真实密码。轮换并移入钥匙串/CI secret                                                                                                                                                                                                                                                         |

**已检查确认干净**（无需处理）：CSRF（SvelteKit `csrf.checkOrigin` 默认生效）、`api/auth/confirm` 的开放重定向（`redirectTo.pathname = next` 按 WHATWG 语义无法改 host）、全树零 `{@html}`、受版本控制文件中无硬编码密钥、所有表都已 `ENABLE ROW LEVEL SECURITY`（`init.sql:559-585`，无遗漏）。

---

## P1 执行状态：✅ 代码与迁移已就绪，等待应用到生产库（2026-08-07）

四个迁移文件已在本地 Postgres 16 上**完整重放并断言通过**（`./supabase/tests/run.sh`），
代码改动通过 `svelte-check`（0 错误）、24 项单元测试与 `pnpm build`。

| 项                        | 状态           | 落点                                                                                          |
| ------------------------- | -------------- | --------------------------------------------------------------------------------------------- |
| P1-1 init.sql 尾逗号      | ✅ 已修        | 上一轮完成                                                                                    |
| P1-2 版本化迁移工作流     | ✅ 代码已就绪  | supabase CLI 进 devDependency、`db:*` 脚本、`supabase/README.md`、init.sql 降级为 `legacy/`   |
| P1-2 本地重放测试         | ✅ 新增        | `supabase/tests/run.sh`（一次性容器里重放全部迁移并断言行为）                                 |
| P1-3 数据完整性           | ⏳ 待应用      | `20260807010000_p1_data_integrity.sql` + 两个编辑器不再自己发 `updated_at`                    |
| P1-4 索引优化             | ⏳ 待应用      | `20260807020000_p1_indexes.sql`                                                               |
| P1-5 类型与函数清理       | ⏳ 待应用      | `20260807030000_p1_types_and_cleanup.sql`                                                     |

### 🆕 本轮新发现【HIGH】新增语言在生产库里必然失败

`insert_default_categories()` 设了 `search_path = ''` 却写 `INSERT INTO category`（不带 schema），
必然抛 `relation "category" does not exist`。它挂在 `language` 表的 AFTER INSERT 上——
**也就是说"新增一门语言"这个操作现在是坏的**，而多语言正是这个 CMS 的核心功能。
同类问题在 `manage_default_language()` 里也有（`UPDATE language`）。两处都已在迁移中限定为 `public.`。

这个问题原审查没发现，是本地重放时一跑就炸出来的——它也顺带证明了 P1-2 的价值：
在能重放之前，这种"只在特定分支才触发"的错误只能等用户去踩。

同样由本地重放抓到的还有：补选下一个默认语言的逻辑必须放在 AFTER DELETE，
写在 BEFORE DELETE 会因为递归触发而报 `tuple to be deleted was already modified`，
表现为"删除语言永远失败"。

### 应用步骤

```bash
./supabase/tests/run.sh          # 先本地重放一遍，确认全绿
pnpm exec supabase login         # 需要你在浏览器里授权
pnpm db:link --project-ref <ref>
pnpm db:pull                     # ★ 拿到生产库真实基线，这是 P1-2 的关键一步
pnpm db:push                     # 应用三个 P1 迁移
```

不想装 CLI 的话，三个迁移文件都可以直接粘进 SQL Editor 执行（自带事务、重复执行安全），
但那样 `supabase_migrations.schema_migrations` 不会有记录，补登记方式见 `supabase/README.md`。

### 应用后需要你确认的事项

1. **看迁移输出里的 WARNING**。P1-3 对存在 NULL 的列不会强加 NOT NULL，而是列出来跳过——
   清理完那些行再跑一次同一个文件即可补上。这类行在后台是看不见的（`toArticleListItem`
   会静默丢弃 title/slug 为 null 的行），只能在 SQL Editor 里处理。
2. **P1-5.1 的 JSONB 转换若报 WARNING**，说明该列被某个视图依赖（生产库有快照文件里
   没有的 `random_{en,jp,zh}_photos`）。需要先 `drop view`、转换、再重建视图。
3. **`article.category` 变成 NOT NULL 之后**，任何绕过后台直接写 article 的脚本都要带分类。

### 之后的顺序

P2-1（生成 DB 类型，`pnpm db:types`，link 完就能跑）→ P2-2（写操作移回服务端）
→ P2-2 完成后才能给 cookie 加 `httpOnly`。

---

## P1 — 数据完整性与迁移工作流

### P1-1 【CRITICAL】`init.sql` 无法执行，schema 已与生产库漂移 —— ✅ 尾逗号已修（2026-08-07）

**位置**：`src/migration/init.sql:266-267`

```sql
FOREIGN KEY ("to_photo") REFERENCES photo ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  );
```

尾逗号是语法错误。全新执行会在 comment 表处失败，此后的 message/stats/config 表、**所有触发器、所有 RLS 策略**都不会创建。这证明文件已不是生产库的忠实记录 —— 近期的 `gallery_feed` 和 `reactions` 变更显然是直接改的托管库。

**修复**：删掉尾逗号，然后立刻做 P1-2。

### P1-2 建立版本化迁移工作流（这是防止问题复发的关键）—— ✅ 已就绪（2026-08-07）

> 已完成：CLI 进 devDependency + `db:link/pull/diff/push/reset/types` 脚本、
> `supabase/config.toml`、`supabase/README.md`（含无 CLI 时的降级方案）、
> `src/migration/init.sql` → `supabase/legacy/init_snapshot.sql`、
> `supabase/tests/run.sh` 本地重放测试。
> **剩下 `supabase login` / `db link` / `db pull` 三步需要你的凭据**，见上方"应用步骤"。

当前是单个 1267 行、放在非标准路径、手工编辑的快照文件，且里面还残留死调试代码（`init.sql:1248-1268` 的测试 SELECT，引用了不存在的语言代码 `'zh'/'en'/'jp'`，而种子数据插的是 `'zh-CN'`）。

**步骤**：

1. `supabase init` → `supabase link --project-ref <ref>`
2. `supabase db pull` 把生产库真实状态基线化到 `supabase/migrations/<ts>_remote_schema.sql`
3. **对比基线与 `init.sql`，把差异记录下来** —— 这会暴露出所有漂移
4. 此后每次变更：本地改 → `supabase db diff -f <name>` → `supabase db reset` 本地验证 → `supabase db push`
5. `src/migration/init.sql` 降级为文档或直接删除
6. P0 的所有 SQL 修复都应作为**独立的、可审计的迁移文件**提交，而不是再次手改 init.sql

### P1-3 数据完整性修复 —— ⏳ 迁移已写好待应用（`20260807010000_p1_data_integrity.sql`）

| 问题                          | 位置                                                                                                                        | 修复                                                                                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 身份关键列可为 NULL           | article/photo 的 title/slug/lang/category、category 的 lang/slug/title/type、language.lang/locale、thought.slug、book.title | `UNIQUE(lang, slug)` 对 NULL 不生效（NULL 永不冲突），两条 `slug=NULL` 的文章可共存并破坏路由；而 app 层 `toArticleListItem` 会静默丢弃 null title/slug 的行 —— 数据在库里但后台看不见。逐列 `ALTER ... SET NOT NULL`       |
| 默认语言可被删空              | `init.sql:363-373` `manage_default_language`                                                                                | BEFORE DELETE 中 `ORDER BY id ASC LIMIT 1` 可能选中正被删除的行（删默认语言时这是典型情况）→ 系统失去默认语言 → `article/new` 的 `.eq('is_default', true).single()` 崩溃。加 `where id != OLD.id`；`is_default` 补 NOT NULL |
| 首用户成 admin 有竞争         | `init.sql:455-491` `sync_new_user`                                                                                          | 先 `count(*)` 再条件赋 admin，两个并发注册可都读到 0 → 都成 admin。低概率高影响。加 `pg_advisory_xact_lock(42)`，并补 `on conflict (user_id) do nothing` 防 webhook 重放中断注册事务                                        |
| `published_at` 可能为空       | `init.sql:530-554` `update_published_time`                                                                                  | 只挂了 UPDATE；直接 INSERT `is_draft=false` 的行 `published_at` 为 NULL，会掉出部分索引和前台排序。改挂 `INSERT OR UPDATE` 并处理 `TG_OP='INSERT'`（无 OLD）                                                                |
| `updated_at` 由浏览器时钟决定 | 无触发器；`ArticleEditor.svelte:117`、`PhotoEditor.svelte:91,142`                                                           | 后台列表按 `updated_at` 排序，客户端时钟偏移会打乱顺序；任何忘记赋值的写路径会留下陈旧值。启用 `moddatetime` 扩展加触发器（article/photo/thought），删掉客户端赋值                                                          |
| 正文内嵌图片无引用追踪        | 无 `image_usage` 表                                                                                                         | 封面 FK 是 `ON DELETE SET NULL`（`init.sql:70,112,189`）会静默消失；正文 `content_html` 里的图片**完全无 FK**，删除后已发布文章直接 404。见 P3-4                                                                            |

### P1-4 索引优化 —— ⏳ 迁移已写好待应用（`20260807020000_p1_indexes.sql`）

| 操作                                                                                                       | 原因                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `create index on article using gin (topic)` 替换 `init.sql:131` 的 B-tree                                  | `TEXT[]` 上的 B-tree 对 `@>`/`&&` 包含查询无用                                                |
| **新增** `photo_image(image_id)`、`thought_image(image_id)`                                                | 当前缺失；每次删图片的级联都要全表扫这两张连接表（`ImageGrid` 支持批量删）                    |
| **新增** `comment(reply_to)`                                                                               | FK 无索引，删评论时同样全表扫                                                                 |
| **新增** `article(lang, updated_at DESC)`、`photo(lang, updated_at DESC)`                                  | 后台列表实际查询是 `where lang = ? order by updated_at desc limit/offset`，单列索引会强制排序 |
| **新增** `comment(is_public, created_at DESC)`、`message(is_read, created_at DESC)`                        | 匹配后台列表的复合排序                                                                        |
| **删除** `thought_image(thought_id)`、`photo_image(photo_id)`                                              | 与主键前导列重复，纯负担                                                                      |
| **删除** `is_draft` 布尔索引（`init.sql:129,206`）、`image("date")`（`:55`）、`category("title")`（`:74`） | 选择性极低或应用从不查询；`published_at` 的部分索引已覆盖有用场景                             |

### P1-5 类型与杂项清理 —— ⏳ 迁移已写好待应用（`20260807030000_p1_types_and_cleanup.sql`）

> 已覆盖：JSONB 转换、`current_ip` → INET、`is_admin`/`user_is_blocked` 改 SQL STABLE
> 并把策略里的调用包成 `(select ...)`、`get_article_count_by_year` 加 `is_draft = false`、
> `book.rate` CHECK、`message.contact_type` 默认值与 NOT NULL、`stats.date` 默认 `CURRENT_DATE`、
> `storage_key` 默认改 `gen_random_uuid()`、以及新发现的 `insert_default_categories()` 限定修复。
>
> **刻意未做**（迁移文件末尾有完整理由）：`photo_image."order"` 改名（与 P2-3 同一条写入路径，
> 一起做只需改一次调用方）、删 `image.date`（`/api/image` 仍在写它）、`contact_type` 的取值集合
> （产品决策，猜错会让访客留言失败）、`config` 迁 Vault、合并重复 SELECT 策略（无 RLS 测试前不动 RLS）。
> 另：`src/routes/admin/video/+page.svelte` 确认是 1 行占位页，未被导航引用，也没有对应的表——
> 要删还是要做，是产品决策。

- `content_json`/`exif`/`ip_info` 从 `JSON` 改为 `JSONB`（`get_photo_map_geojson` 目前每行重新解析文档）。`content_json` 是写多读少的 Tiptap 状态，优先级最低。
- `image.date TEXT` 与 `taken_at TIMESTAMPTZ` 重复 —— 保留一个有类型的。
- `users.current_ip TEXT` vs `comment.ip INET` 不一致 → 统一用 `INET`。
- `book.rate` 补 `CHECK (rate BETWEEN 1 AND 5)`；`message.contact_type` 改 CHECK 或枚举。
- `uuid_generate_v4()`（`:50`）依赖从未创建的 `uuid-ossp` → 改 `gen_random_uuid()`（`:138` 已在用）。
- `create extension pg_cron`（`:852`）补 `if not exists`。
- 删除 `:1248-1268` 的死调试 SQL。
- `stats.date` 默认改 `CURRENT_DATE`；确认每日统计是否应排除草稿。
- `get_article_count_by_year`（`:626`）补 `where is_draft = false`。
- `photo_image."order"` 是保留字 → 改名 `sort_order`，并补 `UNIQUE(photo_id, sort_order)`。
- `is_admin()`/`user_is_blocked()`（`:587-623`）改为 `language sql stable security definer`，策略中写成 `(select public.is_admin())` —— 当前是 VOLATILE plpgsql，在 ~15 条策略里逐行执行。
- `config` 表明文存第三方 API key，RLS 目前正确（admin-only, `:847`），但建议迁移到 Supabase Vault。
- 重复的 anon/authenticated SELECT 策略可合并为单条 `to anon, authenticated`。
- `admin/video/` 只有 `+page.svelte` 而 schema 无 `video` 表 —— 确认是占位还是缺表。

---

## P2 — 架构重构

> 这一层没有安全紧迫性，但它决定了 P0 类问题会不会再次发生。建议按 P2-1 → P2-5 顺序，因为后面的重构依赖前面的类型基础。

### P2-1 生成数据库类型（投入产出比最高，先做）

`src/app.d.ts:12` 把 locals 标成裸 `SupabaseClient` 而非 `SupabaseClient<Database>`，且没有 `supabase gen types` 产物。后果是每个 load 函数手写运行时规范化器：`article/[lang]/[page]/+page.server.ts:11-76` 是 65 行 `typeof x !== 'number'` 守卫，`photo/[lang]/[page]/+page.server.ts:12-121` 是另外 110 行几乎相同的守卫，`comment/[page]/+page.svelte:11-30` 又内联重声明了一遍行类型。

```bash
supabase gen types typescript --linked > src/lib/types/database.ts
```

然后在 `app.d.ts` 和 `hooks.server.ts` 一次性给 client 加泛型，**删掉约 200 行手写规范化代码** —— 查询结果从源头就有类型。

### P2-2 把写操作移回服务端

当前：读走 `+page.server.ts` 的 `locals.supabase`（正确），但**全部 45 处 `.insert/.update/.delete` 分散在 22 个 `.svelte` 文件里**，直连浏览器端 Supabase。全 repo 唯一的 form actions 是 auth 三件套。

这正是 P0 漏洞的结构性成因：没有服务端写入层 → 无服务端校验 → 正确性完全押在 RLS 上 → 而 RLS 写错了。

有意思的是，`svelte.config.js:17` **已经打开了 `kit.experimental.remoteFunctions`，但项目里一个 `*.remote.ts` 都没有**。要么用起来，要么关掉。

**方案**：每个实体建 form actions（或 remote functions），走 `locals.supabase`，校验失败返回 `fail(400, ...)`。浏览器端 Supabase 只保留给 realtime 和上传。优先迁移危险操作：删除、发布、评论审核。

### P2-3 多步写入加事务

`PhotoEditor.svelte:76-186` 保存相册的流程是：update `photo` → **删光全部 `photo_image` 行**（`:112-119`）→ 重新插入（`:182`），三次独立的浏览器调用。删除成功后若插入失败，相册的图片与排序**永久丢失**。thought 保存有同类风险。

**方案**：写一个 Postgres 函数 `save_photo_with_images(photo_data jsonb, images jsonb)` 用 `supabase.rpc()` 调用，让"先删后插"在单个事务内原子完成。

### P2-4 消除重复代码

| 重复                 | 位置                                                                                                                                                            | 方案                                                                                                                                                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 分页逻辑复制 8 处    | `thought:5-40`、`media:5-35`、`comment:5-52`、`users:4-31`、`article/[lang]:84-111`、`photo/[lang]:123-163`、book、message                                      | 抽 `getPagination(url, params, defaultLimit)` + `paginatedQuery()` 到 `src/lib/server/`。默认 limit 目前在 10/12/16/24 之间随意漂移。另注意 `path = url.pathname.substring(0, url.pathname.indexOf(page) - 1)` 很脆弱（页码若更早出现在路径中就会出错），改用 `url.pathname.replace(/\/\d+$/, '')` |
| AI 管道代码整份复制  | `ArticleEditor.svelte` 与 `PhotoEditor.svelte` **各自定义了全部五个** `generateSlug`/`generateAbstract`/`generateTags`/`getTranslation`/`checkSlug`，约 300 行  | 抽到 `src/lib/functions/aiActions.ts`（它们只是对 `/api/*` 的 fetch）                                                                                                                                                                                                                              |
| 元数据侧栏结构相同   | 两个编辑器的 slug/分类/话题/封面/发布控件                                                                                                                       | 抽成 `ContentMetaPanel` 组件                                                                                                                                                                                                                                                                       |
| new 与 edit 路由重复 | thought/new vs edit 在 ~330 行中仅差 63 行；book 差 45/~220；category 差 69/~230；`photo/new/+page.server.ts`(312行) 与 `photo/edit/[id]`(236行) 共享大部分查询 | 用接受 `mode: 'new' \| 'edit'` 的单一编辑器组件（Article/Photo 已这么做，扩展到 thought/book/category）+ 共享 `loadArticleForEditor(supabase, { id \| copyFrom })`                                                                                                                                 |

**巨型组件行数**（拆分目标：编辑器降到 300 行内）：
`PhotoEditor.svelte` 1029 ｜ `ArticleEditor.svelte` 926 ｜ `editor/Tiptap.svelte` 729 ｜ `image/ImageGrid.svelte` 448 ｜ `image/AIImageGenerator.svelte` 361 ｜ `editor/ImagesModel.svelte` 354

### P2-5 迁移到 Svelte 5 runes

0 个文件使用 runes，103 个文件用 `export let`，到处是 `$:`。`svelte.config.js:8` 甚至钉死了 `runes: undefined` 同时又开启 `compilerOptions.experimental.async` —— 最前沿的开关配三年前的写法。

legacy 模式造成的实际别扭：`thought/edit/[id]/+page.svelte:24-32` 先初始化 `imagesModelData` 再用 `$:` 立刻重新赋值（同样的模式在 `ArticleEditor.svelte:94-95,108-109` 重现）；靠整对象重新赋值（`thoughtContent = { ...thoughtContent, images: … }`）强制响应更新，而 `$state` 的深层响应让这完全没必要。

**建议在 P2-4 组件瘦身之后再做** —— 机械工作，但在 1000 行组件上做风险大。完成后打开 `runes: true` 揪出遗留写法。

### P2-6 错误处理统一

- `article/[lang]/[page]/+page.server.ts:81` 的 `throw error(303, 'Unauthorized')` —— **303 不是错误状态码**，SvelteKit 的 `error()` 期望 4xx/5xx。应为 `redirect(303, '/auth/login')`；而且 `hooks.server.ts:52-76` 已守卫所有非 auth 路由，这行本就多余。其他 admin load 都不重复检查 session，故此处既错又不一致。
- count 查询的错误被静默吞掉（`thought/[page]/+page.server.ts:9-10` 解构 `{ count }` 不检查 error，而数据查询的 error 却处理了）；`article/[lang]:123-125` 的 `languagesError` 只 `console.error`，页面照常渲染出空的语言切换器。
- `article/edit/[id]/+page.server.ts:42,48` 在未检查的 `find()` 后用 `currentLanguage!.id` 非空断言 —— 语言行被删会导致未处理的 500。
- `hooks.server.ts:20-43` 的 `safeGetSession` 吞掉所有错误，Supabase 故障会变成无日志的无限登录跳转；且**每个请求**（含预取和静态资源）都走一次 `getUser()` 网络往返，而 `admin/+layout.server.ts` 与根 layout 又各调一次。建议按 event 缓存 + 记录非 auth 错误。

**统一约定**：必需数据 `throw error(500/404)`，可选数据显式兜底，禁止对 `find()` 结果用 `!`。

---

## P3 — 产品与 UX

### P3-1 【最高产品优先级】保护写作成果

`ArticleEditor.svelte` 只有手动保存，虽有 `beforeunload` 和 `beforeNavigate` 确认（`:532-545`），但：

1. **无草稿自动保存**。浏览器崩溃或误点"离开"就丢失上次手动保存后的全部内容。连 Cmd+S 快捷键都没有（编辑器内无任何 `metaKey`/`ctrlKey` 处理）。→ 加 debounced localStorage 自动保存（重载时恢复）+ 已存在草稿的定期 DB 自动保存。**S–M**
2. **【Bug】保存失败时 `isChanged` 被设为 false**（`ArticleEditor.svelte:157`，insert 的错误分支）—— 已亲自核实：错误分支设 `isChanged = false`，而成功分支反而不设。逻辑完全颠倒。后果是保存失败后"保存"按钮变灰、导航守卫失效，**恰好在用户内容未保存的时刻**。→ 只在成功时清除 `isChanged`。**S**
3. **无冲突处理**。`saveArticle()` 直接覆盖，两个标签页编辑同一篇文章会静默 last-write-wins。→ 保存前用加载时的 `updated_at` 做乐观锁（`.eq('updated_at', loadedValue)`），不匹配则提示。**S**
4. **发布按钮令人困惑**。同一按钮显示 发布/取消发布，但成功 toast 恒为 "Article published successfully"（`:243`）—— 取消发布时也这么说。且 `publishArticle()` 先调 `saveArticle()` 再做第二次 update，两次往返两个 toast。→ 拆分状态、修正文案、合并为单次写入。**S**
5. **无预览**。全代码库无任何"在站点查看"或草稿预览链接。→ 用 `BASE_URL` + lang + slug 拼预览链接。**S–M**
6. **slug 检查无防抖**（`:592-597` 的 `on:input` → `checkSlug`），每次失败都弹 toast —— 打字会引发 toast 风暴。且 `onMount` 会检查新文章的默认 slug（一个日期字符串），正则不通过，一进页面就报错。→ 防抖 400ms，只用已存在的行内提示，去掉 toast。**S**
7. **新文章预填了字面占位内容** —— `title: 'title'`、正文"开始书写你的文章吧"（`article/new/+page.server.ts:45-72`）。忘了改就会发布出标题为 "title" 的文章。→ 改用空值 + placeholder 属性，保存前校验标题/slug 非空。**S**
8. 无字数统计/阅读时长（`content_text` 已在 state 里，几乎免费）。**S**
9. 链接与嵌入用 `window.prompt()` 编辑（`Tiptap.svelte:467-484,514-542`），无法编辑链接文本或设置新窗口打开。**M**

### P3-2 多语言：用 slug 做外键是设计缺陷

翻译变体靠 **slug 相等** 来发现：`article/edit/[id]/+page.server.ts:52-57` 查询 `slug = 当前slug AND lang != 当前lang`（已核实）。

一旦你改了某个变体的 slug（SEO 编辑迟早会做，而且 slug 本就该随语言不同），语言关联**静默断裂**，侧栏又会显示"+ en"让你创建出重复文章。而 AI slug 生成功能恰恰在鼓励这种分化。

**修复**：加 `translation_group` UUID 列，变体共享同一个值，按它关联。迁移是一条 `UPDATE ... GROUP BY slug`。**M，结构性修复中价值最高的一个。**

其他：

- 翻译按钮**只翻正文**，标题/副标题/摘要/话题仍是源语言，需手工重做。→ 一个"全部翻译"动作。**S–M**
- 翻译按 chunk 串行且无单 chunk 重试 —— 第 18/20 块失败会回滚整个正文（`:515-523`）。→ 保留已成功的块，提供重试。**S**
- 导航硬编码 `/admin/article/zh/1` 和 `/admin/photo/zh/1`（`NavItems.svelte:25-26`），完全忽略数据库里的默认语言设置。**S**

### P3-3 【最危险的媒体缺口】删图片前不检查引用

封面 FK 是 `ON DELETE SET NULL`（`init.sql:70,112,189`），封面会静默消失；而正文 `content_html`/`content_json` 里内嵌的图片**没有任何 FK**，删除后已发布文章里的图片直接 404，全程零警告。

→ 删除前查询封面引用 + `content_html ILIKE '%storage_key%'`，显示"被 N 篇文章使用"。**M**

其他媒体问题：

- **上传错误处理是坏的**（`UploadFile.svelte`）：`fetch('/api/image')` 的响应被赋值但从不检查 `response.ok`，502 也照样弹"图片上传成功"；未选文件时的提前 `return` 让 `isLoading` 永远卡在 true；提示说"最多 10 个文件"但代码判断 `> 15`。15 个文件上传只有一个转圈，无单文件进度。**S–M**
- **双重删除竞争**（`ImageGrid.deleteImages()` `:65-106`）：既通过 supabase 删数据库行，又调 `/api/image` DELETE 按 storage_key 删同样的行 —— 冗余且会产生令人困惑的部分失败。→ 只走 API 路由。**S**
- **无媒体搜索/筛选**：无文件名搜索，`folder` 列存在但恒为 `'default'`。几百张图之后，24/页的网格翻页是唯一的查找方式。**S**
- 批量删除无确认（对比：评论删除**有**确认，`comment/[page]/+page.svelte:116`）。**S**

### P3-4 AI 功能

现状不错：`/api/abstract`、`/api/tags`（结构化 JSON schema 输出）、`/api/translation`、`/api/slug`、`/api/generate-image` 共用 `createGatewayOpenAI`（`src/lib/server/ai.ts`）；`/api/img-alt` 用 Workers AI + CF 图片缩放控制内存；设置页（`setting/AI.svelte`）支持编辑 prompt、按任务从实时拉取的模型列表选模型并有兜底 —— 对个人工具来说是相当好的模型配置体验。

问题：

- **prompt 强制依赖数据库**，若 `prompt_SEO` 等从未配置，每个功能都 500 报"prompt not configured"。→ 在代码里内置默认 prompt 兜底（img-alt 的 `DEFAULT_PROMPT` 已是这个做法）。**S**
- **客户端不检查 HTTP 错误**：`generateSlug`/`generateAbstract` 直接 `fetch(...).then(res => res.text())`（`ArticleEditor.svelte:328-334,364-370`）—— 500 会把 SvelteKit 错误页的 HTML **写进 slug 输入框**。**S**
- `generate-image` 硬编码 `model: 'gpt-5'`，img-alt 的模型与 gateway id `"shinano"` 也是硬编码，与其他可配置模型的设计不一致。→ 移入 config 表。**S**
- 无流式输出。摘要/翻译阻塞到完成。对单作者可接受；摘要流式写入 textarea 是唯一值得做的。**M**

### P3-5 导航与信息架构

1. **全站没有任何内容搜索**（已核实：零 `ilike`/`textSearch`）。找一篇旧文章只能在按语言过滤的 16 行表格里翻页。对有数年内容的博客，这是日常最大的摩擦。→ 文章列表加标题/slug 搜索框（一个 `ilike` 查询，半天工作量）；豪华版是全局跳转命令面板。**S / M**
2. **列表无筛选无排序**：不能按草稿/已发布/分类筛选，不能按日期排序。列表显示状态徽章但不能据此选择。**S–M**
3. **分页组件有 bug**（`Pagination.svelte`）：第 1 页的"上一页"链到第 0 页；最后一页的"下一页"越界（`:77-79,106-108`）；改每页条数的 `<select>` 只在客户端重算页码数组而不导航，点了没反应直到你再点一个页码。另外 `:43` 有残留的 `console.log(targetPage)`。**S**
4. **文章列表的单行删除无确认**（`:58-78`）—— 一次误点永久销毁一篇文章（且无回收站）。**S**
5. 导航高亮用精确 `pathname ===` 匹配（`NavItems.svelte:44`），在 `/admin/article/edit/5` 时什么都不高亮。→ 前缀匹配。**S**
6. 仪表盘依赖统计快照表，否则显示"统计数据尚未生成"；没有"继续编辑最新草稿"或"最近评论"这类对单人博主最有用的入口。**S–M**

### P3-6 可访问性与后台 i18n

- **UI 语言中英混杂**：中文标签（标题、保存、删除）配英文 toast（"Article saved successfully"）、英文空状态（"No articles"）、英文登录页，`Pagination.svelte` 里 "{count} items total" 紧挨着"输入页面编号..."。同一文件内也混：`PhotoEditor.svelte` 有 `'Photo saved successfully.'`(104) 和 `'请先填写标题。'`(408)。→ 单人使用的话**不必上 i18n 库，选定一种语言并统一文案**即可，抽一个 `src/lib/messages.ts` 常量映射让文案可 grep。**S**
- `Tiptap.svelte:648-673` 的工具栏按钮只有 `title`，无 `aria-label`、无表示激活态的 `aria-pressed`。`EditImage.svelte` 声明了 `role="dialog" aria-modal="true"` 但**所有模态框都没有焦点陷阱和 Esc 关闭**。**S–M**
- **表单校验基本不存在**：input 上写了 `required` 但没有任何东西通过 form 提交，所以 `required` 永不触发；slug 已被占用时 `slugExists` 只显示不阻止保存。**S**
- 全选复选框直接操作 DOM（`document.querySelectorAll`，文章列表 `:82` 和 `ImageGrid:230` —— 后者抓的是**页面上所有**复选框而不只是图片的）。→ 绑定到数据状态。**S**

---

## P4 — 测试与工程卫生

### P4-1 测试现状：只有骨架

- Playwright 只有一个文件 `tests/auth.test.ts`（登录重定向、登录表单渲染、需凭据的登录/登出流程）。`tests/unit/` 是**空目录**。
- Vitest：`src/index.test.ts` 字面上就是 `1 + 2 === 3`（删掉）；真正的单元测试在 `src/lib/functions/__tests__/`（dateFormat、fileSize、shutterSpeed）和 `src/lib/server/__tests__/ai.test.ts`。

**完全未测试的关键流程**：文章创建/保存/发布/删除、翻译变体流程、slug-check API、图片上传/EXIF/删除（含 R2 与 DB 的一致性逻辑）、所有 AI 端点的错误路径、`htmlChunk` 切分（翻译流程依赖它）。

**手写逻辑最多、最该测的纯函数**：`r2.ts` 的 `stripExifSegments`、`/api/image` 的 GPS 解析、`splitHtmlByTopLevelNodes`。

**优先级**：(1) 上述三个纯函数的单元测试 **S** → (2) 针对种子测试库的 Playwright 文章 创建→保存→发布→删除 全流程 **M** → (3) **P0 修完后补 RLS 策略测试**（用不同角色的 token 断言越权操作失败）—— 考虑到本次审查中 3 个严重问题都出在 RLS，这是投入产出比最高的测试。

### P4-2 工程卫生

- `.idea/.gitignore` 已被提交 → 把 `.idea/` 加进 `.gitignore` 并 `git rm --cached`。
- `test-results/` 与 `playwright-report/` 不在 `.gitignore`（当前为空未被跟踪，但跑一次测试就会被提交）。
- `src/.DS_Store` 和 `src/migration/.DS_Store` 已存在 → 确认 `.DS_Store` 在 `.gitignore` 中。
- `resend` 在 dependencies 中但**从未 import**（只有 `setting/APIs.svelte` 里的一个 UI 标签）→ 移除。
- `svelte.config.js` 清理：`:3` 导入的 `svelte-preprocess` 从未使用（连同依赖一起删）；`:8` 的 `runes: undefined` 是空操作；`:22` 的别名 `$types: './src/types'` 指向**空目录**（真实类型在 `src/lib/types`）且与 SvelteKit 生成的 `./$types` 概念冲突 → 删别名和空目录。
- `README.md:46-47,63` 记录的 `WORKERS_URL`/`WORKERS_TOKEN` 在 `src/` 中**已无任何引用** —— 过期文档，删掉以免有人白配一个 token。README 里 "Node.js 20+" 也与 `package.json` 的 `>=22` 矛盾。
- `playwright.config.ts:6-15` 手写正则解析 `.env.local`（会丢掉带引号的值和 `export` 前缀）→ 用 dotenv。
- 无环境变量校验：`URL_PREFIX` 在 17 个文件里直接从 `$env/static/private` 导入 → 加一个 `src/lib/server/env.ts` 做启动断言，让 Cloudflare 上的失败信息更清晰。
- `ArticleEditor.svelte:221-224` 的时区处理：`new Date(date.toLocaleString('en-US', { timeZone: tz }))` 绕经 locale 字符串来"应用"时区，这是有损且实现相关的行为，而 `:119` 已经在用正确的 `new Date(localTime).toISOString()`。

---

## P5 — 值得新增的功能（按单人 CMS 的合理规模）

1. **内容搜索**（P3-5.1）—— **S**，日常收益最大。
2. **草稿自动保存 + 本地恢复**（P3-1.1）—— **S–M**。
3. **软删除 / 回收站** —— article/photo/thought 加 `deleted_at`，列表过滤，加回收站视图和恢复。考虑到目前除评论外**所有删除都无确认**，这是廉价保险。**M**
4. **定时发布** —— schema 已有 `published_at`，编辑器已有日期时间选择器，只差把 `is_draft=false AND published_at > now()` 当作"已排期"处理（前台查询改动 + 列表加"已排期"徽章）。几乎免费。**S**
5. **轻量版本历史** —— `article_revision` 表，每次保存写一条（反正已经在发送整行），保留最近 N 条，一个"恢复"按钮。对单作者而言，这一个功能就替代了全部企业级工作流。**M**
6. **翻译分组**（P3-2）—— **M**。

**明确不建议做**（对本场景是企业级臃肿）：操作审计日志、细粒度角色权限、编辑工作流状态机、Webhook 配置界面、专门的全文搜索基础设施（个人博客规模用 Postgres `ilike` 完全够）。

---

## 附：如果只做五件事

1. **P0-1 + P0-2**（两条 SQL）—— 堵住提权和评论批量删除，这是完全沦陷级别的。
2. **P0-4 的 `/api` 统一守卫**（`hooks.server.ts` 一处改动）—— 顺带覆盖 P0-3 和 P0-6 的大半。
3. **P0-5 的 PII 收敛** —— GDPR 相关，且是被动泄露（不需要攻击者做任何事）。
4. **P1-1 + P1-2**（修尾逗号 + 建立 supabase CLI 迁移）—— 否则上面三条修复本身也无法被可靠地复现和审计。
5. **P3-1.2 的 `isChanged` bug**（一行）—— 一行代码，保护的是这个产品的核心资产：写作内容。
