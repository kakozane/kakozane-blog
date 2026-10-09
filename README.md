# Kakozane Blog

个人博客 Monorepo：`api/` 是 Go/Gin 接口，`web/` 是 React Router SSR 前台，`admin/` 是 React + Ant Design Pro 风格后台。前端统一使用 pnpm 和严格 TypeScript；API 统一以 `/api/v1` 开头。

## 功能

| 区域 | 已实现 |
| --- | --- |
| 前台 | SSR 首页、统一文章列表（包含历史手记和思考）、文章详情、按年月归档、分类与标签、搜索、RSS 订阅、评论点赞、友链、项目、关于与自定义页面；历史内容链接保留。 |
| 读者 | 注册、登录、退出、修改昵称和密码、文章/手记/思考点赞与个人喜欢列表、评论与回复；新评论需审核。 |
| 后台 | 统一文章管理与富文本编辑器、版本历史、回收站、本地及云端草稿、Markdown 导入导出、前台预览、分类标签、用户评论审核、媒体库、页面、友链、项目及站点设置。 |
| 后端 | MySQL、Redis 会话/限流/发布通知、Argon2id 密码哈希、自动迁移、路由/处理器/服务/仓库分层与手动依赖注入。 |

## 文件与目录

| 路径 | 作用 |
| --- | --- |
| `README.md`、`LICENSE`、`.gitignore` | 项目说明、MIT 许可证和 Git 忽略规则。 |
| `.dockerignore`、`Dockerfile.proxy` | 代理镜像构建排除规则；构建后台并打包 Caddy。 |
| `compose.yaml`、`Caddyfile` | 本地正式镜像编排及 6324/6325/6326 HTTPS 代理。 |
| `compose.dev.yaml`、`Caddyfile.dev` | 开发模式源码同步、Vite 热更新、Go 自动重启及 HTTPS 代理。 |
| `compose.prod.yaml`、`Caddyfile.prod` | 线上独立编排、域名 HTTPS 和 80/443 代理。 |
| `api/config.example.yaml`、`api/config.yaml` | 后端配置模板及实际配置；实际文件不入库。 |
| `api/cmd/server/main.go`、`cmd/bootstrap/main.go` | 启动、探活、迁移、组装依赖；首次创建管理员。 |
| `api/internal/config/`、`password/` | 配置校验、Argon2id 密码处理及测试。 |
| `api/internal/router/`、`handler/` | 版本化路由；HTTP 请求、响应、Cookie 和错误处理。 |
| `api/internal/service/`、`repository/` | 业务规则；MySQL/Redis 查询与图片存储。 |
| `api/internal/model/`、`api/migrations/` | 数据类型；带版本记录的建表 SQL。 |
| `api/Dockerfile`、`go.mod`、`go.sum` | API 镜像、依赖与校验和。 |
| `web/app/routes.ts`、`app/routes/` | 前台页面路由：首页、文章列表与详情、手记及专栏、思考、一言、自定义页面、时间线、话题及分类和标签、归档、搜索、订阅、友链、项目、关于、登录、注册和账号。 |
| `web/app/root.tsx`、`app/app.css` | HTML 根布局、站点数据和前台样式。 |
| `web/public/favicon.svg` | 前台浏览器标签图标的默认 Kakozane 标识；后台可改为自定义图标地址。 |
| `web/DESIGN.md` | 前台视觉规范与组件取舍。 |
| `web/app/components/`、`lib/`、`types/` | 组件、服务端和浏览器端请求、TypeScript 类型。 |
| `web/react-router.config.ts`、`vite.config.ts`、`Dockerfile` | SSR、开发构建配置和 Node 镜像。 |
| `admin/src/router/`、`layout/`、`pages/` | 登录保护、ProLayout 菜单及按路由加载的管理页面。 |
| `admin/src/api/`、`types/` | 后台请求函数和模块化 TypeScript 类型。 |
| `admin/src/hooks/useDraftBackup.ts`、`lib/local-draft.ts` | 编辑器本地草稿自动备份与恢复，按管理员及内容 ID 隔离。 |
| `admin/src/main.tsx`、`App.tsx`、`index.css` | React 入口、根组件和后台基础样式。 |
| 两个前端的 `package.json`、`pnpm-lock.yaml`、`tsconfig*.json` | 脚本、依赖锁定版本和类型检查配置。 |

配置放在 `api/`，因为数据库密码仅由后端读取。Git 与 Docker 构建上下文会排除 `api/config.yaml`、`api/bootstrap-admin.txt`、依赖和构建产物。

## 本地运行

需要 Docker Desktop，以及已运行并映射至宿主机 3306/6379 的 MySQL/Redis。首次执行 bootstrap 还需要本机 Go 1.26。**本项目不会重复创建这两个容器**。其他机器首次运行时，先创建 `kakozane_blog` 数据库和专用账号：

```bash
cp api/config.example.yaml api/config.yaml
# 编辑 api/config.yaml，填入博客数据库账号与密码
cd api && go run ./cmd/bootstrap && cd ..
docker compose -f compose.dev.yaml up --build --watch
```

当前机器已初始化，无需再运行 bootstrap；重复运行也不会重置管理员密码。初始密码在 `api/bootstrap-admin.txt`，权限为 600，登录后请修改。API 启动时会自动应用未执行的 `api/migrations/*.sql`。`--watch` 保持运行期间，保存业务源码即可更新，不必反复执行 Compose。生产镜像的本地验证才使用 `docker compose up --build -d`。

