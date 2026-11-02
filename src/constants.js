// ============================================================
// Business constants - recovered 1:1 from the original PointPlay
// v2 build so all live data keeps working identically.
// ============================================================

export const THEMES = {
  navy_gold: { name: "Navy & Gold", navy: "#0B1220", navy2: "#111C30", navy3: "#182540", panel: "#1A2944", border: "rgba(255,255,255,0.07)", accent: "#F5C842", accent2: "#E0A800", swatch: "#F5C842", isDark: true },
  dark_teal: { name: "Dark & Teal", navy: "#0A1628", navy2: "#0F1E35", navy3: "#152340", panel: "#1A2D4A", border: "rgba(255,255,255,0.07)", accent: "#00C9A7", accent2: "#00A88C", swatch: "#00C9A7", isDark: true },
  cyber_neon: { name: "Cyberpunk Neon", navy: "#080711", navy2: "#0F0E24", navy3: "#19173D", panel: "#1F1C4E", border: "rgba(255, 0, 127, 0.2)", accent: "#FF007F", accent2: "#00FFFF", swatch: "#FF007F", isDark: true },
  duo_playful: { name: "Duolingo Playful", navy: "#F0F4F8", navy2: "#FFFFFF", navy3: "#E1E8F0", panel: "#FFFFFF", border: "rgba(0,0,0,0.12)", accent: "#58CC02", accent2: "#ff9600", swatch: "#58CC02", isDark: false },
  retro_arcade: { name: "Retro 80s Arcade", navy: "#02010A", navy2: "#0E052B", navy3: "#1B0B4E", panel: "#240E69", border: "rgba(241, 12, 233, 0.3)", accent: "#F10CE9", accent2: "#39FF14", swatch: "#F10CE9", isDark: true },
  nordic_frost: { name: "Nordic Frost", navy: "#1E2530", navy2: "#283141", navy3: "#323E52", panel: "#3B4A62", border: "rgba(255,255,255,0.06)", accent: "#8BE9FD", accent2: "#50FA7B", swatch: "#8BE9FD", isDark: true },
  charcoal: { name: "Charcoal & Red", navy: "#141414", navy2: "#1C1C1C", navy3: "#242424", panel: "#2A2A2A", border: "rgba(255,255,255,0.08)", accent: "#FF5C5C", accent2: "#E04444", swatch: "#FF5C5C", isDark: true },
  midnight: { name: "Midnight Purple", navy: "#0D0B1E", navy2: "#131028", navy3: "#1A1535", panel: "#1E1A40", border: "rgba(255,255,255,0.07)", accent: "#9B59B6", accent2: "#7D3C98", swatch: "#9B59B6", isDark: true },
  forest: { name: "Forest Green", navy: "#0A1A0F", navy2: "#0E2215", navy3: "#12291A", panel: "#173321", border: "rgba(255,255,255,0.07)", accent: "#2ECC71", accent2: "#27AE60", swatch: "#2ECC71", isDark: true },
  light: { name: "Light Mode", navy: "#F5F7FA", navy2: "#FFFFFF", navy3: "#E8EBF0", panel: "#FFFFFF", border: "rgba(0,0,0,0.08)", accent: "#7C3AED", accent2: "#6D28D9", swatch: "#7C3AED", isDark: false }
};

export const AGENT_COLORS = [
  "#E74C8B", "#3498DB", "#2ECC71", "#E67E22", "#9B59B6",
  "#1ABC9C", "#E74C3C", "#F39C12", "#34495E", "#27AE60",
  "#5DADE2", "#A569BD", "#52BE80", "#F4D03F", "#EB984E"
];

// Fallback metric definitions. The live `metrics` table takes priority;
// these seed a fresh database.
export const DEFAULT_METRICS = [
  { id: "adherence", label: "Schedule Adherence \u226595%", pts: 50, icon: "\ud83d\udcc5", description: "Weekly adherence target" },
  { id: "fcr", label: "First Call Resolution", pts: 40, icon: "\u2705", description: "Resolved on first call" },
  { id: "aht", label: "AHT Within Target Band", pts: 30, icon: "\u23f1\ufe0f", description: "Within \u00b130s of team avg" },
  { id: "coaching", label: "Coaching Session Completed", pts: 20, icon: "\ud83c\udf93", description: "Per session completed" },
  { id: "peer", label: "Peer Nomination Badge", pts: 25, icon: "\u2b50", description: "Max 1/week per agent" },
  { id: "team_sl", label: "Team Service Level Met", pts: 20, icon: "\ud83c\udfc6", description: "Collective reward" }
];

export const MAX_WEEK_PTS = 185; // sum of all metric maxima

export const STREAK_TIERS = [
  { weeks: 3, bonus: 50, label: "3-Week Streak" },
  { weeks: 5, bonus: 100, label: "5-Week Streak" },
  { weeks: 8, bonus: 200, label: "8-Week Legend" }
];

