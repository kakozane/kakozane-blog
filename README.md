# Kakozane Blog

一个仓库、三个应用：Go/Gin API、React Router SSR 博客前台、React/Vite 管理后台。前端统一使用 pnpm，依赖版本记录在各自的 `pnpm-lock.yaml` 中。

## 技术栈与访问路径

| 应用 | 技术 | 入口 |
| --- | --- | --- |
| 博客前台 `web/` | React、React Router 框架模式、Vite、Tailwind CSS、按需使用 shadcn/ui | <https://localhost:6325/>，由 Node 服务端渲染 |
| 管理后台 `admin/` | React、Vite、Ant Design | <https://localhost:6326/>，静态文件 |
| 后端 `api/` | Go、Gin、MySQL、Redis | <https://localhost:6324/api/v1/health>，接口统一以 `/api/v1` 开头 |

Caddy 在 6324、6325、6326 提供 HTTPS；前台、后台的 `/api/*` 请求同源代理给 Gin 服务。本项目的 Compose **不会启动 MySQL 或 Redis**：它复用本机已有的 `mysql`（3306）和 `redis`（6379）容器，通过 `host.docker.internal` 访问其宿主机映射端口。

## 文件说明

### 仓库根目录

| 文件 | 作用 |
| --- | --- |
| `README.md` | 项目结构、启动和验证说明。 |
| `LICENSE` | MIT 开源许可证。 |
| `.gitignore` | 排除密码文件、依赖目录、构建产物等。 |
| `.dockerignore` | 排除代理镜像构建上下文中的无关文件和密码。 |
| `compose.yaml` | 编排 API、SSR 前台和 Caddy 代理；持久化本地 HTTPS 证书。 |
| `Dockerfile.proxy` | 使用 pnpm 构建管理后台，再把静态文件复制进 Caddy 镜像。 |
| `Caddyfile` | 为三个端口启用本地 HTTPS，提供前后台页面及同源 API 代理。 |
| `local-ca.crt` | 从本机 Caddy 导出的公共根证书，供本机手动信任；不提交仓库。 |

### `api/` 后端

| 文件 | 作用 |
| --- | --- |
| `cmd/server/main.go` | 程序入口：连接 MySQL/Redis，组装依赖并启动 HTTP 服务。 |
| `internal/config/config.go`、`config_test.go` | 读取、校验 YAML 配置及容器环境覆盖；测试缺失配置和端口覆盖。 |
| `internal/router/router.go` | 创建 Gin 路由，集中注册 `/api/v1/health` 等版本化 API 路径。 |
| `internal/handler/health.go` | 处理 `/api/v1/health` HTTP 请求和响应。 |
| `internal/handler/auth.go` | 处理前后台登录、当前用户和退出接口；设置独立的安全 Cookie。 |
| `internal/service/health.go` | 健康检查业务入口及超时控制。 |
| `internal/service/auth.go` | 校验密码和管理员身份，签发随机会话并限制失败次数。 |
| `internal/repository/health.go` | 对 MySQL、Redis 执行实际连接检查。 |
| `internal/repository/auth.go` | 查询用户，并在 Redis 中存取会话和失败次数。 |
| `internal/password/password.go`、`password_test.go` | Argon2id 密码哈希与验证。 |
| `migrations/001_users.sql` | 创建共用的用户表。 |
| `cmd/bootstrap/main.go` | 首次建表并生成管理员账号。 |
| `bootstrap-admin.txt` | 本机生成的初始管理员密码，权限 600，已被 Git 和 Docker 忽略。 |
| `go.mod`、`go.sum` | Go 模块声明与依赖校验记录。 |
| `config.example.yaml` | 后端 YAML 配置模板；复制为 `config.yaml` 后填写真实密码。 |
| `config.yaml` | 本机真实后端配置，已被 Git 和 Docker 构建上下文忽略。 |
| `Dockerfile` | 编译 Go 程序并生成较小的运行镜像。 |
| `.dockerignore` | 防止本地配置、初始密码和日志进入 API 镜像构建上下文。 |

### `web/` 博客前台

| 文件 | 作用 |
| --- | --- |
| `package.json`、`pnpm-lock.yaml` | 前台脚本、依赖及精确锁定版本。 |
| `react-router.config.ts` | 打开 React Router 的 SSR。 |
| `vite.config.ts` | 配置 Vite、Tailwind、React Router 及本地 API 代理。 |
| `tsconfig.json` | TypeScript 编译配置。 |
| `components.json` | shadcn/ui 的组件生成配置。 |
| `pnpm-workspace.yaml` | 仅对刚发布的 Vite 锁定版本放行 pnpm 的默认发布等待期。 |
| `app/root.tsx` | HTML 根布局、全局样式及错误边界。 |
| `app/routes.ts` | 页面路由表。 |
| `app/routes/home.tsx` | 博客首页及页面元信息。 |
| `app/routes/login.tsx` | 前台登录页面。 |
| `app/lib/auth.ts`、`app/types/auth.ts` | 前台认证请求与严格的 TypeScript 类型。 |
| `app/app.css` | Tailwind 入口和全局主题变量。 |
| `app/components/ui/button.tsx` | 已接入的 shadcn/ui 按钮组件示例。 |
| `Dockerfile`、`.dockerignore` | 使用 pnpm 构建 SSR 前台及控制镜像构建内容。 |

### `admin/` 管理后台