| 地址 | 用途 |
| --- | --- |
| <https://localhost:6325/> | 博客前台。 |
| <https://localhost:6326/> | 管理后台。 |
| <https://localhost:6324/api/v1/health> | API 探活。 |

本地 Caddy 使用自己的 CA。如需浏览器信任，执行 `docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt ./local-ca.crt`，然后由你自己将公共证书导入 macOS Keychain Access 的 `login` 钥匙串并设为信任。可用 `curl --cacert local-ca.crt https://localhost:6324/api/v1/health` 验证。`local-ca.crt` 不入库，CA 私钥仅在 Docker 卷中。`docker compose down` 不会停止已有数据库；不要随意加 `-v`，它会删除图片与证书卷。

## 开发与检查

开发模式也支持标准 HTTPS 域名。首次在 macOS 执行 `bash scripts/setup-dev-hosts.sh`，输入管理员密码后，脚本会备份 `/etc/hosts` 并将下面三个域名映射到 `127.0.0.1`：

| 地址 | 用途 |
| --- | --- |
| `https://dev.retniw.cc` | 博客前台 |
| `https://admin.dev.retniw.cc` | 管理后台 |
| `https://api.dev.retniw.cc/api/v1/health` | API 健康检查 |

开发代理在本机 443 端口提供这些入口，沿用 Caddy 本地 CA；需要信任同一个本地根证书。Vite 仅放行对应的开发域名。原有 `localhost:6324/6325/6326` 入口继续可用。若使用系统代理，需把这三个开发域名加入代理绕过列表，保证请求到达本机。

首次进入开发模式运行下面的命令，并保持终端打开。它会构建开发镜像并监视文件：

```bash
docker compose -f compose.dev.yaml up --build --watch
```

以后每天启动只需运行 `docker compose -f compose.dev.yaml up --watch`，无需每次加 `--build`。保持它运行，保存 `web/`、`admin/` 中的 React、CSS 等源码后，Compose 会同步文件，Vite 会热更新；部分 SSR 路由修改会刷新页面。保存 `api/` 中的 Go 源码后，Compose 会同步文件并自动重新编译、重启 API。**改完业务代码不用再执行 Compose 命令。**浏览器仍访问上面的三个 `https://localhost` 地址，登录与 Cookie 正常工作。Watch 停止后容器可能继续运行，但源码不再自动同步；重新运行 `up --watch` 即可。

新增前台路由时，先创建路由组件文件，再修改 `web/app/routes.ts`。如果 Vite 恰好在新文件同步前重载配置并显示“文件不存在”，运行 `docker compose -f compose.dev.yaml restart web` 即可恢复，无需重建镜像。构建检查请使用下方宿主机 `corepack pnpm build` 命令；不要在正在运行 `pnpm dev` 的前台容器内同时构建，以免构建产物干扰开发服务器的样式缓存。

修改 `go.mod`、`go.sum` 或前端依赖文件时，Watch 会自动重建对应镜像；修改 Dockerfile 或 Compose 配置后，停止 Watch，再运行带 `--build --watch` 的首次启动命令。修改 `Caddyfile.dev` 后运行 `docker compose -f compose.dev.yaml restart proxy`；修改 `api/config.yaml` 后运行 `docker compose -f compose.dev.yaml restart api`。结束开发按 `Ctrl+C`；需要清理应用容器时才运行 `docker compose -f compose.dev.yaml down`。要切回正式镜像，运行 `docker compose up --build -d`。不要使用 `down -v`，它会删除上传图片与本地 HTTPS 证书卷。

如果只想用宿主机终端调试，仍可分别运行 `cd api && go run ./cmd/server`、`cd web && corepack pnpm dev`、`cd admin && corepack pnpm dev`；这些 HTTP 直连地址不适合测试当前的 HTTPS 登录流程。

```bash
cd api && go test ./...
cd ../web && corepack pnpm typecheck && corepack pnpm build && node --test app/lib/*.test.mjs
cd ../admin && corepack pnpm lint && corepack pnpm build
cd .. && docker compose config -q && docker compose -f compose.prod.yaml config -q
```

## 接口与登录

前后台共用 `users` 表，但登录接口、会话和 Cookie 独立。读者只可登录前台，管理员可登录两端。前台个人信息只返回账号与昵称，后台管理员信息才包含身份和权限。密码经 HTTPS 传输，数据库只存 Argon2id 哈希；Redis 存随机会话令牌的 SHA-256 摘要。Cookie 使用 `Secure`、`HttpOnly`、`SameSite=Strict`。修改密码、停用用户或改变身份会令旧会话失效；项目不使用 JWT 签名密钥。

读者从文章、手记或思考进入登录页后，登录成功会回到原内容；从评论区进入会回到评论位置。切换到注册页时也会保留返回地址。返回地址只接受站内路径，防止登录后跳转到外部网站。

### 前后台单点登录

在 `api/config.yaml` 的 `auth.sso_sites` 中精确配对前后台的 HTTPS 来源（包含端口、不含路径和末尾斜杠）。开发配置见模板；线上配置为：

```yaml
auth:
  sso_sites:
    - front_origin: https://retniw.cc
      admin_origin: https://admin.retniw.cc
```

前台已登录时，后台登录页会显示账号提示；管理员点击“使用此账号登录后台”即可继续，普通读者会看到无后台权限的提示。先登录后台时，前台首页及登录页也会显示确认入口。切回标签页会重新检查另一端状态。登录提示失败时仍可使用账号密码登录。

