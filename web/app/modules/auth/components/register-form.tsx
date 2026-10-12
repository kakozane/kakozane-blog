import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { login, register, sendRegistrationCode } from "../api/auth";
import { authPagePath } from "../lib/auth-return";

export default function AuthForm({ next = "/" }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const emailInput = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    if (!emailInput.current?.reportValidity() || sending || cooldown > 0) return;
    const email = emailInput.current.value.trim();
    setSending(true);
    setError("");
    setNotice("");
    try {
      await sendRegistrationCode(email);
      setCooldown(60);
      setNotice(`验证码已发送至 ${email}，10 分钟内有效，请检查收件箱或垃圾邮件。`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "验证码发送失败"); }
    finally { setSending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const displayName = String(form.get("displayName") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirmPassword")) { setError("两次输入的密码不一致"); return; }
    setPending(true);
    setError("");
    try {
      await register({ username, displayName, password, email: String(form.get("email") ?? "").trim(), code: String(form.get("code") ?? "").trim() });
      await login({ username, password });
      window.location.assign(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "注册失败"); }
    finally { setPending(false); }
  }

  return (
    <div>
      <div className="auth-panel">
        <h1 id="auth-dialog-title">创建账号</h1>
        <p className="auth-intro">注册后可以参与讨论。评论发布前会经过审核。</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field"><label htmlFor="username">账号</label><input autoComplete="username" id="username" maxLength={64} minLength={3} name="username" pattern="[a-z0-9_]+" required /></div>
          <div className="auth-field"><label htmlFor="displayName">昵称</label><input id="displayName" maxLength={100} name="displayName" required /></div>
          <div className="auth-field"><label htmlFor="email">邮箱</label><input ref={emailInput} autoComplete="email" id="email" maxLength={254} name="email" required type="email" /></div>
          <div className="auth-field"><label htmlFor="code">邮箱验证码</label><div className="auth-code-row"><input autoComplete="one-time-code" id="code" inputMode="numeric" maxLength={6} minLength={6} name="code" pattern="[0-9]{6}" placeholder="6 位验证码" required /><button disabled={sending || cooldown > 0 || pending} onClick={sendCode} type="button">{sending ? "发送中…" : cooldown > 0 ? `${cooldown} 秒后重发` : "发送验证码"}</button></div></div>
          {notice && <p className="auth-code-notice" role="status">{notice}</p>}
          <div className="auth-field"><label htmlFor="password">密码（至少 8 位）</label><input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" /></div>
          <div className="auth-field"><label htmlFor="confirmPassword">确认密码</label><input autoComplete="new-password" id="confirmPassword" minLength={8} name="confirmPassword" required type="password" /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={pending || sending} type="submit">{pending ? "注册中…" : "注册并登录"}</button>
        </form>
        <p className="auth-switch">已有账号？<Link preventScrollReset replace to={authPagePath("login", next)}>去登录</Link></p>
      </div>
    </div>
  );
}
