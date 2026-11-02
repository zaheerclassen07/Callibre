// ============================================================
// Inbound Service Drive (Nov 2026 to Feb 2027)
// Same rules as the Excel workbook. All scoring lives here.
// ============================================================

export const DRIVE_MONTHS = [
  { key: "2026-11", label: "November" },
  { key: "2026-12", label: "December" },
  { key: "2027-01", label: "January" },
  { key: "2027-02", label: "February" }
];

export const DEFAULT_DRIVE_RULES = {
  absence:   { full: 35, fullMax: 0, half: 15, halfMax: 1 },      // days off, up to
  late:      { full: 30, fullMax: 0, half: 15, halfMax: 2 },      // times late, up to
  adherence: { full: 35, fullMin: 0.95, half: 15, halfMin: 0.90 }, // at least
  qaMin: 0.85,
  asaMax: 30,
  answerMin: 0.95,
  centreMonthsNeeded: 3,
  grandMonthsNeeded: 3,
  prizes: {
    monthly: "Top 3: R2,000, R1,000 and R500 vouchers. Winning team: team lunch. Weekly spot prizes: R250 vouchers.",
    grand: "1st: weekend away for two. 2nd: smartphone. 3rd: R5,000 voucher. Most improved: R3,000 voucher.",
    team: "Team event for everyone if the centre hits its targets."
  }
};

export function mergeRules(saved) {
  const d = DEFAULT_DRIVE_RULES;
  const s = saved || {};
  return {
    ...d, ...s,
    absence: { ...d.absence, ...(s.absence || {}) },
    late: { ...d.late, ...(s.late || {}) },
    adherence: { ...d.adherence, ...(s.adherence || {}) },
    prizes: { ...d.prizes, ...(s.prizes || {}) }
  };
}

const has = (v) => v !== null && v !== undefined && v !== "";
export const pct = (v) => (has(v) ? `${Math.round(Number(v) * 100)}%` : "");

export function metricPoints(row, R) {
  if (!row || !has(row.days_off) || !has(row.times_late) || !has(row.adherence)) return null;
  const d = Number(row.days_off), l = Number(row.times_late), a = Number(row.adherence);
  const absence = d <= R.absence.fullMax ? R.absence.full : d <= R.absence.halfMax ? R.absence.half : 0;
  const late = l <= R.late.fullMax ? R.late.full : l <= R.late.halfMax ? R.late.half : 0;
  const adherence = a >= R.adherence.fullMin ? R.adherence.full : a >= R.adherence.halfMin ? R.adherence.half : 0;
  return { absence, late, adherence, total: absence + late + adherence };
}

export function canWin(row, R) {
  if (!row || !has(row.qa)) return null;
  return Number(row.qa) >= R.qaMin && !row.final_warning;
}

// Results for one month: every agent with a complete row, ranked.
export function monthResults(month, scores, agents, R) {
  const rows = agents
    .map((agent) => {
      const row = scores.find((s) => s.month === month && s.agent_id === agent.id);
      const pts = metricPoints(row, R);
      return pts ? { agent, row, pts, total: pts.total, eligible: canWin(row, R) === true } : null;
    })
    .filter(Boolean);
  const ranked = rows
    .filter((r) => r.eligible)
    .sort((a, b) => b.total - a.total || Number(b.row.qa) - Number(a.row.qa) || a.agent.name.localeCompare(b.agent.name));
  ranked.forEach((r, i) => (r.rank = i + 1));
  return { rows, ranked };
}

export function winningTeam(month, scores, agents, teams, R) {
  const { rows } = monthResults(month, scores, agents, R);
  let best = null;
  teams.forEach((t) => {
    const mine = rows.filter((r) => r.agent.team_id === t.id);
    if (!mine.length) return;
    const avg = mine.reduce((s, r) => s + r.total, 0) / mine.length;
    if (!best || avg > best.avg) best = { team: t, avg };
  });
  return best;
}

export function centreHit(c, R) {
  if (!c || !has(c.asa) || !has(c.answer_rate)) return null;
  return Number(c.asa) <= R.asaMax && Number(c.answer_rate) >= R.answerMin;
}

export function grandStandings(scores, agents, R) {
  const per = DRIVE_MONTHS.map((m) => monthResults(m.key, scores, agents, R).rows);
  const list = agents.map((agent) => {
    let total = 0, qualified = 0;
    const byMonth = per.map((rows) => rows.find((r) => r.agent.id === agent.id) || null);
    byMonth.forEach((r) => { if (r) { total += r.total; if (r.eligible) qualified++; } });
    const first = byMonth[0], last = byMonth[byMonth.length - 1];
    const change = first && last ? last.total - first.total : null;
    return { agent, total, qualified, eligible: qualified >= R.grandMonthsNeeded, change, byMonth };
  });
  const ranked = list
    .filter((x) => x.eligible)
    .sort((a, b) => b.total - a.total || b.qualified - a.qualified || a.agent.name.localeCompare(b.agent.name));
  ranked.forEach((x, i) => (x.rank = i + 1));
  const improved = list
    .filter((x) => x.change !== null && x.change > 0)
    .sort((a, b) => b.change - a.change)[0] || null;
  return { list, ranked, improved };
}