两端 Cookie 继续使用 `__Host-`、`Secure`、`HttpOnly` 和 `SameSite=Strict`，不设置共享 Domain。只有配对来源能跨域读取最少的账号信息并申请凭证；凭证在 Redis 保存 60 秒，绑定目标来源与身份、原子消费一次，仅在浏览器内存和 HTTPS JSON 请求中传递。确认时重新核对提示的账号，交换时再次检查来源会话、账号状态、会话版本及管理员权限。

此流程用于同站点子域名（或 localhost 不同端口），不支持任意不同主域名之间共享登录。开发与生产应分别配置。每端会话独立有效 12 小时；退出只注销当前端，不会自动重新登录，也不会注销另一端已经建立的会话。来源退出后，尚未交换的凭证立即失效；修改密码、停用账号和角色变更会令已有会话及待交换凭证失效。

验证命令：`cd api && BLOG_TEST_REDIS=127.0.0.1:6379 go test ./...` 检查真实 Redis 凭证生命周期；根目录运行 `python3 scripts/check-sso.py` 检查双向登录、权限、来源边界和凭证失效。后者默认读取本机初始管理员文件，也可通过 `BLOG_TEST_ADMIN_USER`、`BLOG_TEST_ADMIN_PASSWORD` 环境变量提供账号；它创建临时测试用户，完成后删除，不修改已有账号。

| 用途 | 主要接口 |
| --- | --- |
| 前台账号 | `POST /api/v1/auth/register`、`login`、`logout`、`change-password`；`GET /api/v1/auth/me`；`PUT /api/v1/auth/profile`。 |
| 公开内容 | `GET /api/v1/posts`、`notes`、`thinking` 及各自的 `:slug`、`:slug/related`；`notes/series`、`says`、`pages`、`pages/:slug`、`timeline`、`timeline/years`、`timeline/months`、`activity/comments`、`activity/likes`、`friends`、`projects`、`events`（SSE）、`categories`、`tags`、`site`、`site/stats`；`GET /sitemap.xml`、`feed.xml`、`notes/feed.xml`、`thinking/feed.xml`、`says/feed.xml`、`robots.txt`。 |
| 评论与点赞 | `GET /api/v1/posts/:slug/comments`、`likes`，手记与思考分别改用 `notes/:slug/...`、`thinking/:slug/...`；登录后可提交评论或回复、读取 `comments/mine`、修改本人待审评论，以及 `PUT` 点赞、`DELETE` 取消点赞；`GET /api/v1/auth/likes` 分页返回当前读者喜欢的公开内容。回复显示被回复者名称；公开评论可通过 `comments/:id/location` 定位当前页。 |
| 后台账号 | `POST /api/v1/admin/auth/login`、`logout`、`change-password`；`GET /api/v1/admin/auth/me`；`PUT /api/v1/admin/auth/profile`。 |
| 后台管理 | `/api/v1/admin/posts`、`categories`、`tags`、`users`、`comments`（含 `:id/pin`）、`media`、`friends`、`projects`、`pages`、`says`、`site`。 |

公开注册固定为 `reader` 身份，并按 IP 限制频率；评论默认待审核。登录用户可在对应内容下查看自己的待审或未通过评论，并在提交后 10 分钟内修改；服务端同时核对评论作者、所属内容和状态，修改后重新待审核。评论支持粗体、链接、列表、引用、代码等 Markdown 格式，提交前可预览，也可通过每条公开评论的固定链接定位；外链带 `nofollow ugc`，评论图片只显示替代文字，不加载远程图片。图片限 JPEG、PNG、GIF、WebP 和 5 MiB。公开文章列表只显示已发布内容，草稿仅在后台可见。

登录读者在 `/account` 可分页回看自己点过赞且仍公开的文章、手记和思考；私人列表按点赞时间排序，接口与账号页面均禁止缓存。内容撤回后不会出现在列表中。

前台页面打开时通过 SSE 接收新发布的文章、手记或思考提醒；后台保存站点设置后，已打开的前台页面也会刷新站点信息，站长近况到期时会自动隐藏。关闭页面后不会发送系统推送通知。三类内容都可分享；支持原生分享的浏览器会调出系统分享面板，否则复制链接。首页、公开栏目及内容详情的 SSR 页面会输出规范链接和 Open Graph 信息；分页栏目各自使用对应页码的规范链接，文章封面或站点头像用于分享预览。历史手记和思考统一在文章列表管理，使用同一个 Tiptap 编辑器；正文统一遵循 1 MB 上限，历史思考也支持置顶。底层 kind 保留，以兼容旧链接、评论和点赞。内容页可切换正文字体与三级字号，选择保存在当前浏览器。

首页最近动态按时间混排已发布内容、已通过审核的评论与匿名点赞。评论和点赞只在所属内容仍公开时出现；待审核、未通过以及草稿下的评论不会进入公开接口。点赞动态不返回点赞者身份。评论链接按评论 ID 定位，打开时计算当前分页并跳到原评论；站长置顶或取消置顶后仍能定位。

内容详情的“上一篇 / 下一篇”按发布时间连接同类型的已发布内容；同一时间按 ID 排序，不会串入草稿或其他栏目。“继续阅读”优先展示同标签、同分类的已发布内容；不足三篇时以最近发布的同类型内容补齐，不会显示当前内容或草稿。文章与手记按 Markdown 可见文字估算字数及阅读时间；内容发布后再编辑会显示更新时间。文章超过 180 天未更新时会在正文前提示读者核对新资料。长内容的阅读位置只保存在当前浏览器，重访时可选择继续；正文更新后旧位置失效，接近读完时自动清除；阅读超过 10% 后可一键返回顶部。详情页可切换默认字体与系统衬线字体，选择仅保存在当前浏览器。文章与手记可开启沉浸阅读，暂时收起导航和正文之外的操作，按 Esc 或固定按钮即可退出。宽屏内容页在正文右侧提供点赞、评论、分享和订阅快捷操作，窄屏保留正文末尾的按钮。正文中独占一行的 Markdown 图片可点击查看大图，并以替代文本作图片说明；按 Esc、关闭按钮或点击弹窗外侧可退出。带链接的图片保留原来的跳转行为。

