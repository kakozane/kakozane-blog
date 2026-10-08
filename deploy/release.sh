#!/usr/bin/env bash
# 在服务器 /opt/blog 执行；只使用 GitHub SHA 镜像，失败时退出并保留备份。
set -euo pipefail
cd /opt/blog
exec 9>.deploy.lock
flock -n 9 || { echo '另一部署正在运行'; exit 1; }
tag=${1:?需要提交 SHA}
[[ "$tag" =~ ^[0-9a-f]{40}$ ]] || { echo '无效 SHA'; exit 1; }
export IMAGE_TAG="$tag"
export ACR_REGISTRY=crpi-hbv9ky04safnech7.cn-beijing.personal.cr.aliyuncs.com
export ACR_NAMESPACE=retniw
stage="releases/$tag"
test -f config.yaml
test -f "$stage/compose.yaml"
# 先验证和拉取全部镜像，此时不修改运行中的服务。
cp "$stage/compose.yaml" compose.next.yaml
docker compose -f compose.next.yaml config -q
docker compose -f compose.next.yaml pull
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
umask 077
# 数据库迁移自动运行前备份。镜像回滚不能撤销数据库迁移。
docker compose -f /opt/blog-infra/compose.yaml exec -T mysql sh -c \
  'MYSQL_PWD=$(cat /run/secrets/mysql-root) exec mysqldump -uroot --single-transaction --routines --triggers --events --databases kakozane_blog' \
  > "backups/mysql-$stamp.sql.tmp"
mv "backups/mysql-$stamp.sql.tmp" "backups/mysql-$stamp.sql"
if docker volume inspect blog-production_media_data >/dev/null 2>&1; then
  media=$(docker volume inspect blog-production_media_data --format '{{.Mountpoint}}')
  tar -czf "backups/media-$stamp.tar.gz" -C "$media" .
fi
if [ -f .env ]; then cp .env "backups/release-$stamp.env"; fi
if [ -f compose.yaml ]; then cp compose.yaml "backups/compose-$stamp.yaml"; fi
if [ -f Caddyfile ]; then cp Caddyfile "backups/Caddyfile-$stamp"; fi
mv compose.next.yaml compose.yaml
cp "$stage/Caddyfile" Caddyfile
# 显式初始化管理员；重复执行不会重置密码。
docker compose run --rm --no-deps api /bootstrap
docker compose up -d --wait --wait-timeout 180
# 兼容 Alibaba Cloud Linux 3 的 curl 7.61，避免使用新版 --retry-all-errors。
for url in http://127.0.0.1:6325/api/v1/health http://127.0.0.1:6325/ http://127.0.0.1:6326/; do
  curl --fail --silent --show-error --connect-timeout 3 --max-time 15 \
    --retry 6 --retry-delay 3 --retry-connrefused "$url" >/dev/null
done
printf 'ACR_REGISTRY=%s\nACR_NAMESPACE=%s\nIMAGE_TAG=%s\n' "$ACR_REGISTRY" "$ACR_NAMESPACE" "$tag" > .env.next
mv .env.next .env
printf '%s\n' "$tag" > current-release
printf 'Deployment healthy: %s\n' "$tag"