export const DEFAULT_PRIZES = [
  { id: "r1", name: "R50 Checkers Voucher", cost: 200, icon: "\ud83d\uded2", active: true, stock_limit: 5, cost_rand: 50 },
  { id: "r2", name: "R100 Woolworths Voucher", cost: 380, icon: "\ud83c\udf81", active: true, stock_limit: 3, cost_rand: 100 },
  { id: "r3", name: "Half-Day Friday", cost: 500, icon: "\ud83c\udf1f", active: true, stock_limit: null, cost_rand: 0 },
  { id: "r4", name: "Choice of Shift Slot", cost: 300, icon: "\ud83d\udccb", active: true, stock_limit: null, cost_rand: 0 },
  { id: "r5", name: "Team Lunch Nomination", cost: 450, icon: "\ud83c\udf7d\ufe0f", active: true, stock_limit: 2, cost_rand: 500 },
  { id: "r6", name: "Airtime R50", cost: 180, icon: "\ud83d\udcf1", active: true, stock_limit: 8, cost_rand: 50 }
];

export const MONTHLY_BUDGET = 5000; // ZAR base allocation per month

// Achievement definitions. `check(agent, ctx)` where ctx exposes:
// weeklyEntries, agents, redemptions, agentStreak(id), agentTotalPts(id),
// agentAvailPts(id), getWeekLabel(offset)
export const BADGES = [
  {
    id: "first_100", name: "First Century", icon: "\ud83e\udd49",
    desc: "Earn 100+ points in a single week",
    check: (a, ctx) => weekTotals(a.id, ctx).some((t) => t >= 100)
  },
  {
    id: "streak_3", name: "On Fire", icon: "\ud83d\udd25",
    desc: "Maintain a 3-week streak",
    check: (a, ctx) => ctx.agentStreak(a.id) >= 3
  },
  {
    id: "streak_8", name: "Unstoppable", icon: "\u26a1",
    desc: "Achieve an 8-week streak",
    check: (a, ctx) => ctx.agentStreak(a.id) >= 8
  },
  {
    id: "total_1000", name: "Thousand Club", icon: "\ud83d\udc8e",
    desc: "Earn 1,000 total points",
    check: (a, ctx) => ctx.agentTotalPts(a.id) >= 1000
  },
  {
    id: "total_2500", name: "Elite Performer", icon: "\ud83d\udc51",
    desc: "Earn 2,500 total points",
    check: (a, ctx) => ctx.agentTotalPts(a.id) >= 2500
  },
  {
    id: "podium", name: "Podium Finish", icon: "\ud83c\udfc5",
    desc: "Finish in the top 3",
    check: (a, ctx) =>
      teamRanked(a, ctx).findIndex((x) => x.id === a.id) < 3
  },
  {
    id: "champion", name: "Weekly Champion", icon: "\ud83c\udfc6",
    desc: "Finish #1 in a week",
    check: (a, ctx) => teamRanked(a, ctx)[0]?.id === a.id
  },
  {
    id: "perfect_week", name: "Perfect Week", icon: "\u2728",
    desc: `Score max points in a week (${MAX_WEEK_PTS}pts)`,
    check: (a, ctx) => weekTotals(a.id, ctx).some((t) => t >= MAX_WEEK_PTS)
  },
  {
    id: "consistency", name: "Consistency King", icon: "\ud83d\udcc8",
    desc: "Score 80+ points for 4 consecutive weeks",
    check: (a, ctx) => {
      let run = 0;
      for (let i = 0; i < 52; i++) {
        const wk = ctx.getWeekLabel(i);
        const total = ctx.weeklyEntries
          .filter((e) => e.agent_id === a.id && e.week_label === wk)
          .reduce((s, e) => s + (Number(e.points) || 0), 0);
        if (total >= 80) run++;
        else break;
      }
      return run >= 4;
    }
  },
  {
    id: "big_spender", name: "Big Spender", icon: "\ud83d\udcb8",
    desc: "Redeem 1,000+ points in prizes",
    check: (a, ctx) =>
      ctx.redemptions
        .filter((r) => r.agent_id === a.id)
        .reduce((s, r) => s + (Number(r.cost) || 0), 0) >= 1000
  }
];

// helpers used by the checks above
function weekTotals(agentId, ctx) {
  const byWeek = {};
  ctx.weeklyEntries
    .filter((e) => e.agent_id === agentId)
    .forEach((e) => {
      byWeek[e.week_label] = (byWeek[e.week_label] || 0) + (Number(e.points) || 0);
    });
  return Object.values(byWeek);
}

function teamRanked(agent, ctx) {
  return [...ctx.agents.filter((x) => x.team_id === agent.team_id)].sort(
    (x, y) => ctx.agentAvailPts(y.id) - ctx.agentAvailPts(x.id)
  );
}
