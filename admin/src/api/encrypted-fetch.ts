// 与 admin/src/api/encrypted-fetch.ts 保持协议一致，两端独立构建。
// HTTPS 仍必须启用；此层用于隐藏 Network 中的原始密码，不防浏览器本地调试。
const encoder = new TextEncoder();
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const toBase64 = (value: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(value)));

export async function encryptedFetch(path: string, input: unknown): Promise<Response> {
  if (!globalThis.crypto?.subtle) throw new Error("请使用 HTTPS 和支持加密的浏览器");
  const keyResponse = await fetch("/api/v1/auth/encryption-key", { credentials: "same-origin", cache: "no-store" });
  if (!keyResponse.ok) throw new Error("无法获取加密公钥，请稍后重试");
  const { keyId, publicKey, issuedAt } = await keyResponse.json() as {
    keyId: string; publicKey: string; issuedAt: number;
  };
  const rsa = await crypto.subtle.importKey("spki", fromBase64(publicKey), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const rawKey = await crypto.subtle.exportKey("raw", aes);
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsa, rawKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = "blog-password:v1\nPOST\n" + path;
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
    aes, encoder.encode(JSON.stringify({ issuedAt, data: input })),
  );
  const response = await fetch(path, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version: 1, keyId, wrappedKey: toBase64(wrappedKey), iv: toBase64(iv), data: toBase64(encrypted) }),
  });
  // 只有重置密码的成功响应含有新密码，需要在浏览器内解密后交给页面。
  if (response.ok && path.endsWith("/reset-password")) {
    const envelope = await response.json() as { version: number; iv: string; data: string };
    if (envelope.version !== 1) throw new Error("密码响应格式错误");
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(envelope.iv), additionalData: encoder.encode("response\n" + aad) },
      aes, fromBase64(envelope.data),
    );
    return new Response(plaintext, { status: response.status, headers: { "Content-Type": "application/json" } });
  }
  return response;
}
