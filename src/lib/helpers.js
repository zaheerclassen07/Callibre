// Small shared helpers, matching the original app's behaviour exactly
// where it matters for data compatibility (week labels, password hashes).

// Week label format "W27 2026" - identical to original so existing
// weekly_entries rows keep lining up.
export function getWeekLabel(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset * 7);
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((d - jan1) / 864e5 + jan1.getDay() + 1) / 7);
  return `W${String(week).padStart(2, "0")} ${year}`;
}

export function getMonthLabel(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[d.getMonth()]} ${d.getFullYear()}`;
}

export function monthKey(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// SHA-256 hex, same as original login system
export async function hashPassword(plain) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
