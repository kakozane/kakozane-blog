# Kakozane Blog

个人博客 Monorepo：`api/` 是 Go/Gin 接口，`web/` 是 React Router SSR 前台，`admin/` 是 React + Ant Design Pro 风格后台。前端统一使用 pnpm 和严格 TypeScript；API 统一以 `/api/v1` 开头。

## 功能

| 区域 | 已实现 |
| --- | --- |
| 前台 | SSR 首页、文章详情、Markdown、搜索、分类/标签、归档、关于页、分页、RSS、站点地图。 |
| 读者 | 注册、登录、退出、修改昵称和密码、评论与回复；新评论需审核。 |
| 后台 | 文章草稿、Markdown 预览和发布、分类、标签、用户、评论审核、图片媒体库、站点设置、个人资料。 |
| 后端 | MySQL、Redis 会话与限流、Argon2id 密码哈希、自动迁移、路由/处理器/服务/仓库分层与手动依赖注入。 |

## 文件与目录

| 路径 | 作用 |
| --- | --- |
| `README.md`、`LICENSE`、`.gitignore` | 项目说明、MIT 许可证和 Git 忽略规则。 |
| `.dockerignore`、`Dockerfile.proxy` | 代理镜像构建排除规则；构建后台并打包 Caddy。 |
| `compose.yaml`、`Caddyfile` | 本地三服务编排及 6324/6325/6326 HTTPS 代理。 |
| `compose.prod.yaml`、`Caddyfile.prod` | 线上独立编排、域名 HTTPS 和 80/443 代理。 |
| `api/config.example.yaml`、`api/config.yaml` | 后端配置模板及实际配置；实际文件不入库。 |
| `api/cmd/server/main.go`、`cmd/bootstrap/main.go` | 启动、探活、迁移、组装依赖；首次创建管理员。 |
| `api/internal/config/`、`password/` | 配置校验、Argon2id 密码处理及测试。 |
| `api/internal/router/`、`handler/` | 版本化路由；HTTP 请求、响应、Cookie 和错误处理。 |
| `api/internal/service/`、`repository/` | 业务规则；MySQL/Redis 查询与图片存储。 |
| `api/internal/model/`、`api/migrations/` | 数据类型；带版本记录的建表 SQL。 |
| `api/Dockerfile`、`go.mod`、`go.sum` | API 镜像、依赖与校验和。 |
| `web/app/routes.ts`、`app/routes/` | 前台页面路由：首页、文章、归档、关于、登录、注册和账号。 |
| `web/app/root.tsx`、`app/app.css` | HTML 根布局、站点数据和前台样式。 |
| `web/app/components/`、`lib/`、`types/` | 组件、服务端和浏览器端请求、TypeScript 类型。 |
| `web/react-router.config.ts`、`vite.config.ts`、`Dockerfile` | SSR、开发构建配置和 Node 镜像。 |
| `admin/src/router/`、`layout/`、`pages/` | 登录保护、ProLayout 菜单及按路由加载的管理页面。 |
| `admin/src/api/`、`types/` | 后台请求函数和模块化 TypeScript 类型。 |
| `admin/src/main.tsx`、`App.tsx`、`index.css` | React 入口、根组件和后台基础样式。 |
| 两个前端的 `package.json`、`pnpm-lock.yaml`、`tsconfig*.json` | 脚本、依赖锁定版本和类型检查配置。 |

配置放在 `api/`，因为数据库密码仅由后端读取。Git 与 Docker 构建上下文会排除 `api/config.yaml`、`api/bootstrap-admin.txt`、依赖和构建产物。

## 本地运行

需要 Docker Desktop，以及已运行并映射至宿主机 3306/6379 的 MySQL/Redis。**本项目不会重复创建这两个容器**。其他机器首次运行时，先创建 `kakozane_blog` 数据库和专用账号：

```bash
cp api/config.example.yaml api/config.yaml
# 编辑 api/config.yaml，填入博客数据库账号与密码
cd api && go run ./cmd/bootstrap && cd ..
docker compose up --build -d
docker compose ps
```

当前机器已初始化；重复运行 bootstrap 不会重置管理员密码。初始密码在 `api/bootstrap-admin.txt`，权限为 600，登录后请修改。API 启动时会自动应用未执行的 `api/migrations/*.sql`。

