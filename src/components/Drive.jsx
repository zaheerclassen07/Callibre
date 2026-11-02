import { useEffect, useMemo, useState } from "react";
import {
  DRIVE_MONTHS, mergeRules, metricPoints, canWin, monthResults, teamStandings, overallTeamStandings,
  centreHit, grandStandings, budgetTotals, pct, rand
} from "../lib/drive.js";
import { parseTable, mapHeader, normName, toFraction, toCount, toYes, readFileText, downloadText } from "../lib/importer.js";

const GREEN = "rgba(46, 204, 113, 0.18)";
const AMBER = "rgba(243, 156, 18, 0.20)";
const RED = "rgba(231, 76, 60, 0.18)";
const GOLD = "rgba(245, 200, 66, 0.18)";
const has = (v) => v !== null && v !== undefined && v !== "";
const ptsColour = (p) => (p === null || p === undefined ? undefined : p >= 85 ? GREEN : p >= 60 ? AMBER : RED);
const monthLabel = (k) => DRIVE_MONTHS.find((m) => m.key === k)?.label || k;

export function defaultDriveMonth() {
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (DRIVE_MONTHS.some((m) => m.key === key)) return key;
  return key > DRIVE_MONTHS[DRIVE_MONTHS.length - 1].key ? DRIVE_MONTHS[DRIVE_MONTHS.length - 1].key : DRIVE_MONTHS[0].key;
}

function MonthPills({ month, setMonth, extra }) {
  return (
    <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
      {DRIVE_MONTHS.map((m) => (
        <button key={m.key} className={`btn btn-sm ${month === m.key ? "" : "btn-ghost"}`} onClick={() => setMonth(m.key)}>{m.label}</button>
      ))}
      {extra}
    </div>
  );
}

function Empty({ children }) {
  return <p className="muted mt" style={{ fontSize: 13 }}>{children}</p>;
}

