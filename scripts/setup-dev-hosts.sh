#!/bin/bash
# 将博客开发域名映射到本机。macOS 会提示输入管理员密码。
set -eu
if [ "$(id -u)" -ne 0 ]; then
  exec sudo /bin/bash "$0"
fi

domains="dev.retniw.cc admin.dev.retniw.cc api.dev.retniw.cc"
# 检查现有映射，避免覆盖用户已有配置。
for domain in $domains; do
  if ! awk -v name="$domain" '{ sub(/#.*/, ""); for (i=2; i<=NF; i++) if ($i==name && $1!="127.0.0.1") exit 1 }' /etc/hosts; then
    echo "$domain 已有其他映射，请先检查 /etc/hosts。" >&2
    exit 1
  fi
done
cp -p /etc/hosts "/etc/hosts.kakozane-backup-$(date +%Y%m%d%H%M%S)"
# 仅移除本脚本写入的旧开发域名，保留其他 hosts 配置。
sed -i '' -E '/^127\.0\.0\.1[[:space:]]+(dev|admin\.dev|api\.dev)\.kakozane\.icu[[:space:]]+# kakozane development[[:space:]]*$/d' /etc/hosts
for domain in $domains; do
  if ! awk -v name="$domain" '{ sub(/#.*/, ""); for (i=2; i<=NF; i++) if ($i==name) found=1 } END { exit !found }' /etc/hosts; then
    printf '\n127.0.0.1\t%s # kakozane development\n' "$domain" >> /etc/hosts
  fi
done
dscacheutil -flushcache
killall -HUP mDNSResponder
echo "开发域名已映射到本机。"
