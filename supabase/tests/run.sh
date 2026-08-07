#!/usr/bin/env bash
# ============================================================================
# 在一次性的本地 Postgres 里重放全部迁移，并断言它们的行为。
#
#   ./supabase/tests/run.sh
#
# 为什么需要它：迁移是直接对生产库执行的，而这个项目已经吃过一次亏——
# init.sql 与生产库漂移，导致按文件编写的迁移在生产库上报错。在拿到
# `supabase db pull` 的基线之前，本地重放是唯一能在动生产库之前发现问题的手段。
#
# 它确实抓到过东西：P1-3 最初把"补选下一个默认语言"写在 BEFORE DELETE 里，
# 在本地一跑就炸（tuple to be deleted was already modified），改成 AFTER DELETE 才对。
#
# 依赖：Docker。第一次运行会拉 postgis 镜像。
#
# ⚠️ 起点是 legacy/init_snapshot.sql——它是**近似**生产库，不是生产库本身。
#    等 `pnpm db:pull` 生成 <时间戳>_remote_schema.sql 之后，把 SCHEMA_SOURCE
#    改成那个文件，这套测试才算真正对着生产库形态跑。
# ============================================================================
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPA="$(dirname "$HERE")"
SCHEMA_SOURCE="$SUPA/legacy/init_snapshot.sql"
CONTAINER=shinano-migration-test
IMAGE=postgis/postgis:16-3.4
DB=migrations_test

psql_run() { docker exec -i "$CONTAINER" psql -U postgres -d "$1" -v ON_ERROR_STOP=1 -q; }

# --- 容器 ---------------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker 没在运行" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1
  echo "▸ 启动 $CONTAINER ..."
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
fi

# 必须走 TCP 探活。postgres 镜像在初始化阶段会先起一个**只监听 unix socket** 的
# 临时服务器跑 init 脚本，跑完再关掉重启——用默认的 socket 探活会连上那个临时服务器，
# 迁移跑到一半服务器就被关了（"terminating connection due to administrator command"）。
until docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 1; done

docker exec "$CONTAINER" psql -U postgres -q \
  -c "drop database if exists $DB;" -c "create database $DB;" >/dev/null

# --- 基线 schema ---------------------------------------------------------
# 从快照里剥掉托管环境专有的部分：pg_cron（本地镜像没有）和文件末尾的调试 SELECT。
# uuid_generate_v4() 在 Supabase 里位于 extensions schema。
build_fixture() {
  cat "$HERE/00_prelude.sql"
  awk '/^-- 定时任务/{skip=1} /^-- 阅读量/{skip=0} /^-- 验证函数创建成功/{exit} !skip' "$SCHEMA_SOURCE" \
    | sed 's/uuid_generate_v4 ()/extensions.uuid_generate_v4()/g'
}

fail=0
step() {
  local label="$1"; shift
  local out; out=$("$@" 2>&1); local rc=$?
  if [ $rc -ne 0 ]; then
    echo "❌ $label"; echo "$out" | tail -8; fail=1
  else
    echo "✅ $label"
    echo "$out" | grep -i "^WARNING" | sed 's/^/   /'
  fi
}

echo "▸ 建立基线 schema（$(basename "$SCHEMA_SOURCE")）"
FIXTURE="$(mktemp -t shinano-fixture)"
trap 'rm -f "$FIXTURE"' EXIT
build_fixture > "$FIXTURE"
step "schema" bash -c "docker exec -i $CONTAINER psql -U postgres -d $DB -v ON_ERROR_STOP=1 -q < '$FIXTURE'"

echo "▸ 种子数据（含已确认的生产库漂移：comment 无 upvote/downvote）"
step "seed" bash -c "docker exec -i $CONTAINER psql -U postgres -d $DB -v ON_ERROR_STOP=1 -q < '$HERE/01_seed.sql'"

echo "▸ 按顺序重放迁移"
for f in "$SUPA"/migrations/*.sql; do
  step "$(basename "$f")" bash -c "docker exec -i $CONTAINER psql -U postgres -d $DB -v ON_ERROR_STOP=1 -q < '$f'"
done

echo "▸ 断言"
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 < "$HERE/02_assert.sql" 2>&1 \
  | grep -v "^$\|^-\+\|row)\|^ *check *|" \
  | awk -F'|' '
      /NOTICE/ { print "   " $0; next }
      NF < 3   { print "   " $0; next }
      {
        gsub(/^[ \t]+|[ \t]+$/, "", $2); gsub(/^[ \t]+|[ \t]+$/, "", $3);
        gsub(/^[ \t]+|[ \t]+$/, "", $1);
        if ($2 == $3) printf "   ✅ %s\n", $1;
        else { printf "   ❌ %s：得到 %s，期望 %s\n", $1, $2, $3; bad=1 }
      }
      END { if (bad) exit 1 }
    '
[ ${PIPESTATUS[1]:-0} -ne 0 ] && fail=1

echo
if [ $fail -eq 0 ]; then
  echo "全部通过。容器 $CONTAINER 仍在运行，可以直接连上去看："
  echo "  docker exec -it $CONTAINER psql -U postgres -d $DB"
else
  echo "有失败项，见上。"
fi
exit $fail
