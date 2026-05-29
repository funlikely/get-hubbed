const TOKEN_KEY = "get-hubbed.pat";
const EMAIL_KEY = "get-hubbed.commit-email";
const REPO_KEY = "get-hubbed.last-repo";
const INTERVAL_KEY = "get-hubbed.tick-ms";

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY) ?? "",
  setToken: (v: string) => localStorage.setItem(TOKEN_KEY, v),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  getEmail: () => localStorage.getItem(EMAIL_KEY) ?? "",
  setEmail: (v: string) => localStorage.setItem(EMAIL_KEY, v),

  getRepo: () => localStorage.getItem(REPO_KEY) ?? "",
  setRepo: (v: string) => localStorage.setItem(REPO_KEY, v),

  getTickMs: () => {
    const raw = localStorage.getItem(INTERVAL_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 50 ? n : 250;
  },
  setTickMs: (v: number) => localStorage.setItem(INTERVAL_KEY, String(v)),
};