有二、三级标题的内容在桌面显示页内目录，在小屏显示固定的“目录”入口；点击章节可跳转，按 Esc 可关闭小屏目录。标题旁的 `#` 可打开该章节的固定链接。

前后台只保留“文章”主入口，用分类与标签区分技术、生活和随笔。顶栏为首页、文章、归档、关于，友链和项目放在“更多”。`/topics` 作为文章页的“分类与标签”索引，不占顶栏位置。

旧 `/notes`、`/thinking`、`/notes/series` 列表重定向到 `/posts`；`/notes/series/:slug` 重定向到对应分类，`/timeline` 重定向到 `/archive` 并保留年月和分页。已有 `/notes/:slug`、`/thinking/:slug` 详情及其 API、RSS、评论、点赞继续可用，数据库不迁移或删除。新内容默认保存为 post。后台旧列表和编辑链接转入文章管理；旧 `/notes/new` 仅保留用于访问已有新手记草稿，不再提供菜单入口。

公开分类与标签列表只包含已发布内容使用过的条目；后台 `/api/v1/admin/categories`、`/api/v1/admin/tags` 仍会显示草稿使用和暂未使用的条目。站点地图收录有公开内容的分类、标签和手记专栏。

后台文章编辑页可选择“置顶首页”。置顶只影响首页文章列表，归档、时间线和 RSS 仍按发布时间排序；草稿不会在公开列表中出现。

历史手记的精选标记统一显示为置顶；归档提供年月筛选，不再提供内容类型或精选手记入口。

后台文章、手记和自定义页面编辑器会把未保存的表单内容暂存在当前浏览器的 localStorage。异常关闭或刷新后重新打开同一编辑页会提示恢复；恢复后仍需手动保存到服务器。服务器内容更新时会提醒确认。成功保存或在离开提醒中明确选择“放弃修改”会清除本地备份；清除浏览器站点数据也会删除备份。同一内容同时在多个标签页编辑时，最后一次本地备份胜出。

后台“自定义页面”可以维护不属于文章栏目的固定内容，例如使用清单；草稿仅在后台可见，发布后通过 `/pages/:slug` 的 SSR 页面展示，并收录进站点地图。公开页面列表在 `/pages`。正文与文章共用 Markdown 渲染，支持代码高亮、公式、提示块、章节目录与图片大图；“关于”页和后台预览也沿用同一渲染方式。

访问不存在的内容会显示与前台一致的 404 页面，可返回首页或搜索；暂时无法读取页面时提供重新加载入口。

需要把某个页面放进导航时，在后台“站点设置 → 自定义导航”填写名称和 `/pages/:slug` 地址；最多 5 条，也支持 HTTPS 外链。它们出现在桌面“更多”和手机菜单中，外链会在新标签打开。不安全地址和重复链接会被拒绝。

编辑文章、手记或自定义页面时，可在正文输入框下直接上传图片并插入 Markdown 链接；上传期间不能保存或放弃编辑。修改后切换后台页面会先提示继续编辑或放弃修改；刷新和关闭标签页也会触发浏览器的未保存提示。保存成功后正常返回列表。退出后台会在确认离开编辑器之后注销会话。

编辑文章、手记或自定义页面时点击“前台预览”，会在新标签页展示当前表单的标题、摘要、封面（若有）和 Markdown 正文，采用前台排版。预览内容仅通过浏览器窗口消息传递，不会保存到数据库，也不会放进网址；`/preview` 禁止搜索引擎收录。刷新预览页后，需从编辑器再次打开。

搜索会匹配已发布文章、手记、思考和自定义页面的标题、摘要及正文；草稿和撤回的内容不在结果中。搜索词中的 `%`、`_` 按普通文字处理。当前用 MySQL `LIKE` 扫描正文，内容规模或访问量明显增长时再考虑全文索引。

页头搜索按钮或 ⌘K / Ctrl+K 可打开快捷搜索面板，输入时展示最近的 8 条匹配内容；方向键可选择结果并按 Enter 打开。焦点留在输入框时按 Enter，或点击“查看全部结果”，会进入 `/search` 完整结果页；Esc 关闭面板。

首页发布足迹按月统计过去一年已公开的文章、手记和思考；只有一个月份有内容时先显示简短统计，出现跨月份内容后再显示月度图表。点击有内容的月份会打开对应月份的归档，分页会保留月份条件。

后台“站点设置”可填写站长近况的表情与文字，前台首页在简介下方展示；可设置到期时间，到期后的请求会自动隐藏近况。两项都留空会清除近况。
修改博客名称后，前台各页面的浏览器标题也会使用新名称；公开站点地址仍单独决定 RSS、站点地图与内容固定链接中的域名。

「一言」已移除前后台导航入口，原有 `/says`、后台 `/says` 和 RSS 保留用于访问历史数据。它仍是独立摘录：正文最多 1000 字，可选出处和作者，后台可隐藏；前台使用双栏摘录墙并提供独立 RSS。它不参与文章时间线，也没有评论和点赞。

`/subscribe` 只展示统一文章 RSS，可直接打开或复制到阅读器。源包含文章及历史手记、思考；旧的分栏目 RSS 地址仍可使用。RSS 无需账号，也不需要邮件投递服务。

