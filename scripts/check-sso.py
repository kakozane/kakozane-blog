#!/usr/bin/env python3
"""本地 SSO 联调：创建临时管理员/读者，结束后删除；不会修改已有账号。

启动开发栈并配置 hosts 后运行 python3 scripts/check-sso.py。
默认读取本机 api/bootstrap-admin.txt，可用 BLOG_TEST_ADMIN_USER / PASSWORD 覆盖。
"""
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import ssl
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
FRONT = "https://dev.retniw.cc"
ADMIN = "https://admin.dev.retniw.cc"
FP = "/api/v1/auth"
AP = "/api/v1/admin/auth"
TLS = ssl.create_default_context(cafile=str(ROOT / "local-ca.crt"))


def client():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=TLS), urllib.request.HTTPCookieProcessor(jar))


def request(browser, origin, path, method="GET", body=None, source=None, expected=200):
    headers = {"Origin": source or origin}
    if method == "OPTIONS":
        headers.update({"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(origin + path, data=data, headers=headers, method=method)
    try:
        response = browser.open(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        raw = response.read()
        assert response.status == expected, f"{method} {path}: got {response.status}, expected {expected}"
        return json.loads(raw) if raw else None, response.headers


def login(browser, origin, path, credentials):
    return request(browser, origin, path + "/login", "POST", credentials)[0]


def ticket(browser, origin, path, destination):
    status, _ = request(browser, origin, path + "/sso/status", source=destination)
    return request(browser, origin, path + "/sso/ticket", "POST", {"userId": status["user"]["id"]}, destination)[0]["ticket"]


def exchange(browser, origin, path, code, expected=200):
    return request(browser, origin, path + "/sso/exchange", "POST", {"ticket": code}, expected=expected)


def main():
    credentials = {}
    if (ROOT / "api/bootstrap-admin.txt").exists():
        credentials = dict(line.split(": ", 1) for line in (ROOT / "api/bootstrap-admin.txt").read_text().splitlines())
    credentials = {"username": os.getenv("BLOG_TEST_ADMIN_USER", credentials.get("username", "")), "password": os.getenv("BLOG_TEST_ADMIN_PASSWORD", credentials.get("password", ""))}
    if not all(credentials.values()):
        raise SystemExit("请通过本地文件或环境变量提供联调管理员账号。")
    owner = client()
    login(owner, ADMIN, AP, credentials)
    created = []
    try:
        fixtures = {}
        for role in ("admin", "reader"):
            payload = {"username": "sso_check_" + secrets.token_hex(6), "password": secrets.token_urlsafe(24), "displayName": "SSO 临时验证", "role": role}
            user, _ = request(owner, ADMIN, "/api/v1/admin/users", "POST", payload, expected=201)
            created.append(user["id"])
            fixtures[role] = (user["id"], {k: payload[k] for k in ("username", "password")})

        browser = client()
        login(browser, FRONT, FP, fixtures["admin"][1])
        request(browser, ADMIN, AP + "/me", expected=401)
        status, headers = request(browser, FRONT, FP + "/sso/status", source=ADMIN)
        assert status["canLogin"] and "role" not in status["user"] and "permissions" not in status["user"]
        assert headers["Access-Control-Allow-Origin"] == ADMIN and headers["Access-Control-Allow-Credentials"] == "true"
        _, headers = request(browser, FRONT, FP + "/sso/ticket", "OPTIONS", source=ADMIN, expected=204)
        assert headers["Access-Control-Allow-Origin"] == ADMIN
        _, headers = request(browser, FRONT, FP + "/sso/status", source="https://evil.dev.retniw.cc", expected=403)
        assert "Access-Control-Allow-Origin" not in headers
        request(browser, FRONT, FP + "/sso/ticket", "POST", {"userId": fixtures["reader"][0]}, ADMIN, expected=409)
        code = ticket(browser, FRONT, FP, ADMIN)
        exchange(client(), "https://localhost:6326", AP, code, expected=401)
        result, headers = exchange(browser, ADMIN, AP, code)
        assert result["user"]["role"] == "admin"
        cookie = headers["Set-Cookie"]
        assert "__Host-blog-admin=" in cookie and "Domain=" not in cookie and "HttpOnly" in cookie and "Secure" in cookie and "SameSite=Strict" in cookie
        exchange(client(), ADMIN, AP, code, expected=401)
        code = ticket(browser, FRONT, FP, ADMIN)
        exchange(browser, ADMIN, AP, code, expected=409)
        request(browser, FRONT, FP + "/logout", "POST", expected=204)
        exchange(client(), ADMIN, AP, code, expected=401)
        request(browser, ADMIN, AP + "/me")  # 本端退出不注销另一端的独立会话。
        print("PASS: front → admin, exact origins, host-only cookies, replay, existing-session protection and source logout")

        reverse = client()
        login(reverse, ADMIN, AP, fixtures["admin"][1])
        status, _ = request(reverse, ADMIN, AP + "/sso/status", source=FRONT)
        assert status["canLogin"] and "role" not in status["user"]
        result, _ = exchange(reverse, FRONT, FP, ticket(reverse, ADMIN, AP, FRONT))
        assert "role" not in result["user"] and "permissions" not in result["user"]
        request(reverse, FRONT, FP + "/me")
        print("PASS: admin → front and public profile boundaries")

        reader = client()
        login(reader, FRONT, FP, fixtures["reader"][1])
        status, _ = request(reader, FRONT, FP + "/sso/status", source=ADMIN)
        assert status["user"] and not status["canLogin"]
        request(reader, FRONT, FP + "/sso/ticket", "POST", {"userId": fixtures["reader"][0]}, ADMIN, expected=403)
        print("PASS: readers cannot exchange an admin session")

        code = ticket(reverse, ADMIN, AP, FRONT)
        request(owner, ADMIN, f"/api/v1/admin/users/{fixtures['admin'][0]}", "PUT", {"displayName": "SSO 临时验证", "role": "reader", "status": "active"})
        exchange(client(), FRONT, FP, code, expected=401)
        print("PASS: role/session-version changes invalidate outstanding tickets")
    finally:
        for user_id in reversed(created):
            request(owner, ADMIN, f"/api/v1/admin/users/{user_id}", "DELETE", expected=204)
        request(owner, ADMIN, AP + "/logout", "POST", expected=204)
        print("Temporary accounts removed; test administrator session logged out.")


if __name__ == "__main__":
    main()
