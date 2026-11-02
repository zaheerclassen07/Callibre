import { useEffect, useMemo, useState } from "react";
import {
  DRIVE_MONTHS, mergeRules, metricPoints, canWin, monthResults, winningTeam,
  centreHit, grandStandings, pct
} from "../lib/drive.js";

const GREEN = "rgba(46, 204, 113, 0.18)";
const AMBER = "rgba(243, 156, 18, 0.20)";
const RED = "rgba(231, 76, 60, 0.18)";
const GOLD = "rgba(245, 200, 66, 0.16)";
const has = (v) => v !== null && v !== undefined && v !== "";
const ptsColour = (p) => (p === null ? undefined : p >= 85 ? GREEN : p >= 60 ? AMBER : RED);

function defaultMonth() {
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (DRIVE_MONTHS.some((m) => m.key === key)) return key;
  return key > DRIVE_MONTHS[DRIVE_MONTHS.length - 1].key ? DRIVE_MONTHS[DRIVE_MONTHS.length - 1].key : DRIVE_MONTHS[0].key;
}

function MonthPills({ month, setMonth }) {
  return (
    <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
      {DRIVE_MONTHS.map((m) => (
        <button key={m.key} className={`btn btn-sm ${month === m.key ? "" : "btn-ghost"}`} onClick={() => setMonth(m.key)}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default function Drive({ db, user, agent, isAdmin, isSuper, readOnly }) {
  const R = useMemo(() => mergeRules(db.driveRules), [db.driveRules]);
  const [view, setView] = useState("results");
  const missing = (db.missingTables || []).filter((t) => t.startsWith("drive_"));

  if (missing.length) {
    return (
      <div className="card" style={{ borderColor: "#f1c40f" }}>
        <div className="card-title">🏁 Inbound Service Drive</div>
        <p className="muted">
          The drive needs its database tables first.
          {isAdmin ? " Open Supabase → SQL Editor → New query, paste sql/service-drive.sql and click Run. Then refresh." : " Ask your admin to finish the setup."}
        </p>
      </div>
    );
  }

  const views = [["results", "Results"], ["rules", "How it works"], ...(isAdmin ? [["enter", "Enter scores"]] : [])];

  return (
    <div>
      <div className="card">
        <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>🏁 Inbound Service Drive</div>
            <div className="muted" style={{ fontSize: 13 }}>November 2026 to February 2027 · Be here, be on time, be logged in.</div>
          </div>
          <div className="flex" style={{ gap: 6 }}>
            {views.map(([k, l]) => (
              <button key={k} className={`btn btn-sm ${view === k ? "" : "btn-ghost"}`} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {agent && view === "results" && <MyMonth db={db} agent={agent} R={R} />}
      {view === "results" && <Results db={db} R={R} isAdmin={isAdmin && !readOnly} myAgentId={agent?.id} />}
      {view === "rules" && <Rules db={db} R={R} canEdit={isSuper && !readOnly} />}
      {view === "enter" && isAdmin && <EnterScores db={db} R={R} readOnly={readOnly} />}
    </div>
  );
}

/* ---------------- My month (agent's own view) ---------------- */
function MyMonth({ db, agent, R }) {
  const [month, setMonth] = useState(defaultMonth);
  const row = db.driveScores.find((s) => s.month === month && s.agent_id === agent.id);
  const pts = metricPoints(row, R);
  const win = canWin(row, R);
  const { ranked } = monthResults(month, db.driveScores, db.agents, R);
  const me = ranked.find((r) => r.agent.id === agent.id);
  return (
    <div className="card">
      <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>My score</div>
        <MonthPills month={month} setMonth={setMonth} />
      </div>
      {!pts ? (
        <p className="muted mt">No score yet for this month. Scores are added at month end.</p>
      ) : (
        <div className="grid grid-4 mt">
          <Stat label={`Absence (${row.days_off} days off)`} value={`${pts.absence} / ${R.absence.full}`} />
          <Stat label={`Late coming (${row.times_late} times)`} value={`${pts.late} / ${R.late.full}`} />
          <Stat label={`Adherence (${pct(row.adherence)})`} value={`${pts.adherence} / ${R.adherence.full}`} />
          <Stat label="Total" value={`${pts.total} / 100`} bg={ptsColour(pts.total)} />
        </div>
      )}
      {pts && (
        <p className="mt" style={{ fontSize: 13 }}>
          {win === true && me ? `✅ You can win this month. Current rank: ${me.rank}.` : null}
          {win === false && (row.final_warning ? "❌ Not eligible to win this month." : `❌ Not eligible this month: QA must be ${pct(R.qaMin)} or more.`)}
          {win === null && "QA score not in yet."}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, bg }) {
  return (
    <div className="stat" style={{ background: bg }}>
      <div className="stat-num">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ---------------- Results ---------------- */
function Results({ db, R, isAdmin, myAgentId }) {
  const [month, setMonth] = useState(defaultMonth);
  const centre = (m) => db.driveCentre.find((c) => c.month === m);
  const hits = DRIVE_MONTHS.filter((m) => centreHit(centre(m.key), R) === true).length;
  const grand = useMemo(() => grandStandings(db.driveScores, db.agents, R), [db.driveScores, db.agents, R]);
  const monthR = useMemo(() => monthResults(month, db.driveScores, db.agents, R), [month, db.driveScores, db.agents, R]);
  const teamName = (id) => db.teams.find((t) => t.id === id)?.name || "";
  const all = [...monthR.ranked, ...monthR.rows.filter((r) => !r.eligible).sort((a, b) => b.total - a.total)];

  return (
    <>
      <div className="card">
        <div className="card-title">Monthly winners and centre targets</div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr><th>Month</th><th>1st</th><th>2nd</th><th>3rd</th><th>Winning team</th><th>ASA (sec)</th><th>Answer rate</th><th>Targets hit?</th></tr>
            </thead>
            <tbody>
              {DRIVE_MONTHS.map((m) => {
                const { ranked } = monthResults(m.key, db.driveScores, db.agents, R);
                const wt = winningTeam(m.key, db.driveScores, db.agents, db.teams, R);
                const c = centre(m.key);
                const hit = centreHit(c, R);
                const cell = (i) => (ranked[i] ? `${ranked[i].agent.name} (${ranked[i].total})` : "");
                return (
                  <tr key={m.key}>
                    <td><strong>{m.label}</strong></td>
                    <td>{cell(0)}</td><td>{cell(1)}</td><td>{cell(2)}</td>
                    <td>{wt ? wt.team.name : ""}</td>
                    <CentreCells db={db} month={m.key} c={c} isAdmin={isAdmin} />
                    <td style={{ background: hit === true ? GREEN : hit === false ? RED : undefined, fontWeight: 700 }}>
                      {hit === true ? "Yes" : hit === false ? "No" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt" style={{ fontWeight: 700 }}>
          Team event: {hits >= R.centreMonthsNeeded ? "🎉 Unlocked!" : `not yet (${hits} of ${R.centreMonthsNeeded} months hit)`}
        </p>
        <p className="muted" style={{ fontSize: 12 }}>Targets: ASA {R.asaMax} sec or less and answer rate {pct(R.answerMin)} or more.</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">🏆 Grand prize standings (top 10)</div>
          {grand.ranked.length === 0 ? (
            <p className="muted">No eligible agents yet. Agents must qualify in at least {R.grandMonthsNeeded} of the 4 months.</p>
          ) : (
            <table className="tbl">
              <thead><tr><th>Rank</th><th>Agent</th><th>Team</th><th>Total points</th><th>Months qualified</th></tr></thead>
              <tbody>
                {grand.ranked.slice(0, 10).map((x) => (
                  <tr key={x.agent.id} style={{ background: x.rank <= 3 ? GOLD : undefined, fontWeight: x.agent.id === myAgentId ? 700 : undefined }}>
                    <td>{x.rank}</td><td>{x.agent.name}</td><td>{teamName(x.agent.team_id)}</td><td>{x.total}</td><td>{x.qualified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt" style={{ fontSize: 13 }}>
            <strong>Most improved (Nov to Feb):</strong> {grand.improved ? `${grand.improved.agent.name} (+${grand.improved.change} points)` : "not yet"}
          </p>
        </div>

        <div className="card">
          <div className="spread" style={{ flexWrap: "wrap", gap: 8 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Month scores</div>
            <MonthPills month={month} setMonth={setMonth} />
          </div>
          {all.length === 0 ? (
            <p className="muted mt">No scores for this month yet.</p>
          ) : (
            <table className="tbl mt">
              <thead><tr><th>Rank</th><th>Agent</th><th>Team</th><th>Points</th></tr></thead>
              <tbody>
                {all.map((r) => (
                  <tr key={r.agent.id} style={{ fontWeight: r.agent.id === myAgentId ? 700 : undefined }}>
                    <td>{r.rank || "–"}</td>
                    <td>{r.agent.name}</td>
                    <td>{teamName(r.agent.team_id)}</td>
                    <td style={{ background: ptsColour(r.total) }}>{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Agents marked "–" are not eligible to win this month.</p>
        </div>
      </div>
    </>
  );
}

function CentreCells({ db, month, c, isAdmin }) {
  const [asa, setAsa] = useState(has(c?.asa) ? String(c.asa) : "");
  const [ans, setAns] = useState(has(c?.answer_rate) ? String(Math.round(c.answer_rate * 1000) / 10) : "");
  useEffect(() => {
    setAsa(has(c?.asa) ? String(c.asa) : "");
    setAns(has(c?.answer_rate) ? String(Math.round(c.answer_rate * 1000) / 10) : "");
  }, [c?.asa, c?.answer_rate]);
  if (!isAdmin) {
    return (<><td>{has(c?.asa) ? c.asa : ""}</td><td>{pct(c?.answer_rate)}</td></>);
  }
  const save = () => {
    const a = asa === "" ? null : Number(asa);
    const r = ans === "" ? null : Number(ans) / 100;
    if ((c?.asa ?? null) === a && (c?.answer_rate ?? null) === r) return;
    db.saveDriveCentre(month, a, r);
  };
  const box = { width: 70, padding: "4px 6px" };
  return (
    <>
      <td><input className="input" style={box} type="number" min="0" value={asa} onChange={(e) => setAsa(e.target.value)} onBlur={save} placeholder="sec" /></td>
      <td><input className="input" style={box} type="number" min="0" max="100" value={ans} onChange={(e) => setAns(e.target.value)} onBlur={save} placeholder="%" /></td>
    </>
  );
}

/* ---------------- How it works ---------------- */
function Rules({ db, R, canEdit }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(R);
  useEffect(() => setDraft(R), [R]);
  const P = (v) => `${Math.round(v * 100)}%`;
  const rows = [
    ["Absence", "Unplanned days off",
      `${R.absence.full} pts: ${R.absence.fullMax} days off`, `${R.absence.half} pts: ${R.absence.halfMax} day off`, `0 pts: ${R.absence.halfMax + 1}+ days off`],
    ["Late coming", "Times late for shift start",
      `${R.late.full} pts: never late`, `${R.late.half} pts: late 1 to ${R.late.halfMax} times`, `0 pts: late ${R.late.halfMax + 1}+ times`],
    ["Adherence", "% from the logged in / logged out report",
      `${R.adherence.full} pts: ${P(R.adherence.fullMin)} or more`, `${R.adherence.half} pts: ${P(R.adherence.halfMin)} to ${P(R.adherence.fullMin - 0.01)}`, `0 pts: below ${P(R.adherence.halfMin)}`]
  ];
  const total = Number(draft.absence.full) + Number(draft.late.full) + Number(draft.adherence.full);
  const setN = (path, v, isPct) => {
    const val = v === "" ? "" : isPct ? Number(v) / 100 : Number(v);
    setDraft((d) => {
      const n = JSON.parse(JSON.stringify(d));
      const keys = path.split(".");
      let o = n; keys.slice(0, -1).forEach((k) => (o = o[k]));
      o[keys[keys.length - 1]] = val;
      return n;
    });
  };
  const num = (path, isPct) => {
    const v = path.split(".").reduce((o, k) => o[k], draft);
    return (
      <input className="input" style={{ width: 80 }} type="number"
        value={v === "" ? "" : isPct ? Math.round(v * 1000) / 10 : v}
        onChange={(e) => setN(path, e.target.value, isPct)} />
    );
  };
  const save = async () => {
    if (total !== 100 && !confirm(`Full points add up to ${total}, not 100. Save anyway?`)) return;
    if (await db.saveDriveRules(draft)) setEdit(false);
  };

  return (
    <>
      <div className="card">
        <div className="card-title">How agents score (max 100 points a month)</div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Metric</th><th>What we count</th><th>Full marks</th><th>Half marks</th><th>No points</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]}>
                  <td><strong>{r[0]}</strong></td><td>{r[1]}</td>
                  <td style={{ background: GREEN }}>{r[2]}</td>
                  <td style={{ background: AMBER }}>{r[3]}</td>
                  <td style={{ background: RED }}>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted mt" style={{ fontSize: 13 }}>Being here, on time and logged in when scheduled is what brings ASA down.</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">To win any prize</div>
          <p>✅ QA score of {pct(R.qaMin)} or more</p>
          <p>✅ No active final written warning</p>
          <div className="card-title mt">Grand prizes in February</div>
          <p>Go to agents who qualify in at least {R.grandMonthsNeeded} of the 4 months.</p>
        </div>
        <div className="card">
          <div className="card-title">Centre targets (team event for everyone)</div>
          <p>ASA of {R.asaMax} sec or less</p>
          <p>Answer rate of {pct(R.answerMin)} or more</p>
          <p>Hit both in at least {R.centreMonthsNeeded} of the 4 months.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">🎁 Prizes</div>
        <p><strong>Every month:</strong> {R.prizes.monthly}</p>
        <p><strong>February:</strong> {R.prizes.grand}</p>
        <p><strong>Team reward:</strong> {R.prizes.team}</p>
      </div>

      {canEdit && (
        <div className="card">
          <div className="spread">
            <div className="card-title" style={{ marginBottom: 0 }}>⚙️ Rule settings (Super Admin)</div>
            {!edit && <button className="btn btn-sm btn-ghost" onClick={() => setEdit(true)}>Edit</button>}
          </div>
          {edit && (
            <div className="mt">
              <table className="tbl">
                <thead><tr><th>Metric</th><th>Full points</th><th>Full if</th><th>Half points</th><th>Half if</th></tr></thead>
                <tbody>
                  <tr><td>Absence (days off, up to)</td><td>{num("absence.full")}</td><td>{num("absence.fullMax")}</td><td>{num("absence.half")}</td><td>{num("absence.halfMax")}</td></tr>
                  <tr><td>Late coming (times, up to)</td><td>{num("late.full")}</td><td>{num("late.fullMax")}</td><td>{num("late.half")}</td><td>{num("late.halfMax")}</td></tr>
                  <tr><td>Adherence (% at least)</td><td>{num("adherence.full")}</td><td>{num("adherence.fullMin", true)}</td><td>{num("adherence.half")}</td><td>{num("adherence.halfMin", true)}</td></tr>
                </tbody>
              </table>
              <p style={{ color: total === 100 ? undefined : "var(--red)", fontSize: 13 }}>Full points total: {total}</p>
              <div className="form-row mt">
                <div><label className="lbl">QA at least (%)</label>{num("qaMin", true)}</div>
                <div><label className="lbl">ASA at or below (sec)</label>{num("asaMax")}</div>
                <div><label className="lbl">Answer rate at least (%)</label>{num("answerMin", true)}</div>
                <div><label className="lbl">Centre months needed</label>{num("centreMonthsNeeded")}</div>
                <div><label className="lbl">Grand prize months needed</label>{num("grandMonthsNeeded")}</div>
              </div>
              {["monthly", "grand", "team"].map((k) => (
                <div key={k} className="mt">
                  <label className="lbl">Prizes: {k === "monthly" ? "every month" : k === "grand" ? "February" : "team reward"}</label>
                  <input className="input" value={draft.prizes[k]} onChange={(e) => setDraft((d) => ({ ...d, prizes: { ...d.prizes, [k]: e.target.value } }))} />
                </div>
              ))}
              <div className="flex mt" style={{ gap: 8 }}>
                <button className="btn btn-sm" onClick={save}>Save rules</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { setDraft(R); setEdit(false); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------- Enter scores (admins) ---------------- */
function EnterScores({ db, R, readOnly }) {
  const [month, setMonth] = useState(defaultMonth);
  const [team, setTeam] = useState("all");
  const [draft, setDraft] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = {};
    db.agents.forEach((a) => {
      const s = db.driveScores.find((x) => x.month === month && x.agent_id === a.id);
      d[a.id] = {
        days_off: has(s?.days_off) ? String(s.days_off) : "",
        times_late: has(s?.times_late) ? String(s.times_late) : "",
        adherence: has(s?.adherence) ? String(Math.round(s.adherence * 1000) / 10) : "",
        qa: has(s?.qa) ? String(Math.round(s.qa * 1000) / 10) : "",
        final_warning: !!s?.final_warning
      };
    });
    setDraft(d);
    setDirty(false);
  }, [month, db.agents, db.driveScores]);

  const agents = useMemo(
    () => [...db.agents].filter((a) => team === "all" || a.team_id === team).sort((a, b) => a.name.localeCompare(b.name)),
    [db.agents, team]
  );
  const toRow = (id, d) => ({
    month, agent_id: id,
    days_off: d.days_off === "" ? null : Number(d.days_off),
    times_late: d.times_late === "" ? null : Number(d.times_late),
    adherence: d.adherence === "" ? null : Number(d.adherence) / 100,
    qa: d.qa === "" ? null : Number(d.qa) / 100,
    final_warning: !!d.final_warning
  });
  const set = (id, k, v) => { setDraft((x) => ({ ...x, [id]: { ...x[id], [k]: v } })); setDirty(true); };

  const save = async () => {
    const rows = Object.entries(draft)
      .filter(([, d]) => d.days_off !== "" || d.times_late !== "" || d.adherence !== "" || d.qa !== "" || d.final_warning)
      .map(([id, d]) => {
        const existing = db.driveScores.find((x) => x.month === month && x.agent_id === id);
        return { id: existing ? existing.id : `ds-${month}-${id}`, ...toRow(id, d) };
      });
    const bad = rows.find((r) => (has(r.adherence) && (r.adherence < 0 || r.adherence > 1)) || (has(r.qa) && (r.qa < 0 || r.qa > 1)));
    if (bad) return alert("Adherence and QA must be between 0 and 100.");
    setSaving(true);
    const ok = rows.length ? await db.saveDriveScores(rows) : true;
    setSaving(false);
    if (ok) setDirty(false);
  };

  const box = { width: 64, padding: "4px 6px" };
  const done = agents.filter((a) => metricPoints(toRow(a.id, draft[a.id] || {}), R)).length;

  return (
    <div className="card">
      <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Enter month-end scores</div>
        <MonthPills month={month} setMonth={setMonth} />
      </div>
      <div className="flex mt" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select className="input" style={{ width: 180 }} value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="all">All teams</option>
          {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 13 }}>{done} of {agents.length} agents scored · Adherence and QA as whole numbers (95 = 95%)</span>
      </div>
      <div style={{ overflowX: "auto" }} className="mt">
        <table className="tbl">
          <thead>
            <tr><th>Agent</th><th>Days off</th><th>Times late</th><th>Adherence %</th><th>QA %</th><th>Final warning</th><th>Points</th><th>Can win?</th></tr>
          </thead>
          <tbody>
            {agents.map((a) => {
              const d = draft[a.id] || {};
              const row = toRow(a.id, d);
              const p = metricPoints(row, R);
              const w = canWin(row, R);
              return (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td><input className="input" style={box} type="number" min="0" value={d.days_off ?? ""} disabled={readOnly} onChange={(e) => set(a.id, "days_off", e.target.value)} /></td>
                  <td><input className="input" style={box} type="number" min="0" value={d.times_late ?? ""} disabled={readOnly} onChange={(e) => set(a.id, "times_late", e.target.value)} /></td>
                  <td><input className="input" style={box} type="number" min="0" max="100" value={d.adherence ?? ""} disabled={readOnly} onChange={(e) => set(a.id, "adherence", e.target.value)} /></td>
                  <td><input className="input" style={box} type="number" min="0" max="100" value={d.qa ?? ""} disabled={readOnly} onChange={(e) => set(a.id, "qa", e.target.value)} /></td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" checked={!!d.final_warning} disabled={readOnly} onChange={(e) => set(a.id, "final_warning", e.target.checked)} /></td>
                  <td style={{ background: ptsColour(p ? p.total : null), fontWeight: 700 }}>{p ? p.total : ""}</td>
                  <td style={{ background: w === true ? GREEN : w === false ? RED : undefined, fontWeight: 700 }}>{w === true ? "Yes" : w === false ? "No" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="flex mt" style={{ gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : "Save month"}</button>
          {dirty && <span style={{ color: "var(--accent)", fontSize: 13 }}>Unsaved changes</span>}
        </div>
      )}
    </div>
  );
}
