# 数据库变更工作流

这个目录是 schema 的**唯一权威来源**。`src/migration/init.sql` 已被降级为
`supabase/legacy/init_snapshot.sql`（只当历史文档看，不要执行、不要再编辑）。

之所以要建立这套工作流，是因为 2026-08-07 的审查中实测确认：手工维护的 `init.sql`
与生产库已经漂移（它声明了 `comment.upvote` / `comment.downvote`，生产库根本没有这两列；
`gallery_feed` 在库里早已是 `security_invoker`，文件里却写着相反的内容）。
在没有可信 schema 记录之前，任何 schema 改动都是在猜。

---

## 目录结构

| 路径                        | 用途                                                            |
| --------------------------- | --------------------------------------------------------------- |
| `migrations/`               | 版本化迁移，按文件名时间戳顺序执行。**只增不改**                |
| `config.toml`               | Supabase CLI 配置（本地开发容器、Auth、Storage 等）             |
| `inspect_schema.sql`        | 只读探查脚本，粘进 SQL Editor 就能拿到生产库的真实形态          |
| `legacy/init_snapshot.sql`  | 历史快照，仅供考古。**不要执行**                                |

CLI 已作为 devDependency 安装，所有命令都通过 `pnpm` 调用，无需全局安装。

---

## 首次设置（一次性，需要你的凭据）

```bash
pnpm exec supabase login                 # 浏览器授权，生成 personal access token
pnpm db:link --project-ref <project-ref> # project-ref 见 Supabase 控制台 URL
pnpm db:pull                             # 把生产库真实状态基线化到 migrations/
```

`db:pull` 会生成 `migrations/<时间戳>_remote_schema.sql`。这个文件就是**基线**——
第一份可信的 schema 记录。拿到之后，把它和 `legacy/init_snapshot.sql` 对比一遍，
所有漂移会一次性暴露出来。

> `db:pull` 会把已有的迁移文件视为"已应用"并写入远端的 `supabase_migrations.schema_migrations`
> 表。如果 `migrations/` 里的某个文件其实还没在生产库跑过，先跑它，再 pull。

## 日常变更

```bash
# 1. 本地起一份和生产库同构的数据库（需要 Docker）
pnpm exec supabase start
pnpm db:reset                    # 按 migrations/ 顺序重建，验证迁移可重放

# 2. 改 schema：可以直接在本地 Studio 里点，也可以手写 SQL
# 3. 把改动固化成迁移文件
pnpm db:diff <描述性名称>        # 生成 migrations/<时间戳>_<名称>.sql

# 4. 本地验证：从零重放全部迁移，确认没有依赖顺序问题
pnpm db:reset

# 5. 推到生产
pnpm db:push
```

## 生成数据库类型（P2-1 会用到）

```bash
pnpm db:types                    # → src/lib/types/database.ts
```

---

## 没有 Docker / 不想用 CLI 时的降级方案

`migrations/` 下的每个文件都写成**可以直接粘进 Supabase SQL Editor 执行**的形式：
自带 `begin/commit`，涉及列名的地方从 `information_schema` 实时读取，重复执行安全。

代价是远端的 `supabase_migrations.schema_migrations` 表不会记录这次执行，
之后第一次 `db:push` 会试图重跑。补救办法是手工登记：

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('20260807010000', 'p1_data_integrity')
on conflict do nothing;
```

（`version` 就是文件名的时间戳前缀。）

---

## 硬性约定

1. **不再手改 `legacy/init_snapshot.sql`**，也不要直接在 Supabase SQL Editor 里改
   schema 而不留迁移文件 —— 这正是当初漂移的成因。
2. **迁移文件只增不改**。已经在生产库跑过的文件视为不可变，改错了就再写一个新文件修。
3. **每个迁移都要能在事务里整体回滚**（除少数 `create index concurrently` 之类的例外，
   这类操作单独成文件并在文件头注明）。
4. **涉及既有列/策略/索引的迁移一律写成自适应形式**（`if exists` / 查 `information_schema`），
   在基线建立之前尤其如此。