| 文件 | 作用 |
| --- | --- |
| `package.json`、`pnpm-lock.yaml` | 后台脚本、依赖及精确锁定版本。 |
| `index.html` | Vite 入口 HTML。 |
| `vite.config.ts` | 配置后台根路径、6326 本地端口及 API 代理。 |
| `tsconfig.json`、`tsconfig.app.json`、`tsconfig.node.json` | TypeScript 项目、浏览器代码和构建配置的类型检查选项。 |
| `.oxlintrc.json` | oxlint 检查规则。 |
| `pnpm-workspace.yaml` | 仅对刚发布的 Vite 锁定版本放行 pnpm 的默认发布等待期。 |
| `src/main.tsx` | 挂载 React 应用。 |
| `src/App.tsx`、`src/router/index.tsx` | 管理后台根组件和路由；未登录时跳转登录页。 |
| `src/pages/Login.tsx`、`src/pages/Dashboard.tsx` | 后台登录页和登录后的起始页。 |
| `src/api/auth.ts`、`src/types/auth.ts` | 后台认证请求与严格的 TypeScript 类型。 |
| `src/index.css` | 后台全局基础样式。 |

## 后端配置和分层

数据库账号、密码以及 Redis 地址都由后端使用，因此配置集中在 `api/config.yaml`，仓库根目录无需再放配置文件。Compose 将该文件只读挂载给 API 容器，并用 `BLOG_*` 环境变量覆盖容器与本机不同的 MySQL/Redis 地址。前台不会接触数据库密码。

当前机器的 `api/config.yaml` 已写入博客专用账号。其他机器首次运行时：

```bash
cp api/config.example.yaml api/config.yaml
# 编辑 api/config.yaml，填写已有 MySQL 中的博客账号和密码
```

需要事先在已有 MySQL 中建立 `kakozane_blog` 数据库及有权限的博客账号。Redis 使用已有容器，当前配置未启用密码。不要提交 `api/config.yaml`。

请求流向是 `router → handler → service → repository`。入口 `cmd/server/main.go` 负责创建数据库客户端，并把它们传给 repository，再把 repository 传给 service，最后把 service 传给 handler 和 router；这就是当前项目的手动依赖注入，不需要额外的 DI 框架。目前只有健康检查，所以 repository 只做真实的 MySQL/Redis 探活；文章等数据操作会随相应功能加入。

## 登录与安全

前后台共用 `users` 表，**管理员可以用同一账号登录两端，普通用户只能登录前台**。两个接口会建立不同的会话，分别使用 `__Host-blog-front` 和 `__Host-blog-admin` Cookie；后台登录还会校验 `role=admin`。前台响应只包含 `id`、`username`、`displayName`，后台才返回 `role` 和 `permissions`。目前权限列表只有已生效的 `admin:access`，文章管理权限会在对应接口实现时加入。

| 用途 | 前台接口 | 后台接口 |
| --- | --- | --- |
| 登录 | `POST /api/v1/auth/login` | `POST /api/v1/admin/auth/login` |
| 当前用户 | `GET /api/v1/auth/me` | `GET /api/v1/admin/auth/me` |
| 退出 | `POST /api/v1/auth/logout` | `POST /api/v1/admin/auth/logout` |

密码通过 HTTPS 传输，数据库只保存加盐后的 Argon2id 哈希。会话令牌由安全随机数生成，Redis 只保存令牌的 SHA-256 摘要，12 小时后失效；浏览器 Cookie 使用 `Secure`、`HttpOnly`、`SameSite=Strict`。登录失败达到 10 次后，该账号需要等待 15 分钟。这里不使用 JWT，所以不需要把签名密钥放进配置或前端；聊天中提供的短字符串没有写入项目。

选择依据：[OWASP 密码存储建议](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)、[OWASP 会话管理建议](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[OWASP TLS 建议](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)。

首次使用时，在 `api/` 目录运行 `go run ./cmd/bootstrap`。它会创建用户表和管理员 `admin`，将随机生成的初始密码写入仅本机可读的 `api/bootstrap-admin.txt`。当前机器已经完成这一步。请妥善保管该文件；目前尚未提供找回密码或注册页面。

## 启动

需要 Docker Desktop，以及正在运行、并映射到宿主机 3306/6379 的 MySQL/Redis 容器。当前机器已满足这些条件。

```bash
docker compose up --build -d
docker compose ps
docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt ./local-ca.crt
curl --cacert local-ca.crt -f https://localhost:6324/api/v1/health
```

本地 Caddy 使用自己的 CA，浏览器首次访问前需要由你将 `local-ca.crt` 导入本机钥匙串并设为信任。随后打开前台 <https://localhost:6325/login>、后台 <https://localhost:6326/login>。仅导出公共根证书，CA 私钥始终留在 Docker 卷内。正式部署时应改用域名和公开可信的 HTTPS 证书。

`docker compose down` 仅停止博客应用容器，**不会停止已有的 MySQL/Redis 容器**，也不会删除保存本地 CA 的卷。

## 本地开发

本机需要 Go 1.26、Node.js 24。两个前端通过 Corepack 使用 `package.json` 指定的 pnpm 版本。先运行 `docker compose down` 释放 6324、6325、6326 端口，再分别启动以下三个开发服务；MySQL、Redis 不受影响。

```bash
cd api
go run ./cmd/server
```

```bash
cd web
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

```bash
cd admin
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

本地开发入口与 Compose 使用相同端口，但 Go/Vite 直跑时是 HTTP，仅用于页面开发和健康检查；登录接口要求 HTTPS，请通过上述 Compose 入口联调真实账号。两个 Vite 开发服务器将 `/api` 请求代理到本地 API。

## 检查

```bash
cd api && go test ./...
cd ../web && corepack pnpm typecheck && corepack pnpm build
cd ../admin && corepack pnpm lint && corepack pnpm build
cd .. && docker compose config -q
```

当前已包含基础登录，文章、注册及密码管理功能尚未实现。正式部署前还需要配置域名、公开可信的 HTTPS 证书和 MySQL 备份。现有 MySQL/Redis 容器的端口与生命周期由其原有配置管理，本项目不会修改它们。
