# 用 Go 镜像编译二进制，避免在运行镜像内保留编译工具。
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# 最终镜像只运行编译好的 API，并使用非 root 用户。
FROM alpine:3.23
RUN adduser -D -u 10001 app
USER app
COPY --from=build /server /server
EXPOSE 6324
CMD ["/server"]