export default function Drive({ db, user, agent, isAdmin, isSuper, readOnly, view: viewProp, setView: setViewProp }) {
  const R = useMemo(() => mergeRules(db.driveRules), [db.driveRules]);
  const [viewLocal, setViewLocal] = useState("results");
  const view = viewProp || viewLocal;
  const setView = setViewProp || setViewLocal;
  const myTeamId = !isSuper && isAdmin ? user.team_id || null : null;
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

  const views = [
    ["results", "🏆 Results"],
    ["board", "📊 Leaderboard"],
    ["teams", "👥 Teams"],
    ["rules", "📘 How it works"],
    ...(isAdmin ? [["budget", "💰 Budget"], ["enter", "✏️ Enter scores"]] : [])
  ];

  return (
    <div>
      <div className="card">
        <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>🏁 Inbound Service Drive</div>
            <div className="muted" style={{ fontSize: 13 }}>November 2026 to February 2027 · Be here, be on time, be logged in.</div>
          </div>
          <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
            {views.map(([k, l]) => (
              <button key={k} className={`btn btn-sm ${view === k ? "" : "btn-ghost"}`} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {view === "results" && agent && <MyMonth db={db} agent={agent} R={R} />}
      {view === "results" && <Results db={db} R={R} canEditCentre={isSuper && !readOnly} myAgentId={agent?.id} />}
      {view === "board" && <Leaderboard db={db} R={R} isAdmin={isAdmin} myAgentId={agent?.id} />}
      {view === "teams" && <Teams db={db} R={R} isAdmin={isAdmin} />}
      {view === "rules" && <Rules db={db} R={R} canEdit={isSuper && !readOnly} />}
      {view === "budget" && isAdmin && <Budget db={db} R={R} canEdit={isSuper && !readOnly} />}
      {view === "enter" && isAdmin && <EnterScores db={db} R={R} readOnly={readOnly} myTeamId={myTeamId} />}
    </div>
  );
}

/* ---------------- My score (agent's own view) ---------------- */
function MyMonth({ db, agent, R }) {
  const [month, setMonth] = useState(defaultDriveMonth);
  const row = db.driveScores.find((s) => s.month === month && s.agent_id === agent.id);
  const pts = metricPoints(row, R);
  const win = canWin(row, R);
  const me = monthResults(month, db.driveScores, db.agents, R).ranked.find((r) => r.agent.id === agent.id);
  return (
    <div className="card">
      <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>My score</div>
        <MonthPills month={month} setMonth={setMonth} />
      </div>
      {!pts ? (
        <Empty>No score yet for {monthLabel(month)}. Scores are added at month end.</Empty>
      ) : (
        <>
          <div className="grid grid-4 mt">
            <Stat label={`Absence (${row.days_off} days off)`} value={`${pts.absence} / ${R.absence.full}`} />
            <Stat label={`Late coming (${row.times_late} times)`} value={`${pts.late} / ${R.late.full}`} />
            <Stat label={`Adherence (${pct(row.adherence)})`} value={`${pts.adherence} / ${R.adherence.full}`} />
            <Stat label="Total" value={`${pts.total} / 100`} bg={ptsColour(pts.total)} />
          </div>
          <p className="mt" style={{ fontSize: 13 }}>
            {win === true && me && `✅ You can win this month. You're ranked ${me.rank}.`}
            {win === false && (row.final_warning ? "❌ Not eligible to win this month." : `❌ Not eligible this month: QA must be ${pct(R.qaMin)} or more.`)}
            {win === null && "⏳ QA score not in yet."}
          </p>
        </>
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
function Results({ db, R, canEditCentre, myAgentId }) {
  const centre = (m) => db.driveCentre.find((c) => c.month === m);
  const hits = DRIVE_MONTHS.filter((m) => centreHit(centre(m.key), R) === true).length;
  const grand = useMemo(() => grandStandings(db.driveScores, db.agents, R), [db.driveScores, db.agents, R]);
  const teamName = (id) => db.teams.find((t) => t.id === id)?.name || "";

  return (
    <>
      <div className="card">
        <div className="card-title">Monthly winners and centre targets</div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr><th>Month</th><th>🥇 1st</th><th>🥈 2nd</th><th>🥉 3rd</th><th>Winning team</th><th>ASA (sec)</th><th>Answer rate</th><th>Targets hit?</th></tr>
            </thead>
            <tbody>
              {DRIVE_MONTHS.map((m) => {
                const { ranked } = monthResults(m.key, db.driveScores, db.agents, R);
                const wt = teamStandings(m.key, db.driveScores, db.agents, db.teams, R).winner;
                const c = centre(m.key);
                const hit = centreHit(c, R);
                const cell = (i) => (ranked[i] ? `${ranked[i].agent.name} (${ranked[i].total})` : "");
                return (
                  <tr key={m.key}>
                    <td><strong>{m.label}</strong></td>
                    <td>{cell(0)}</td><td>{cell(1)}</td><td>{cell(2)}</td>
                    <td>{wt ? `${wt.team.name} (${wt.avg.toFixed(1)} avg)` : ""}</td>
                    <CentreCells db={db} month={m.key} c={c} canEdit={canEditCentre} />
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
        <p className="muted" style={{ fontSize: 12 }}>
          Targets: ASA {R.asaMax} sec or less and answer rate {pct(R.answerMin)} or more.
          {canEditCentre ? " Type each month's centre ASA and answer rate in the table; they save when you click away." : ""}
        </p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">🏆 Grand prize standings (top 10)</div>
          <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
            {grand.final ? "Final standings." : `Running totals so far. Only agents who can still qualify in ${R.grandMonthsNeeded} of the 4 months are shown.`}
          </p>
          {grand.ranked.length === 0 ? (
            <Empty>No scores yet.</Empty>
          ) : (
            <table className="tbl">
              <thead><tr><th>Rank</th><th>Agent</th><th>Team</th><th>Points</th><th>Months qualified</th></tr></thead>
              <tbody>
                {grand.ranked.slice(0, 10).map((x) => (
                  <tr key={x.agent.id} style={{ background: x.rank <= 3 ? GOLD : undefined, fontWeight: x.agent.id === myAgentId ? 700 : undefined }}>
                    <td>{x.rank}</td><td>{x.agent.name}</td><td>{teamName(x.agent.team_id)}</td><td>{x.total}</td><td>{x.qualified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="card-title">🎁 Prizes</div>
          <p style={{ fontSize: 13 }}><strong>Every month:</strong> {R.prizes.monthly}</p>
          <p style={{ fontSize: 13 }}><strong>February:</strong> {R.prizes.grand}</p>
          <p style={{ fontSize: 13 }}><strong>Team reward:</strong> {R.prizes.team}</p>
          <p className="mt" style={{ fontSize: 13 }}>
            <strong>📈 Most improved (Nov to Feb):</strong> {grand.improved ? `${grand.improved.agent.name} (+${grand.improved.change} points)` : "decided once February is in"}
          </p>
        </div>
      </div>
    </>
  );
}

function CentreCells({ db, month, c, canEdit }) {
  const fmtA = (x) => (has(x?.asa) ? String(x.asa) : "");
  const fmtR = (x) => (has(x?.answer_rate) ? String(Math.round(x.answer_rate * 1000) / 10) : "");
  const [asa, setAsa] = useState(fmtA(c));
  const [ans, setAns] = useState(fmtR(c));
  const [focus, setFocus] = useState(null);
  // Refresh from the database, but never overwrite a box someone is typing in.
  useEffect(() => { if (focus !== "asa") setAsa(fmtA(c)); if (focus !== "ans") setAns(fmtR(c)); }, [c?.asa, c?.answer_rate]); // eslint-disable-line
  if (!canEdit) return (<><td>{has(c?.asa) ? c.asa : ""}</td><td>{pct(c?.answer_rate)}</td></>);
  const save = (nextAsa, nextAns) => {
    const a = nextAsa === "" ? null : Number(nextAsa);
    const r = nextAns === "" ? null : toFraction(nextAns);
    if ((a !== null && (Number.isNaN(a) || a < 0)) || (r !== null && (Number.isNaN(r) || r < 0 || r > 1))) {
      alert("ASA must be seconds (e.g. 28) and answer rate a % (e.g. 95)."); return;
    }
    if ((c?.asa ?? null) === a && (c?.answer_rate ?? null) === r) return;
    db.saveDriveCentre(month, a, r);
  };
  const box = { width: 72, padding: "4px 6px" };
  return (
    <>
      <td><input className="input" style={box} type="number" min="0" value={asa} placeholder="sec"
        onFocus={() => setFocus("asa")} onChange={(e) => setAsa(e.target.value)} onBlur={() => { setFocus(null); save(asa, ans); }} /></td>
      <td><input className="input" style={box} type="number" min="0" max="100" value={ans} placeholder="%"
        onFocus={() => setFocus("ans")} onChange={(e) => setAns(e.target.value)} onBlur={() => { setFocus(null); save(asa, ans); }} /></td>
    </>
  );
}

/* ---------------- Leaderboard ---------------- */
function Leaderboard({ db, R, isAdmin, myAgentId }) {
  const [month, setMonth] = useState(defaultDriveMonth);
  const [team, setTeam] = useState("all");
  const teamName = (id) => db.teams.find((t) => t.id === id)?.name || "—";
  const overall = month === "overall";

  const data = useMemo(() => {
    if (overall) {
      const g = grandStandings(db.driveScores, db.agents, R);
      const rankedIds = new Set(g.ranked.map((x) => x.agent.id));
      const rest = g.list.filter((x) => !rankedIds.has(x.agent.id) && x.byMonth.some(Boolean)).sort((a, b) => b.total - a.total);
      return {
        ranked: g.ranked.map((x) => ({ agent: x.agent, total: x.total, rank: x.rank, sub: `${x.qualified} months qualified` })),
        rest: rest.map((x) => ({ agent: x.agent, total: x.total, sub: `${x.qualified} months qualified` }))
      };
    }
    const m = monthResults(month, db.driveScores, db.agents, R);
    return {
      ranked: m.ranked.map((r) => ({ agent: r.agent, total: r.total, rank: r.rank, pts: r.pts })),
      rest: m.rows.filter((r) => !r.eligible).sort((a, b) => b.total - a.total).map((r) => ({ agent: r.agent, total: r.total, pts: r.pts }))
    };
  }, [overall, month, db.driveScores, db.agents, R]);

  const inTeam = (x) => team === "all" || x.agent.team_id === team;
  const ranked = data.ranked.filter(inTeam);
  // Agents never see who isn't eligible (that could reveal QA or a warning). They see their own row.
  const rest = (isAdmin ? data.rest : data.rest.filter((x) => x.agent.id === myAgentId)).filter(inTeam);
  const podium = data.ranked.slice(0, 3);

  return (
    <div className="card">
      <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>📊 Leaderboard</div>
        <MonthPills month={month} setMonth={setMonth} extra={
          <button className={`btn btn-sm ${overall ? "" : "btn-ghost"}`} onClick={() => setMonth("overall")}>Whole drive</button>
        } />
      </div>

      {podium.length === 0 ? (
        <Empty>No eligible scores for {overall ? "the drive" : monthLabel(month)} yet.</Empty>
      ) : (
        <div className="flex mt" style={{ gap: 12, justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap" }}>
          {[1, 0, 2].map((i) => podium[i] && (
            <div key={i} style={{ textAlign: "center", width: 150 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{podium[i].agent.name}</div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{podium[i].total} pts</div>
              <div style={{
                height: [110, 80, 60][i], borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 30, background: i === 0 ? "linear-gradient(180deg,#F5C842,#c9971b)" : i === 1 ? "linear-gradient(180deg,#cfd8e3,#8e9aab)" : "linear-gradient(180deg,#e0a46b,#a8693a)"
              }}>{["🥇", "🥈", "🥉"][i]}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex mt" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select className="input" style={{ width: 180 }} value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="all">All teams</option>
          {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 12 }}>
          {overall ? `Grand prizes need ${R.grandMonthsNeeded} of 4 months qualified. "–" means out of the running.` : `To win: QA ${pct(R.qaMin)}+ and no final written warning.`}
        </span>
      </div>

      <div style={{ overflowX: "auto" }} className="mt">
        <table className="tbl">
          <thead>
            <tr><th>Rank</th><th>Agent</th><th>Team</th>{!overall && <><th>Absence</th><th>Late</th><th>Adherence</th></>}<th>Points</th>{overall && <th />}</tr>
          </thead>
          <tbody>
            {[...ranked, ...rest].map((x) => (
              <tr key={x.agent.id} style={{ background: x.agent.id === myAgentId ? GOLD : undefined, fontWeight: x.agent.id === myAgentId ? 700 : undefined }}>
                <td>{x.rank ? x.rank : "–"}</td>
                <td>{x.agent.name}</td>
                <td className="muted">{teamName(x.agent.team_id)}</td>
                {!overall && <><td>{x.pts.absence}</td><td>{x.pts.late}</td><td>{x.pts.adherence}</td></>}
                <td style={{ background: overall ? undefined : ptsColour(x.total), fontWeight: 700 }}>{x.total}</td>
                {overall && <td className="muted" style={{ fontSize: 12 }}>{x.sub}</td>}
              </tr>
            ))}
            {!ranked.length && !rest.length && <tr><td colSpan={8} className="muted">Nothing to show yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {isAdmin && rest.length > 0 && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>"–" means not eligible to win (QA below target or a final written warning). Agents can't see who these are.</p>}
    </div>
  );
}

/* ---------------- Teams ---------------- */
function Teams({ db, R, isAdmin }) {
  const [month, setMonth] = useState(defaultDriveMonth);
  const st = useMemo(() => teamStandings(month, db.driveScores, db.agents, db.teams, R), [month, db.driveScores, db.agents, db.teams, R]);
  const overall = useMemo(() => overallTeamStandings(db.driveScores, db.agents, db.teams, R), [db.driveScores, db.agents, db.teams, R]);
  const noTeam = db.agents.filter((a) => !a.team_id || !db.teams.some((t) => t.id === a.team_id));
  const rows = [...st.list].sort((a, b) => (a.rank || 99) - (b.rank || 99) || (b.avg ?? -1) - (a.avg ?? -1));

  return (
    <>
      <div className="card">
        <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>👥 Winning team</div>
          <MonthPills month={month} setMonth={setMonth} />
        </div>
        <p className="muted mt" style={{ fontSize: 13 }}>
          Worked out automatically once scores are saved: the team with the <strong>highest average points</strong> wins the team lunch.
          A team needs at least {R.teamMinScored} agents scored that month to count. Nothing to fill in here.
        </p>
        {st.winner ? (
          <div className="mt" style={{ padding: 14, borderRadius: 10, background: GOLD, fontWeight: 700 }}>
            🏆 {monthLabel(month)} winner: {st.winner.team.name} with {st.winner.avg.toFixed(1)} average points ({st.winner.scored} agents scored)
          </div>
        ) : (
          <Empty>No winner yet for {monthLabel(month)}.</Empty>
        )}
        <div style={{ overflowX: "auto" }} className="mt">
          <table className="tbl">
            <thead><tr><th>Rank</th><th>Team</th><th>Agents in team</th><th>Agents scored</th><th>Average points</th></tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.team.id} style={{ background: x.rank === 1 ? GOLD : undefined }}>
                  <td>{x.rank || "–"}</td>
                  <td><strong>{x.team.name}</strong></td>
                  <td>{x.members}</td>
                  <td>{x.scored}{!x.qualifies && x.members > 0 ? <span className="muted" style={{ fontSize: 12 }}> (needs {R.teamMinScored})</span> : null}</td>
                  <td style={{ background: ptsColour(x.avg) }}>{x.avg === null ? "" : x.avg.toFixed(1)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="muted">No teams yet. Add them in Admin → Teams or with Import members.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Whole drive</div>
        <table className="tbl">
          <thead><tr><th>Team</th><th>Months won</th><th>Average across months</th></tr></thead>
          <tbody>
            {overall.map((x) => (
              <tr key={x.team.id}><td><strong>{x.team.name}</strong></td><td>{x.wins ? "🏆".repeat(x.wins) : "0"}</td><td>{x.avg === null ? "" : x.avg.toFixed(1)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && noTeam.length > 0 && (
        <div className="card" style={{ borderColor: "#f1c40f" }}>
          <strong>⚠️ {noTeam.length} agent{noTeam.length > 1 ? "s have" : " has"} no team</strong> and won't count for the winning team:
          <span className="muted"> {noTeam.slice(0, 12).map((a) => a.name).join(", ")}{noTeam.length > 12 ? "…" : ""}</span>.
          Set their team in Admin → Members.
        </div>
      )}
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
      `${R.absence.full} pts: ${R.absence.fullMax} days off`, `${R.absence.half} pts: up to ${R.absence.halfMax} day${R.absence.halfMax === 1 ? "" : "s"} off`, `0 pts: ${R.absence.halfMax + 1}+ days off`],
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
    return <input className="input" style={{ width: 80 }} type="number" value={v === "" ? "" : isPct ? Math.round(v * 1000) / 10 : v} onChange={(e) => setN(path, e.target.value, isPct)} />;
  };
  const save = async () => {
    if (total !== 100 && !confirm(`Full points add up to ${total}, not 100. Save anyway?`)) return;
    if (!confirm("Changing the rules recalculates every month's points and winners. Continue?")) return;
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
                  <td style={{ background: GREEN }}>{r[2]}</td><td style={{ background: AMBER }}>{r[3]}</td><td style={{ background: RED }}>{r[4]}</td>
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
          <div className="card-title">Teams and centre targets</div>
          <p>🍽️ Monthly winning team: highest average points (at least {R.teamMinScored} agents scored).</p>
          <p>🎉 Team event for everyone if the centre hits ASA of {R.asaMax} sec or less and an answer rate of {pct(R.answerMin)} or more, in at least {R.centreMonthsNeeded} of the 4 months.</p>
        </div>
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
              </div>
              <div className="form-row mt">
                <div><label className="lbl">Centre months needed (of 4)</label>{num("centreMonthsNeeded")}</div>
                <div><label className="lbl">Grand prize months needed (of 4)</label>{num("grandMonthsNeeded")}</div>
                <div><label className="lbl">Min agents scored for a team</label>{num("teamMinScored")}</div>
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

/* ---------------- Budget (admins see, super admin edits) ---------------- */
function Budget({ db, R, canEdit }) {
  const [items, setItems] = useState(R.budget.items);
  const [cont, setCont] = useState(R.budget.contingency);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setItems(R.budget.items); setCont(R.budget.contingency); setDirty(false); }, [R]);
  const agentCount = db.agents.length;
  const T = budgetTotals({ items, contingency: cont }, agentCount);

  const upd = (id, k, v) => { setItems((xs) => xs.map((x) => (x.id === id ? { ...x, [k]: v } : x))); setDirty(true); };
  const add = () => { setItems((xs) => [...xs, { id: `b${Date.now()}`, name: "New item", qty: 1, cost: 0, times: 1, spent: 0 }]); setDirty(true); };
  const del = (id) => { if (confirm("Remove this line?")) { setItems((xs) => xs.filter((x) => x.id !== id)); setDirty(true); } };
  const save = async () => {
    const clean = items.map((x) => ({ ...x, qty: Number(x.qty) || 0, cost: Number(x.cost) || 0, times: Number(x.times) || 0, spent: Number(x.spent) || 0 }));
    if (await db.saveDriveRules({ ...R, budget: { contingency: Number(cont) || 0, items: clean } })) setDirty(false);
  };
  const exportCsv = () => downloadText("service-drive-budget.csv",
    "Item,Qty,Cost each,Times,Planned,Spent\n" + T.items.map((x) => `"${x.name}",${x.qtyUsed},${x.cost},${x.times},${x.planned},${x.spent}`).join("\n") +
    `\nContingency,,,,${T.contingency},\nTotal,,,,${T.total},${T.spent}\n`);
  const box = (w) => ({ width: w, padding: "4px 6px" });

  return (
    <div className="card">
      <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>💰 Drive budget</div>
        <button className="btn btn-sm btn-ghost" onClick={exportCsv}>⬇️ Export CSV</button>
      </div>
      <div className="grid grid-4 mt">
        <Stat label="Planned total" value={rand(T.total)} />
        <Stat label="Spent so far" value={rand(T.spent)} />
        <Stat label="Remaining" value={rand(T.remaining)} bg={T.remaining < 0 ? RED : undefined} />
        <Stat label={`Per agent per month (${agentCount} agents)`} value={rand(T.perAgentMonth)} />
      </div>
      <div style={{ overflowX: "auto" }} className="mt">
        <table className="tbl">
          <thead><tr><th>Item</th><th>Qty</th><th>Cost each</th><th>Times</th><th>Planned</th><th>Spent so far</th>{canEdit && <th />}</tr></thead>
          <tbody>
            {T.items.map((x) => (
              <tr key={x.id}>
                <td>{canEdit ? <input className="input" style={box(260)} value={x.name} onChange={(e) => upd(x.id, "name", e.target.value)} /> : x.name}</td>
                <td>{x.perAgent ? <span title="Number of agents in the app">{agentCount} (all)</span> : canEdit ? <input className="input" style={box(60)} type="number" min="0" value={x.qty} onChange={(e) => upd(x.id, "qty", e.target.value)} /> : x.qtyUsed}</td>
                <td>{canEdit ? <input className="input" style={box(90)} type="number" min="0" value={x.cost} onChange={(e) => upd(x.id, "cost", e.target.value)} /> : rand(x.cost)}</td>
                <td>{canEdit ? <input className="input" style={box(60)} type="number" min="0" value={x.times} onChange={(e) => upd(x.id, "times", e.target.value)} /> : x.times}</td>
                <td><strong>{rand(x.planned)}</strong></td>
                <td>{canEdit ? <input className="input" style={box(90)} type="number" min="0" value={x.spent} onChange={(e) => upd(x.id, "spent", e.target.value)} /> : rand(x.spent)}</td>
                {canEdit && <td><button className="btn btn-sm btn-ghost" onClick={() => del(x.id)}>✕</button></td>}
              </tr>
            ))}
            <tr><td>Contingency {canEdit ? <input className="input" style={{ ...box(60), marginLeft: 6 }} type="number" min="0" value={Math.round(Number(cont) * 100)} onChange={(e) => { setCont(Number(e.target.value) / 100); setDirty(true); }} /> : `${Math.round(cont * 100)}`}%</td><td /><td /><td /><td>{rand(T.contingency)}</td><td />{canEdit && <td />}</tr>
            <tr style={{ background: GOLD }}><td><strong>Total</strong></td><td /><td /><td /><td><strong>{rand(T.total)}</strong></td><td><strong>{rand(T.spent)}</strong></td>{canEdit && <td />}</tr>
          </tbody>
        </table>
      </div>
      {canEdit ? (
        <div className="flex mt" style={{ gap: 8, alignItems: "center" }}>
          <button className="btn btn-sm btn-ghost" onClick={add}>+ Add line</button>
          <button className="btn btn-sm" onClick={save} disabled={!dirty}>Save budget</button>
          {dirty && <span style={{ color: "var(--accent)", fontSize: 13 }}>Unsaved changes</span>}
        </div>
      ) : (
        <p className="muted mt" style={{ fontSize: 12 }}>Only the Super Admin can change the budget.</p>
      )}
    </div>
  );
}

/* ---------------- Enter scores (admins) ---------------- */
const SCORE_FIELDS = {
  adherence: ["adherence", "adh"],
  qa: ["qa", "quality"],
  times_late: ["late"],
  days_off: ["daysoff", "absen", "absent", "sick", "off"],
  final_warning: ["warning", "fww", "final"],
  name: ["name"],
  emp: ["employee", "empid", "staff", "number", "id"],
  agentcol: ["agent", "person"]
};

function EnterScores({ db, R, readOnly, myTeamId }) {
  const [month, setMonthRaw] = useState(defaultDriveMonth);
  const [team, setTeam] = useState(myTeamId || "all");
  const [draft, setDraft] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paste, setPaste] = useState(null);
  const [pasteMsg, setPasteMsg] = useState("");

  const setMonth = (m) => {
    if (dirty && !confirm("You have unsaved scores for this month. Leave without saving?")) return;
    setMonthRaw(m);
  };

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

  const scope = useMemo(() => db.agents.filter((a) => !myTeamId || a.team_id === myTeamId), [db.agents, myTeamId]);
  const agents = useMemo(
    () => [...scope].filter((a) => team === "all" || a.team_id === team).sort((a, b) => a.name.localeCompare(b.name)),
    [scope, team]
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
    const ids = new Set(scope.map((a) => a.id));
    const rows = Object.entries(draft)
      .filter(([id]) => ids.has(id))
      .filter(([, d]) => d.days_off !== "" || d.times_late !== "" || d.adherence !== "" || d.qa !== "" || d.final_warning)
      .map(([id, d]) => {
        const existing = db.driveScores.find((x) => x.month === month && x.agent_id === id);
        return { id: existing ? existing.id : `ds-${month}-${id}`, ...toRow(id, d) };
      });
    const name = (id) => db.agents.find((a) => a.id === id)?.name || id;
    const bad = rows.find((r) =>
      [r.days_off, r.times_late].some((v) => has(v) && (Number.isNaN(v) || v < 0 || !Number.isInteger(v))) ||
      [r.adherence, r.qa].some((v) => has(v) && (Number.isNaN(v) || v < 0 || v > 1)));
    if (bad) return alert(`Check ${name(bad.agent_id)}: days off and times late must be whole numbers, adherence and QA between 0 and 100.`);
    setSaving(true);
    const ok = rows.length ? await db.saveDriveScores(rows) : true;
    setSaving(false);
    if (ok) setDirty(false);
  };

  const applyPaste = (text) => {
    const rows = parseTable(text);
    if (!rows.length) return setPasteMsg("Nothing to read.");
    let map = mapHeader(rows[0], SCORE_FIELDS);
    if (map && map.name === undefined && map.agentcol !== undefined) map.name = map.agentcol;
    let body = rows;
    if (map && (map.name !== undefined || map.emp !== undefined)) body = rows.slice(1);
    else map = { name: 0, days_off: 1, times_late: 2, adherence: 3, qa: 4, final_warning: 5 };
    const byName = new Map(scope.map((a) => [normName(a.name), a]));
    const byEmp = new Map(scope.filter((a) => a.emp_id).map((a) => [normName(a.emp_id), a]));
    const unmatched = [];
    let matched = 0;
    const next = { ...draft };
    body.forEach((r) => {
      const cell = (k) => (map[k] !== undefined ? r[map[k]] : undefined);
      const a = (cell("emp") && byEmp.get(normName(cell("emp")))) || byName.get(normName(cell("name")));
      if (!a) { const n = cell("name") || cell("emp"); if (n) unmatched.push(n); return; }
      const cur = { ...next[a.id] };
      const dOff = toCount(cell("days_off")), late = toCount(cell("times_late"));
      const adh = toFraction(cell("adherence")), qa = toFraction(cell("qa"));
      if (dOff !== null && !Number.isNaN(dOff)) cur.days_off = String(dOff);
      if (late !== null && !Number.isNaN(late)) cur.times_late = String(late);
      if (adh !== null && !Number.isNaN(adh)) cur.adherence = String(Math.round(adh * 1000) / 10);
      if (qa !== null && !Number.isNaN(qa)) cur.qa = String(Math.round(qa * 1000) / 10);
      if (map.final_warning !== undefined) cur.final_warning = toYes(cell("final_warning"));
      next[a.id] = cur;
      matched++;
    });
    setDraft(next);
    setDirty(matched > 0 || dirty);
    setPasteMsg(`Filled ${matched} agent${matched === 1 ? "" : "s"}. ${unmatched.length ? `Not found: ${unmatched.slice(0, 10).join(", ")}${unmatched.length > 10 ? "…" : ""}. ` : ""}Check the table, then click Save month.`);
    if (matched) setPaste(null);
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) return alert("Excel files can't be read directly. Copy the cells and paste them, or save as CSV and upload that.");
    try { applyPaste(await readFileText(f)); } catch (err) { alert(err.message); }
  };

  const template = () => downloadText(`drive-scores-${month}.csv`,
    "Name,Days off,Times late,Adherence %,QA %,Final warning\n" + agents.map((a) => `"${a.name}",,,,,No`).join("\n") + "\n");

  const box = { width: 64, padding: "4px 6px" };
  const done = agents.filter((a) => metricPoints(toRow(a.id, draft[a.id] || {}), R)).length;
  const myTeam = db.teams.find((t) => t.id === myTeamId);

  return (
    <div className="card">
      <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>✏️ Enter month-end scores</div>
        <MonthPills month={month} setMonth={setMonth} />
      </div>
      <div className="flex mt" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {myTeamId ? (
          <span className="pill">{myTeam ? myTeam.name : "My team"} only</span>
        ) : (
          <select className="input" style={{ width: 180 }} value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="all">All teams</option>
            {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {!readOnly && <button className="btn btn-sm btn-ghost" onClick={() => setPaste(paste === null ? "" : null)}>📋 Paste from Excel</button>}
        {!readOnly && (
          <label className="btn btn-sm btn-ghost" style={{ cursor: "pointer" }}>
            📄 Upload CSV<input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" onChange={onFile} style={{ display: "none" }} />
          </label>
        )}
        <button className="btn btn-sm btn-ghost" onClick={template}>⬇️ Template for {monthLabel(month)}</button>
        <span className="muted" style={{ fontSize: 13 }}>{done} of {agents.length} scored</span>
      </div>

      {paste !== null && (
        <div className="mt">
          <textarea className="input" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} style={{ fontFamily: "monospace", fontSize: 12 }}
            placeholder={"Copy from Excel with a header row, e.g.\nName\tDays off\tTimes late\tAdherence %\tQA %\tFinal warning\nThabo Mokoena\t0\t1\t96%\t88%\tNo"} />
          <div className="flex mt" style={{ gap: 8 }}>
            <button className="btn btn-sm" onClick={() => applyPaste(paste)}>Fill the table</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setPaste(null)}>Cancel</button>
          </div>
        </div>
      )}
      {pasteMsg && <p className="mt" style={{ fontSize: 13 }}>{pasteMsg}</p>}

      <p className="muted mt" style={{ fontSize: 12 }}>Adherence and QA as whole numbers (95 = 95%). Points and "Can win?" update as you type. Nothing is saved until you click Save month.</p>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead><tr><th>Agent</th><th>Days off</th><th>Times late</th><th>Adherence %</th><th>QA %</th><th>Final warning</th><th>Points</th><th>Can win?</th></tr></thead>
          <tbody>
            {agents.map((a) => {
              const d = draft[a.id] || {};
              const row = toRow(a.id, d);
              const p = metricPoints(row, R);
              const w = canWin(row, R);
              return (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td><input className="input" style={box} type="number" min="0" step="1" value={d.days_off ?? ""} disabled={readOnly} onChange={(e) => set(a.id, "days_off", e.target.value)} /></td>
                  <td><input className="input" style={box} type="number" min="0" step="1" value={d.times_late ?? ""} disabled={readOnly} onChange={(e) => set(a.id, "times_late", e.target.value)} /></td>
                  <td><input className="input" style={box} type="number" min="0" max="100" value={d.adherence ?? ""} disabled={readOnly} onChange={(e) => set(a.id, "adherence", e.target.value)} /></td>
                  <td><input className="input" style={box} type="number" min="0" max="100" value={d.qa ?? ""} disabled={readOnly} onChange={(e) => set(a.id, "qa", e.target.value)} /></td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" checked={!!d.final_warning} disabled={readOnly} onChange={(e) => set(a.id, "final_warning", e.target.checked)} /></td>
                  <td style={{ background: ptsColour(p ? p.total : null), fontWeight: 700 }}>{p ? p.total : ""}</td>
                  <td style={{ background: w === true ? GREEN : w === false ? RED : undefined, fontWeight: 700 }}>{w === true ? "Yes" : w === false ? "No" : ""}</td>
                </tr>
              );
            })}
            {!agents.length && <tr><td colSpan={8} className="muted">No agents yet. Add them in Admin → Import members.</td></tr>}
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
