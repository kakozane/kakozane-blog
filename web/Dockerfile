# 安装与锁文件一致的前台依赖。
FROM node:24-alpine AS dependencies
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 构建 React Router 的浏览器资源和 SSR 服务端代码。
FROM dependencies AS build
COPY . .
RUN pnpm build

# 运行时只保留生产依赖与构建产物。
FROM node:24-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/build ./build
ENV NODE_ENV=production
EXPOSE 6325
CMD ["pnpm", "start"]
