.PHONY: dev

# | 部分 | 含义 |
# |---|---|
# | `docker compose` | 统一管理项目的多个容器 |
# | `-f compose.dev.yaml` | 告诉文件路径，使用开发环境配置 |
# | `up` | 创建并启动服务 |
# | `--watch` | 监听代码变化，自动同步、热更新或重启 |

dev:
	docker compose -f compose.dev.yaml up --watch
