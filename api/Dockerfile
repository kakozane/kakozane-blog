# 用 Go 镜像编译二进制，避免在运行镜像内保留编译工具。
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server && \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /bootstrap ./cmd/bootstrap

# 最终镜像只运行编译好的 API，并使用非 root 用户。
FROM alpine:3.23
RUN adduser -D -u 10001 app
RUN mkdir -p /data/uploads && chown -R app:app /data/uploads
USER app
COPY --from=build /server /server
COPY --from=build /bootstrap /bootstrap
EXPOSE 6324
CMD ["/server"]
