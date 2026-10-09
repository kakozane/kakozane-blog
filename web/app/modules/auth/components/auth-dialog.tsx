import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import LoginForm from "./login-form";
import RegisterForm from "./register-form";

export function AuthDialog() {
  const location = useLocation();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const params = new URLSearchParams(location.search);
  const mode = params.get("auth");
  params.delete("auth");
  const next = `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`;
  const open = mode === "login" || mode === "register";
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  function close() { void navigate(next, { replace: true, preventScrollReset: true }); }
  return <dialog ref={dialog} className="auth-dialog" aria-labelledby="auth-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="auth-dialog-content">
      <button className="auth-dialog-close" aria-label="关闭登录注册" onClick={close} type="button">×</button>
      {open && (mode === "register" ? <RegisterForm next={next} /> : <LoginForm next={next} />)}
    </div>
  </dialog>;
}
