#!/usr/bin/env bash
# 在服务器 /opt/blog 执行；只使用 GitHub SHA 镜像，失败时退出并保留备份。
set -euo pipefail
cd /opt/blog
exec 9>.deploy.lock
flock -n 9 || { echo '另一部署正在运行'; exit 1; }
tag=${1:?需要提交 SHA}
[[ "$tag" =~ ^[0-9a-f]{40}$ ]] || { echo '无效 SHA'; exit 1; }
# 第二个参数由计划任务生成；只允许这三个服务名，默认全量兼容旧调用。
selection=${2:-api,web,proxy}
[[ "$selection" =~ ^(api|web|proxy)(,(api|web|proxy))*$ ]] || { echo '无效服务列表'; exit 1; }
IFS=, read -r -a services <<< "$selection"
# 读取上次成功版本；兼容旧版只有 IMAGE_TAG 的 .env，绝不 source 配置文件。
version() {
  local value=''
  if [ -f .env ]; then
    value=$(sed -n -E "s/^$1=([0-9a-f]{40})$/\\1/p" .env | tail -n 1)
  fi
  printf '%s' "$value"
}
legacy=$(version IMAGE_TAG)
export API_IMAGE_TAG="$(version API_IMAGE_TAG)"
export WEB_IMAGE_TAG="$(version WEB_IMAGE_TAG)"
export PROXY_IMAGE_TAG="$(version PROXY_IMAGE_TAG)"
API_IMAGE_TAG=${API_IMAGE_TAG:-$legacy}
WEB_IMAGE_TAG=${WEB_IMAGE_TAG:-$legacy}
PROXY_IMAGE_TAG=${PROXY_IMAGE_TAG:-$legacy}
for service in "${services[@]}"; do
  case "$service" in
    api) API_IMAGE_TAG=$tag ;;
    web) WEB_IMAGE_TAG=$tag ;;
    proxy) PROXY_IMAGE_TAG=$tag ;;
  esac
done
for value in "$API_IMAGE_TAG" "$WEB_IMAGE_TAG" "$PROXY_IMAGE_TAG"; do
  [[ "$value" =~ ^[0-9a-f]{40}$ ]] || { echo '首次部署需要选择 all'; exit 1; }
done
export ACR_REGISTRY=crpi-hbv9ky04safnech7.cn-beijing.personal.cr.aliyuncs.com
export ACR_NAMESPACE=retniw
stage="releases/$tag"
test -f config.yaml
test -f "$stage/compose.yaml"
# 先验证完整编排，但只拉取选中的镜像，此时不修改运行中的服务。
cp "$stage/compose.yaml" compose.next.yaml
docker compose -f compose.next.yaml config -q
docker compose -f compose.next.yaml pull "${services[@]}"
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
# 后台/代理未选中时保留现有路由配置，避免顺带部署其他改动。
if [[ ",$selection," == *,proxy,* ]]; then cp "$stage/Caddyfile" Caddyfile; fi
# 显式初始化管理员；重复执行不会重置密码。
if [[ ",$selection," == *,api,* ]]; then docker compose run --rm --no-deps api /bootstrap; fi
# --no-deps 防止更新前端时顺带创建/更新其依赖服务。
# 强制重建的范围仅限选中服务，也确保同 SHA 重试时加载新的挂载配置。
docker compose up -d --no-deps --force-recreate --wait --wait-timeout 180 "${services[@]}"
# 上游容器 IP 可能变化，强制重新加载代理配置；未选中 proxy 时不重建代理容器。
docker compose exec -T proxy caddy reload --config /etc/caddy/Caddyfile --force
# 兼容 Alibaba Cloud Linux 3 的 curl 7.61，避免使用新版 --retry-all-errors。
for url in http://127.0.0.1:6325/api/v1/health http://127.0.0.1:6325/ http://127.0.0.1:6326/; do
  curl --fail --silent --show-error --connect-timeout 3 --max-time 15 \
    --retry 6 --retry-delay 3 --retry-connrefused "$url" >/dev/null
done
# 每个服务分别记录镜像版本；current-release 只表示最近一次发布操作的提交。
printf 'ACR_REGISTRY=%s\nACR_NAMESPACE=%s\nAPI_IMAGE_TAG=%s\nWEB_IMAGE_TAG=%s\nPROXY_IMAGE_TAG=%s\n' \
  "$ACR_REGISTRY" "$ACR_NAMESPACE" "$API_IMAGE_TAG" "$WEB_IMAGE_TAG" "$PROXY_IMAGE_TAG" > .env.next
mv .env.next .env
printf '%s\n' "$tag" > current-release
printf 'Deployment healthy: %s\n' "$tag"
