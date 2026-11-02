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
  teamMinScored: 3,          // a team needs at least this many agents scored to win the month
  budget: {
    contingency: 0.1,
    items: [
      { id: "m1", name: "Monthly 1st place voucher", qty: 1, cost: 2000, times: 4, spent: 0 },
      { id: "m2", name: "Monthly 2nd place voucher", qty: 1, cost: 1000, times: 4, spent: 0 },
      { id: "m3", name: "Monthly 3rd place voucher", qty: 1, cost: 500, times: 4, spent: 0 },
      { id: "tl", name: "Monthly winning team lunch (per person)", qty: 10, cost: 250, times: 4, spent: 0 },
      { id: "sp", name: "Weekly spot prize vouchers", qty: 2, cost: 250, times: 17, spent: 0 },
      { id: "g1", name: "Grand prize 1st: weekend away for two", qty: 1, cost: 12000, times: 1, spent: 0 },
      { id: "g2", name: "Grand prize 2nd: smartphone", qty: 1, cost: 8000, times: 1, spent: 0 },
      { id: "g3", name: "Grand prize 3rd: voucher", qty: 1, cost: 5000, times: 1, spent: 0 },
      { id: "mi", name: "Most improved: voucher", qty: 1, cost: 3000, times: 1, spent: 0 },
      { id: "te", name: "Team event if centre targets hit (per person)", perAgent: true, qty: 0, cost: 300, times: 1, spent: 0 },
      { id: "la", name: "Launch and leaderboard", qty: 1, cost: 2500, times: 1, spent: 0 }
    ]
  },
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
    prizes: { ...d.prizes, ...(s.prizes || {}) },
    budget: s.budget && Array.isArray(s.budget.items) ? { ...d.budget, ...s.budget } : d.budget
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

// Team standings for one month: average points of the team's scored agents.
// A team needs at least R.teamMinScored agents scored to be in the running.
export function teamStandings(month, scores, agents, teams, R) {
  const { rows } = monthResults(month, scores, agents, R);
  const list = teams.map((team) => {
    const members = agents.filter((a) => a.team_id === team.id);
    const mine = rows.filter((r) => r.agent.team_id === team.id);
    const avg = mine.length ? mine.reduce((s, r) => s + r.total, 0) / mine.length : null;
    return { team, members: members.length, scored: mine.length, avg, qualifies: mine.length >= R.teamMinScored && mine.length > 0 };
  });
  const ranked = list
    .filter((x) => x.qualifies)
    .sort((a, b) => b.avg - a.avg || b.scored - a.scored || a.team.name.localeCompare(b.team.name));
  ranked.forEach((x, i) => (x.rank = i + 1));
  return { list, ranked, winner: ranked[0] || null };
}

export function winningTeam(month, scores, agents, teams, R) {
  return teamStandings(month, scores, agents, teams, R).winner;
}

// Whole-drive team standings: months won, then average across scored months.
export function overallTeamStandings(scores, agents, teams, R) {
  const per = DRIVE_MONTHS.map((m) => teamStandings(m.key, scores, agents, teams, R));
  const list = teams.map((team) => {
    const months = per.map((p) => p.list.find((x) => x.team.id === team.id)).filter((x) => x && x.avg !== null);
    const wins = per.filter((p) => p.winner && p.winner.team.id === team.id).length;
    const avg = months.length ? months.reduce((s, x) => s + x.avg, 0) / months.length : null;
    return { team, wins, avg, monthsScored: months.length };
  });
  return list.sort((a, b) => b.wins - a.wins || (b.avg ?? -1) - (a.avg ?? -1) || a.team.name.localeCompare(b.team.name));
}

export function budgetTotals(budget, agentCount) {
  const items = budget.items.map((it) => {
    const qty = it.perAgent ? agentCount : Number(it.qty) || 0;
    const planned = qty * (Number(it.cost) || 0) * (Number(it.times) || 0);
    return { ...it, qtyUsed: qty, planned, spent: Number(it.spent) || 0 };
  });
  const subtotal = items.reduce((s, x) => s + x.planned, 0);
  const contingency = subtotal * (Number(budget.contingency) || 0);
  const total = subtotal + contingency;
  const spent = items.reduce((s, x) => s + x.spent, 0);
  return { items, subtotal, contingency, total, spent, remaining: total - spent, perAgentMonth: agentCount ? total / agentCount / DRIVE_MONTHS.length : 0 };
}

export const rand = (n) => "R" + Math.round(Number(n) || 0).toLocaleString("en-ZA").replace(/\u00a0/g, " ");

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
  // Until every month is in, rank everyone who can still reach the months needed.
  const monthsLeft = per.filter((rows) => rows.length === 0).length;
  const final = monthsLeft === 0;
  list.forEach((x) => { x.inRunning = x.byMonth.some(Boolean) && x.qualified + monthsLeft >= R.grandMonthsNeeded; });
  const ranked = list
    .filter((x) => (final ? x.eligible : x.inRunning))
    .sort((a, b) => b.total - a.total || b.qualified - a.qualified || a.agent.name.localeCompare(b.agent.name));
  ranked.forEach((x, i) => (x.rank = i + 1));
  const improved = list
    .filter((x) => x.change !== null && x.change > 0)
    .sort((a, b) => b.change - a.change)[0] || null;
  return { list, ranked, improved, final, monthsLeft };
}
