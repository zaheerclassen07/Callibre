// ============================================================
// Read pasted Excel cells or a CSV file into rows of cells.
// Works with tab (copied from Excel), comma or semicolon.
// ============================================================

export function parseTable(text) {
  const clean = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  const first = clean.split("\n")[0];
  const delim = first.includes("\t") ? "\t" : (first.split(";").length > first.split(",").length ? ";" : ",");
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell.trim()); rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ""));
}

// Find which column holds what, from a header row. Returns null if no header.
export function mapHeader(headerRow, fields) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const map = {};
  headerRow.forEach((h, i) => {
    const n = norm(h);
    for (const [key, words] of Object.entries(fields)) {
      if (map[key] === undefined && words.some((w) => n === w || n.includes(w))) { map[key] = i; break; }
    }
  });
  return Object.keys(map).length ? map : null;
}

// "95%", "95", "0.95" -> 0.95
export function toFraction(v) {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace("%", "").replace(",", ".").trim());
  if (Number.isNaN(n)) return NaN;
  return n > 1 ? n / 100 : n;
}

export function toCount(v) {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isNaN(n) ? NaN : n;
}

export function toYes(v) {
  return /^(y|yes|true|1|x)$/i.test(String(v || "").trim());
}

export const normName = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

export function makeUsername(name, taken) {
  const parts = normName(name).replace(/[^a-z ]/g, "").split(" ").filter(Boolean);
  let base = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || "user";
  let u = base, i = 2;
  while (taken.has(u)) u = `${base}${i++}`;
  taken.add(u);
  return u;
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Couldn't read the file."));
    r.readAsText(file);
  });
}
