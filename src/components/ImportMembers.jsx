import { useMemo, useState } from "react";
import { AGENT_COLORS } from "../constants.js";
import { getWeekLabel, hashPassword, uid } from "../lib/helpers.js";
import { parseTable, mapHeader, normName, makeUsername, downloadText, readFileText } from "../lib/importer.js";

// Checked in this order, so "Username" isn't mistaken for "Name".
const FIELDS = {
  username: ["username", "login", "user"],
  team: ["team"],
  name: ["name"],
  emp: ["employee", "empid", "staff", "number", "id"],
  role: ["role", "type", "position"],
  agentcol: ["agent", "member", "person"]
};

const TEMPLATE = "Name,Team,Employee ID,Username,Role\nThabo Mokoena,CSR,CSR001,,Agent\nLerato Khumalo,CSR,CSR002,,Agent\nSipho Ndlovu,FA,,,Team Leader\n";

export default function ImportMembers({ db }) {
  const [text, setText] = useState("");
  const [logins, setLogins] = useState(true);
  const [password, setPassword] = useState("Welcome@2026");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const plan = useMemo(() => {
    const rows = parseTable(text);
    if (!rows.length) return null;
    let map = mapHeader(rows[0], FIELDS);
    if (map && map.name === undefined && map.agentcol !== undefined) map.name = map.agentcol;
    let body = rows;
    if (map && map.name !== undefined) body = rows.slice(1);
    else map = { name: 0, team: 1, emp: 2, username: 3, role: 4 };

    const teamByName = new Map(db.teams.map((t) => [normName(t.name), t]));
    db.teams.forEach((t) => t.full_name && teamByName.set(normName(t.full_name), t));
    const existingNames = new Set(db.agents.map((a) => normName(a.name)));
    const existingEmp = new Set(db.agents.map((a) => normName(a.emp_id)).filter(Boolean));
    const taken = new Set(db.users.map((u) => normName(u.username)));
    const seen = new Set();
    const newTeams = new Map();

    const items = body.map((r) => {
      const cell = (k) => (map[k] !== undefined ? String(r[map[k]] || "").trim() : "");
      const name = cell("name").replace(/\s+/g, " ");
      const teamName = cell("team");
      const emp = cell("emp");
      const isTL = /lead|tl|admin|manager|supervisor/i.test(cell("role"));
      const key = normName(name);
      let status = "new", note = "";
      if (!name) { status = "skip"; note = "No name"; }
      else if (seen.has(key)) { status = "skip"; note = "Listed twice"; }
      else if (!isTL && (existingNames.has(key) || (emp && existingEmp.has(normName(emp))))) { status = "skip"; note = "Already in the app"; }
      else if (isTL && db.users.some((u) => normName(u.display_name) === key)) { status = "skip"; note = "Already has a login"; }
      if (key) seen.add(key);

      let team = teamName ? teamByName.get(normName(teamName)) || newTeams.get(normName(teamName)) : null;
      if (teamName && !team && status === "new") {
        team = { id: uid(), name: teamName, full_name: teamName, color: AGENT_COLORS[(db.teams.length + newTeams.size) % AGENT_COLORS.length], _new: true };
        newTeams.set(normName(teamName), team);
      }
      if (status === "new" && !team && !isTL) note = "No team (can be set later)";

      let username = "";
      if (status === "new" && (logins || isTL)) {
        const wanted = normName(cell("username")).replace(/\s/g, "");
        if (wanted && !taken.has(wanted)) { username = wanted; taken.add(wanted); }
        else username = makeUsername(name, taken);
      }
      return { name, emp, team, isTL, username, status, note };
    });
    return { items, newTeams: [...newTeams.values()] };
  }, [text, logins, db.teams, db.agents, db.users]);

  const toAdd = plan ? plan.items.filter((i) => i.status === "new") : [];

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) {
      alert("Excel files can't be read directly. In Excel, either copy the cells and paste them in the box, or use File → Save As → CSV and upload that.");
      return;
    }
    try { setText(await readFileText(f)); setDone(null); } catch (err) { alert(err.message); }
  };

  const run = async () => {
    if (!toAdd.length) return;
    if (logins && password.length < 6) return alert("Use a starting password of at least 6 characters.");
    if (!confirm(`Add ${toAdd.length} people${plan.newTeams.length ? ` and ${plan.newTeams.length} new team(s)` : ""}?`)) return;
    setBusy(true);
    const hash = await hashPassword(password);
    const week = getWeekLabel(0);
    const teams = plan.newTeams.map(({ _new, ...t }) => t);
    const agents = [], users = [];
    toAdd.forEach((i, n) => {
      if (i.isTL) {
        users.push({ id: uid(), username: i.username, password_hash: hash, role: "admin", team_id: i.team?.id || null, display_name: i.name, created_at: new Date().toISOString() });
        return;
      }
      const agentId = uid();
      agents.push({ id: agentId, name: i.name, emp_id: i.emp || null, team_id: i.team?.id || null, color: AGENT_COLORS[n % AGENT_COLORS.length], joined_week: week });
      if (logins) users.push({ id: uid(), username: i.username, password_hash: hash, role: "agent", agent_id: agentId, team_id: i.team?.id || null, display_name: i.name, created_at: new Date().toISOString() });
    });
    const ok = await db.bulkImport({ teams, agents, users });
    setBusy(false);
    if (ok) {
      setDone({ count: toAdd.length, logins: users, password });
      setText("");
    }
  };

  const loginList = () =>
    downloadText("callibre-logins.csv", "Name,Username,Starting password\n" + done.logins.map((u) => `"${u.display_name}",${u.username},${done.password}`).join("\n"));

  return (
    <div className="card">
      <div className="card-title">📥 Import members from a list</div>
      <p className="muted" style={{ fontSize: 13 }}>
        Columns: <strong>Name</strong> (required), Team, Employee ID, Username, Role (Agent or Team Leader).
        Copy the cells from Excel and paste below, or upload a CSV. New teams are created automatically,
        and everyone you add appears straight away in Members, Weekly points, Service Drive and the leaderboards.
      </p>
      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
        <label className="btn btn-sm btn-ghost" style={{ cursor: "pointer" }}>
          📄 Upload CSV
          <input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" onChange={onFile} style={{ display: "none" }} />
        </label>
        <button className="btn btn-sm btn-ghost" onClick={() => downloadText("callibre-import-template.csv", TEMPLATE)}>⬇️ Download template</button>
      </div>
      <textarea
        className="input mt"
        rows={6}
        placeholder={"Paste from Excel here, e.g.\nName\tTeam\tEmployee ID\nThabo Mokoena\tCSR\tCSR001"}
        value={text}
        onChange={(e) => { setText(e.target.value); setDone(null); }}
        style={{ fontFamily: "monospace", fontSize: 12 }}
      />
      <div className="flex mt" style={{ gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <label className="flex" style={{ gap: 6, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={logins} onChange={(e) => setLogins(e.target.checked)} /> Create logins for agents
        </label>
        {(logins || plan?.items.some((i) => i.isTL)) && (
          <label className="flex" style={{ gap: 6, alignItems: "center", fontSize: 13 }}>
            Starting password <input className="input" style={{ width: 150 }} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
      </div>

      {plan && (
        <>
          <div className="mt" style={{ fontSize: 13 }}>
            <strong>{toAdd.length}</strong> to add · {plan.items.length - toAdd.length} skipped
            {plan.newTeams.length ? ` · new teams: ${plan.newTeams.map((t) => t.name).join(", ")}` : ""}
          </div>
          <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }} className="mt">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Role</th><th>Team</th><th>Employee ID</th><th>Username</th><th>Status</th></tr></thead>
              <tbody>
                {plan.items.map((i, n) => (
                  <tr key={n} style={{ opacity: i.status === "skip" ? 0.5 : 1 }}>
                    <td>{i.name || "—"}</td>
                    <td>{i.isTL ? "Team Leader" : "Agent"}</td>
                    <td>{i.team ? `${i.team.name}${i.team._new ? " (new)" : ""}` : "—"}</td>
                    <td>{i.emp || "—"}</td>
                    <td>{i.username || "—"}</td>
                    <td>{i.status === "new" ? (i.note ? `✅ Add · ${i.note}` : "✅ Add") : `⏭️ ${i.note}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn mt" disabled={busy || !toAdd.length} onClick={run}>{busy ? "Importing…" : `Import ${toAdd.length} ${toAdd.length === 1 ? "person" : "people"}`}</button>
        </>
      )}

      {done && (
        <div className="mt" style={{ padding: 12, borderRadius: 8, background: "rgba(46,204,113,0.12)" }}>
          ✅ Added {done.count}. {done.logins.length ? `${done.logins.length} logins created with the starting password. Ask everyone to change it in Settings.` : ""}
          {done.logins.length > 0 && <button className="btn btn-sm btn-ghost" style={{ marginLeft: 8 }} onClick={loginList}>⬇️ Download login list</button>}
        </div>
      )}
    </div>
  );
}