| 地址 | 用途 |
| --- | --- |
| <https://localhost:6325/> | 博客前台。 |
| <https://localhost:6326/> | 管理后台。 |
| <https://localhost:6324/api/v1/health> | API 探活。 |

本地 Caddy 使用自己的 CA。如需浏览器信任，执行 `docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt ./local-ca.crt`，然后由你自己将公共证书导入 macOS Keychain Access 的 `login` 钥匙串并设为信任。可用 `curl --cacert local-ca.crt https://localhost:6324/api/v1/health` 验证。`local-ca.crt` 不入库，CA 私钥仅在 Docker 卷中。`docker compose down` 不会停止已有数据库；不要随意加 `-v`，它会删除图片与证书卷。

## 开发与检查

本机需要 Go 1.26、Node.js 24 和 Corepack。先 `docker compose down` 释放端口，再把以下三行分别放在独立终端运行：

```bash
cd api && go run ./cmd/server
cd web && corepack pnpm install --frozen-lockfile && corepack pnpm dev
cd admin && corepack pnpm install --frozen-lockfile && corepack pnpm dev
```

直接运行的开发服务是 HTTP，真实登录接口要求 HTTPS；账号联调用 Compose 入口。

```bash
cd api && go test ./...
cd ../web && corepack pnpm typecheck && corepack pnpm build
cd ../admin && corepack pnpm lint && corepack pnpm build
cd .. && docker compose config -q && docker compose -f compose.prod.yaml config -q
```

## 接口与登录

前后台共用 `users` 表，但登录接口、会话和 Cookie 独立。读者只可登录前台，管理员可登录两端。前台个人信息只返回账号与昵称，后台管理员信息才包含身份和权限。密码经 HTTPS 传输，数据库只存 Argon2id 哈希；Redis 存随机会话令牌的 SHA-256 摘要。Cookie 使用 `Secure`、`HttpOnly`、`SameSite=Strict`。修改密码、停用用户或改变身份会令旧会话失效；项目不使用 JWT 签名密钥。

| 用途 | 主要接口 |
| --- | --- |
| 前台账号 | `POST /api/v1/auth/register`、`login`、`logout`、`change-password`；`GET /api/v1/auth/me`；`PUT /api/v1/auth/profile`。 |
| 公开内容 | `GET /api/v1/posts`、`posts/:slug`、`categories`、`tags`、`site`；`GET /sitemap.xml`、`feed.xml`、`robots.txt`。 |
| 评论 | `GET /api/v1/posts/:slug/comments`；登录后 `POST /api/v1/posts/:slug/comments`。 |
| 后台账号 | `POST /api/v1/admin/auth/login`、`logout`、`change-password`；`GET /api/v1/admin/auth/me`；`PUT /api/v1/admin/auth/profile`。 |
| 后台管理 | `/api/v1/admin/posts`、`categories`、`tags`、`users`、`comments`、`media`、`site`。 |

公开注册固定为 `reader` 身份，并按 IP 限制频率；评论默认待审核。图片限 JPEG、PNG、GIF、WebP 和 5 MiB。公开文章列表只显示已发布内容，草稿仅在后台可见。

## 线上部署

规划地址：博客 <https://kakozane.icu/>，后台 <https://admin.kakozane.icu/>，独立 API <https://api.kakozane.icu/api/v1/health>。浏览器页面仍通过各自域名下的 `/api/v1` 同源访问 API。先将这些域名及 `www.kakozane.icu` 解析到服务器，并开放 80/443；Caddy 会自动申请、续期公开可信的证书。

生产机的 `api/config.yaml` 应填写**仅私网可达**的 MySQL/Redis 地址和独立数据库账号，不要公开数据库端口。然后执行 `docker compose -f compose.prod.yaml up --build -d`。首次部署前执行 `cd api && go run ./cmd/bootstrap` 创建管理员；请确认运行 bootstrap 的机器可访问生产数据库并妥善保存初始密码。后台“站点设置”中的站点地址应为 `https://kakozane.icu`，用于 RSS 和站点地图。

备份需同时包含 MySQL 的 `kakozane_blog` 数据库与 Docker 的 `media_data` 图片卷；`caddy_data` 保存 TLS 状态。升级前先备份，并安全保存 `api/config.yaml`。生产域名和数据库私网连通性要在正式部署时验证。