文章、手记、思考和关于页支持 GitHub 风格提示块；后台正文预览也会显示相同结构。示例：

```md
> [!NOTE]
> 这里写需要提醒读者的内容。
```

将 `NOTE` 换成 `TIP`、`IMPORTANT`、`WARNING` 或 `CAUTION` 可使用其他提示类型。

技术文章可用 `mermaid` 代码围栏绘制图表：

````md
```mermaid
flowchart LR
  写作 --> 审核 --> 发布
```
````

图表在浏览器中按需渲染，前台随浅色/深色主题切换，后台编辑预览也显示图表；服务端输出保留可读的源码。语法有误时显示源码，方便修改。

正文还支持脚注和只读任务清单，后台预览与前台使用相同的中文脚注标题和返回引用链接：

```md
这个结论有资料来源[^source]。

[^source]: 在这里写资料名称和链接。

- [ ] 待处理
- [x] 已完成
```

## 线上部署

规划地址：博客 <https://retniw.cc/>，后台 <https://admin.retniw.cc/>，独立 API <https://api.retniw.cc/api/v1/health>。浏览器页面仍通过各自域名下的 `/api/v1` 同源访问 API。先将这些域名及 `www.retniw.cc` 解析到服务器，并开放 80/443；Caddy 会自动申请、续期公开可信的证书。

生产机的 `api/config.yaml` 应填写**仅私网可达**的 MySQL/Redis 地址和独立数据库账号，不要公开数据库端口。然后执行 `docker compose -f compose.prod.yaml up --build -d`。首次部署前执行 `cd api && go run ./cmd/bootstrap` 创建管理员；请确认运行 bootstrap 的机器可访问生产数据库并妥善保存初始密码。后台“站点设置”中的站点地址应为 `https://retniw.cc`，用于 RSS 和站点地图。

备份需同时包含 MySQL 的 `kakozane_blog` 数据库与 Docker 的 `media_data` 图片卷；`caddy_data` 保存 TLS 状态。升级前先备份，并安全保存 `api/config.yaml`。生产域名和数据库私网连通性要在正式部署时验证。

### 前台版式与在线人数

前台的栏目版式集中在 `web/app/editorial.css`，基础主题和 Markdown 样式仍在 `web/app/app.css`。首页居中介绍，手记采用信纸与日期栏，思考采用动态卡，友链为头像卡，项目为文字目录；时间线可以切换舒展、紧凑、速览。手机端有底部菜单。滚动入场由 `components/page-motion.tsx` 提供，不会默认隐藏 SSR 内容；页脚背景动效开关默认关闭，设置保存到本机，系统减少动态效果时不播放。

右下角显示**在线访客浏览器数**，不是已登录账号数或实名名单：

- 复用 `GET /api/v1/events?visitor=<UUID>` 的 SSE 连接，连接成功时及每 25 秒发送 `presence` 事件，内容为 `{ "count": 3 }`。
- `web/app/lib/visitor.ts` 在 localStorage 保存随机访客标识；支持 Web Locks 时串行初始化，同一浏览器同一站点的多个标签页去重。无痕、不同浏览器、不同开发域名分别计数；禁止本地存储时只能按当前页面计数。
- 后端沿用 handler → service → repository 分层；Redis Sorted Set 记录随机标识与最近心跳时间，不记录姓名/IP。超过 75 秒没有心跳的访客在下次统计时剔除，整个集合无访问 150 秒后自动删除。
- 断线时隐藏人数，重连后恢复。人数是近实时估计，关闭标签页不会立刻减一，也不是防机器人或审计用途的准确人数。长连接本身不代表用户正在操作。
- 开发与生产应使用各自的 Redis 实例或数据库，避免共享统计集合。

检查去重和过期逻辑：`cd api && BLOG_TEST_REDIS=127.0.0.1:6379 go test ./internal/repository -run TestPresence`。测试使用独立临时键，结束后清理，不清空数据库。

### 本地演示内容与编辑工具栏

`api/cmd/seed-demo/` 提供演示数据导入命令：`main.go` 负责事务写入，`content.go` 加载随程序打包的 `content.json`。

```bash
cd api
go run ./cmd/seed-demo          # 仅查看数量
go run ./cmd/seed-demo --apply  # 使用 config.yaml 中的数据库连接写入
```

共 70 条已发布内容：28 篇文章、21 篇手记、21 条思考，2020—2026 年每年 10 条，最晚日期为 2026-10-01。标题或正文标明演示，链接统一使用 `demo-年份-序号`；重复执行跳过已有链接，不覆盖原有内容。需要先完成数据库迁移并创建管理员。请仅对需要演示数据的数据库执行。

文章、手记和自定义页面使用 **Tiptap 官方 Simple Editor 模板**（https://template.tiptap.dev/preview/templates/simple），由 `@tiptap/cli@3.19.4 add simple-editor` 安装，保留官方图标工具栏、标题/列表下拉、链接弹层、高亮、上下标、对齐、图片上传节点、查找替换、撤销重做及移动端交互。

