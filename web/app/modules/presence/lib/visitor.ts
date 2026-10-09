const key = "blog-visitor";
const validID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export async function visitorID(): Promise<string> {
  function readOrCreate(): string {
    const fresh = crypto.randomUUID();
    try {
      const saved = localStorage.getItem(key);
      if (saved && validID.test(saved)) return saved;
      localStorage.setItem(key, fresh);
    } catch { /* 隐私模式禁止存储时，当前页面仍可参与统计。 */ }
    return fresh;
  }
  // Serialize first-time creation across tabs where Web Locks is available.
  try {
    return navigator.locks ? await navigator.locks.request(key, readOrCreate) : readOrCreate();
  } catch {
    return readOrCreate();
  }
}