- `admin/src/components/tiptap-templates/simple/simple-editor.tsx`：官方模板及博客数据接口适配。
- `admin/src/components/tiptap-ui/`、`tiptap-ui-primitive/`、`tiptap-node/`、`tiptap-icons/`：官方组件源码；`hooks/`、`styles/` 和 `lib/tiptap-utils.ts` 为配套依赖。
- `admin/src/components/RichTextEditor.tsx`：表单包装、源码切换及上传状态。
- 正常 Markdown 仍按 Markdown 保存；使用下划线、彩色高亮、上下标或段落对齐时，以 `<!-- tiptap-rich-html -->` 标记的 HTML 保存在现有 `contentMd` 字段中，无需数据库迁移。前台与后台预览使用 HTML 白名单清洗，禁止脚本、事件属性和任意内联样式，仅映射已知格式。
- 含脚注或未标记 HTML 的旧文继续使用源码模式防止格式丢失。既有表格、公式与 Mermaid 可通过源码维护并预览，官方模板本身没有这些插入按钮。
- 图片仍上传到本项目媒体接口；草稿备份、离开提醒、保存和前台预览继续沿用。上传期间禁止保存。

### 前台 Yohaku 视觉

前台统一采用 [Yohaku 设计系统](https://github.com/Innei/Yohaku/tree/main/design-system) 的暖纸色、三层中性色、梅色强调、衬线标题与紧凑控件。`web/app/yohaku-tokens.css` 维护主题和字号，`web/app/app.css` 维护基础组件，`web/app/editorial.css` 维护各栏目布局。完整规则见 `web/DESIGN.md`，上游 MIT 许可见 `THIRD_PARTY_NOTICES.md`。

登录注册使用当前页面弹窗，旧 `/login`、`/register` 链接转到弹窗；在线人数展示在页脚右侧。

### 后台浅色 / 深色主题

右上角太阳 / 月亮按钮切换整个后台主题，默认浅色，选择保存在当前浏览器。使用 Ant Design 的 `defaultAlgorithm` / `darkAlgorithm` 与 ProLayout 的 `light` / `realDark`，编辑器与后台共用主题，编辑器按钮也会同步切换全局主题。实现见 `admin/src/theme/AdminTheme.tsx`。

已启动开发服务且已安装 Playwright 时，可运行 `node scripts/check-admin-theme.cjs` 回归验证默认主题、切换、刷新持久化及编辑器文字颜色；已有独立 Playwright 安装可通过 `PLAYWRIGHT_MODULE_PATH` 指定。脚本默认从本地忽略文件 `api/bootstrap-admin.txt` 读取测试账号，也支持 `ADMIN_CREDENTIALS_FILE` 和 `ADMIN_ORIGIN`。

编辑器回归检查：`node scripts/check-editor-regressions.cjs`（同样支持上述 Playwright 路径、账号文件及域名变量）。验证提示框转换为富文本后的展示，以及多图上传部分失败时的文件名对应关系；上传接口使用模拟响应，不写入文章或媒体数据。

### 内容保护与云端草稿

- **版本历史**：文章和手记每次手动保存记录完整快照（正文、标题、链接、分类、标签等），相同快照不重复记录。编辑页可查看最近 100 个版本，与当前编辑内容并排预览，恢复到编辑框后手动保存。恢复时默认选择草稿，避免自动覆盖公开内容。升级前的文章从首次修改时开始记录原始版本。
- **回收站**：文章、手记和思考删除后进入内容管理 → 回收站，前台、搜索、订阅及相关公开接口不再展示。评论、点赞和版本记录仍保留，恢复后为草稿。彻底删除有二次确认，同时删除关联评论、点赞、版本及对应的云端草稿。
- **云端自动保存**：文章和手记停止输入约 1.5 秒后，将编辑内容独立保存到 MySQL，不修改已发布正文。按登录账号和文章隔离；每个账号另有一份新文章草稿、一份新手记草稿。重新打开编辑页可恢复或丢弃。仍保留本地草稿作为断网兜底。
- **并发保护**：云端草稿采用版本号比较更新；文章正式保存也携带加载时版本号。检测到另一窗口修改时拒绝覆盖并保留本地内容。遇到冲突请先导出当前 Markdown，再刷新核对服务器内容、按需合并；不要盲目覆盖新版本。
- **Markdown 导入／导出**：编辑页导入单个 `.md` / `.markdown` 文件（上限 1 MB），替换编辑框正文后需要手动保存；导出当前编辑内容。富文本格式通过 Markdown 支持的内嵌 HTML 和格式标记无损保留，图片保留原 URL，不打包图片文件；导入不会自动更改分类、标签和发布状态。
- **站内回复通知**：回复通过审核后，通知被回复评论的作者；不通知本人对自己的回复，同一回复反复审核不会重复通知。前台头部显示未读数量（每分钟及回到页面时刷新），「我的账号」中可分页查看并跳转到对应评论、标记已读。评论撤回审核、删除，或文章不再公开时，相关通知不再展示。本期为站内通知，不发送邮件。

迁移 `api/migrations/020_writing_workflow.sql` 会在 API 启动时自动执行，增加文章版本号、历史表、云端草稿表和回复通知表，无需手动改库。生产环境升级前应备份数据库。

接口（均为 `/api/v1` 下）：

- 后台：`GET /admin/posts/:id/revisions`、`POST /admin/posts/:id/restore`、`DELETE /admin/posts/:id/purge`；列表 `status=trash` 查看回收站。
- 后台草稿：`GET/PUT/DELETE /admin/drafts/:key`，key 为 `post-文章ID` / `note-手记ID` / `post-new` / `note-new`，读写只作用于当前账号；删除需提交 `?version=当前草稿版本号`。
- 前台通知：`GET /auth/notifications?page=1`、`PUT /auth/notifications/:id/read`，仅限当前登录读者。

回归验证：在**本地开发环境**运行 `node scripts/check-writing-workflow.cjs`（复用 `PLAYWRIGHT_MODULE_PATH`、`ADMIN_CREDENTIALS_FILE`、`ADMIN_ORIGIN`，另支持 `FRONT_ORIGIN`）。会创建临时文章、测试账号和评论，并在结束时清理，覆盖版本冲突、云端隔离、回收站、审核通知、浏览器草稿恢复和 Markdown 文件往返；不要指向生产环境。

## Swagger 接口文档

后端接入 `swaggo/swag` 和 `gin-swagger`。开发模式访问：

- <https://api.dev.retniw.cc/api/v1/swagger/index.html>
- 或通过前台/后台的同源 `/api/v1/swagger/index.html` 访问，以调试该域名下的登录 Cookie。
- 原始文档：`/api/v1/swagger/doc.json`。

目前注释覆盖健康检查、前后台登录/会话、文章/手记/思考列表与详情、后台文章增删改、版本历史、回收站和云端草稿；其他模块暂未补充文档。Swagger 2.0 文档由处理器注释生成，生成产物提交 Git，运行时不依赖外部 CDN。

```bash
cd api
# 使用 go.mod 中锁定的工具版本，无须全局安装 swag。
go generate ./cmd/server
go test ./...
```

`api/cmd/server/main.go` 保存文档标题和生成命令；`api/internal/handler/*.go` 保存接口注释；`api/docs/` 是自动生成文件，请勿直接编辑；`api/internal/router/swagger.go` 注册文档路由。

`GIN_MODE=release` 时默认关闭文档（返回 404）；如需开放，在后端 YAML 中设置：

```yaml
server:
  port: 6324
  swagger_enabled: true
```

登录为同源 HTTPS + HttpOnly Cookie，不是 Bearer Token。Swagger 页面通过对应登录接口建立会话后，浏览器自动携带 Cookie；前后台会话各自独立。文档开关不会关闭业务接口原有的鉴权。对公网开放文档时，任何人都可以阅读这些接口说明。

## GitHub Actions 自动部署方案

流程：`main` 提交 → 对比线上各服务版本 → 检查和构建选中服务 → 推送镜像到个人 ACR 仓库 → 服务器通过 SSH 拉取选中镜像 → Compose 仅更新选中服务 → 健康检查。已添加 `.github/workflows/release.yaml`：推送 main 自动检查和构建镜像；生产部署由仓库变量 `ENABLE_AUTO_DEPLOY` 控制，首次默认关闭，也可在 Actions 手动勾选 deploy。

服务器只有约 2 GB 内存，构建放在 GitHub Runner 上；Docker 镜像加速器仅帮助下载公共基础镜像，不能替代存放自己构建镜像的仓库。

### 按项目构建与部署

Actions → **Build and deploy blog → Run workflow** 的 `service` 可选：

| 选项 | 构建、部署范围 |
| --- | --- |
| `auto`（默认） | 对比服务器上次成功部署的各服务 SHA，更新所有有改动的服务 |
| `all` | 强制构建并更新 api、web、proxy |
| `api` | Go 后端，包括 bootstrap 程序 |
| `web` | 博客 SSR 前台 |
| `proxy` | 管理后台 + Caddy，它们目前共用一个镜像 |

勾选 deploy 或开启 `ENABLE_AUTO_DEPLOY=true` 才会部署；否则只构建推送。自动模式按 `api/`、`web/`、`admin/` 等路径选择服务；`Dockerfile.proxy`、根目录 `Caddyfile`、`.dockerignore`、`deploy/Caddyfile` 影响 proxy。README 等文档修改本身不会触发镜像构建，但之前尚未上线的应用改动仍会被选中。跨项目移动文件会同时检查来源和目标项目。

首次上线、版本记录缺失/旧提交不可读取，以及 `deploy/compose.yaml`、`deploy/release.sh`、`scripts/plan-release.py` 变化时，强制全量更新（包括手动选择单个服务时），避免新旧编排混用。因此本次部署机制升级首次运行仍会构建全部镜像。手动只选一个服务不会自动发布其他业务改动；若前后端接口必须同步升级，请选择 `all` 或 `auto`。

计划阶段需要 SSH 读取服务器 `.env` 中的版本白名单，即使仅构建也需要服务器可连接；无法连接时流程失败，不猜测版本。比较的是成功部署版本而非上一条 Git 提交，因此关闭自动部署期间积累的改动、被排队替换的提交也不会漏掉。未部署前重复运行 auto，仍会选择这些服务，并复用构建缓存。

部署只拉取、重建选中的容器；未选中的容器不重建。发布后会让 Caddy 重新加载配置以刷新上游连接，并检查前台、后台和 API 健康。所有发布仍保留原来的数据库与图片备份；失败不更新成功版本记录，也不自动回滚已变更的容器。排查失败后优先用 `all` 完整发布以恢复一致状态。

本地验证：`python3 scripts/check-release.py`。新流程尚需实际 GitHub Actions 运行验证 ACR 推送与服务器更新。

### GitHub 配置位置

仓库 `Settings → Environments` 创建 `production`，限定 `main` 部署。以下 Secrets/Variables 放在此环境；workflow 的部署任务需声明 `environment: production` 才能读取。

| 类型 | 名称 | 内容 |
| --- | --- | --- |
| Secret | `ACR_USERNAME` | 阿里云容器镜像仓库登录用户名 |
| Secret | `ACR_PASSWORD` | 镜像仓库登录密码，不是阿里云账号密码 |
| Secret | `SSH_PRIVATE_KEY` | 部署专用 SSH 私钥；公钥加入服务器授权列表 |
| Secret | `SSH_KNOWN_HOSTS` | 通过已信任连接核对过指纹的服务器主机公钥记录 |
| Variable | `ACR_REGISTRY` | ACR 控制台给出的登录域名，不带 `https://` |
| Variable | `ACR_NAMESPACE` | 自己创建的镜像命名空间 |
| Variable | `DEPLOY_HOST` | `101.200.180.5` |
| Variable | `DEPLOY_PORT` | `22` |
| Variable | `DEPLOY_USER` | 推荐部署专用用户；使用 Docker 权限等同拥有主机高权限 |

ACR 创建 `blog-api`、`blog-web`、`blog-proxy` 三个仓库，分别对应 `api/Dockerfile`、`web/Dockerfile`、`Dockerfile.proxy`。镜像以 Git commit SHA 标记，服务器分别记录 api/web/proxy 的版本，未选中服务保留原来的镜像。服务器需预先配置只读拉取凭据。数据库密码和生产 YAML 留在服务器，不打包进镜像、不提交 Git。

### Workflow 要完成的步骤

1. **检查**：仅选中 api 时执行后端检查：`go generate ./cmd/server` 后检查 `api/docs` 无差异，执行 `go test ./...`；选中的前端项目在镜像构建时执行 `pnpm install --frozen-lockfile` 和构建检查。
2. **构建**：用各自 Dockerfile 构建 `linux/amd64` 镜像，登录 ACR，推送 `${提交SHA}` 标签。构建任务不使用生产数据库密码。
3. **部署**：同一环境部署串行执行，SSH 校验主机密钥；服务器拉取选中镜像成功后才更新 Compose，使用 `--no-deps` 避免更新未选中依赖。运行迁移前备份数据库，更新后检查 API 健康状态。
4. **回滚**：应用镜像可切回上一提交标签；数据库迁移必须单独判断兼容性，不能靠回滚镜像撤销迁移。

### 当前服务器上线前仍需处理

- 数据库 Compose 位于 `/opt/blog-infra`，API 需加入 `blog-backend` 网络，使用 `mysql:3306`、`redis:6379`；后端 YAML 的 `redis.password` 已接入 Go 客户端。
- 现有 `compose.prod.yaml` 保留独占 80/443 的构建方案。当前服务器自动部署使用 `deploy/compose.yaml`，以 ACR 镜像运行，仅绑定 `127.0.0.1:6325/6326`，宝塔 Nginx 分别转发前台和后台。
- `retniw.cc` 的 SSL 已配置；使用 `admin.retniw.cc` 还需对应证书。
- 首次上线创建管理员、配置后端生产 YAML、数据备份及健康检查后，再启用 `push main` 自动发布；首次通过 `workflow_dispatch` 手动勾选 deploy，验证成功后再把仓库级 Actions Variable `ENABLE_AUTO_DEPLOY` 改为 `true`。

参考：[GitHub 镜像发布文档](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)、[Actions Secrets 配置](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)。

### 已准备的部署文件与首次运行

| 文件 | 作用 |
| --- | --- |
| `.github/workflows/release.yaml` | 按服务选择 Go 测试、Swagger 一致性检查、镜像构建推送及可选 SSH 部署。前后台构建失败会阻止部署。 |
| `scripts/plan-release.py` | 对比各服务的线上版本，输出动态构建矩阵。 |
| `scripts/check-release.py` | 本地验证服务选择和部署脚本，不连接线上服务器。 |
| `deploy/compose.yaml` | ACR 镜像编排，API 接入现有数据库网络，数据卷持久化。 |
| `deploy/Caddyfile` | 容器内 HTTP 入口，由宝塔 Nginx 处理外部 HTTPS。 |
| `deploy/release.sh` | 拉取镜像、备份、初始化管理员、更新服务并检查健康。 |

服务器目录是 `/opt/blog`：`config.yaml` 保存生产配置，`state/bootstrap-admin.txt` 保存首次管理员密码，`backups/` 保存更新前备份，`releases/<SHA>/` 保存对应部署文件，`.env` 用 `API_IMAGE_TAG`、`WEB_IMAGE_TAG`、`PROXY_IMAGE_TAG` 分别保存各服务最近成功版本；`current-release` 仅记录最近发布操作的提交，不能用它代替各服务镜像版本。旧版单一 `IMAGE_TAG` 会在下次成功部署时自动迁移。脚本使用文件锁避免同时部署；失败会退出并保留备份，不自动回退数据库。文件备份在服务仍运行时复制，不能替代停写后的数据库与图片一致性备份；需定期检查磁盘并将备份复制到服务器之外。

当前 ACR 登录域名是 `crpi-hbv9ky04safnech7.cn-beijing.personal.cr.aliyuncs.com`，命名空间为 `retniw`。服务端已配置 ACR 登录、独立部署 SSH 公钥和后端生产配置。GitHub 使用 `production` 环境 Secrets；`ENABLE_AUTO_DEPLOY` 是**仓库级** Variable，不能放在 environment 中，因为部署 job 的 if 在环境变量可用前就会求值。

提交这些文件后，在仓库 Actions 选择 **Build and deploy blog → Run workflow**。第一次先不勾选 deploy，确认三个镜像均构建推送成功；域名入口准备好后，再勾选 deploy 执行首次上线。使用 nginx 反代时需要设置 `Host $host`、`X-Forwarded-Proto $scheme`、`X-Real-IP $remote_addr`，并关闭 API SSE 响应缓冲。前台上游 `http://127.0.0.1:6325`，后台上游 `http://127.0.0.1:6326`。新后台域名需单独有效证书，当前根域名证书不覆盖它。

GitHub Actions 仍需首次实际运行才能确认 Runner 到 ACR 的推送、SSH 连接与完整部署；本地测试和服务器 ACR 登录验证不能代替该验收。
