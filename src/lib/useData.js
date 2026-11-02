import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, isMissingTableError, friendlyError } from "../supabase.js";
import { BADGES, DEFAULT_METRICS, MONTHLY_BUDGET, STREAK_TIERS } from "../constants.js";
import { getWeekLabel, monthKey, todayISO, uid } from "./helpers.js";

// One hook owns all app data and mutations. Components receive it as `db`.
export function useData(user) {
  const [teams, setTeams] = useState([]);
  const [agents, setAgents] = useState([]);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [quests, setQuests] = useState([]);
  const [kudos, setKudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customBadges, setCustomBadges] = useState([]);
  const [assignedBadges, setAssignedBadges] = useState([]);
  const [missingTables, setMissingTables] = useState([]);
  const [driveRules, setDriveRules] = useState(null);
  const [driveScores, setDriveScores] = useState([]);
  const [driveCentre, setDriveCentre] = useState([]);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [t, a, m, w, p, r, rq, u, an, b, q, k, cb, ab, dr, ds, dc] = await Promise.all([
        supabase.from("teams").select("*"),
        supabase.from("agents").select("*"),
        supabase.from("metrics").select("*"),
        supabase.from("weekly_entries").select("*"),
        supabase.from("prizes").select("*"),
        supabase.from("redemptions").select("*"),
        supabase.from("redeem_requests").select("*"),
        supabase.from("pp_users").select("*"),
        supabase.from("announcements").select("*"),
        supabase.from("budget_history").select("*"),
        supabase.from("quests").select("*"),
        supabase.from("kudos").select("*"),
        supabase.from("custom_badges").select("*"),
        supabase.from("assigned_badges").select("*"),
        supabase.from("drive_rules").select("*"),
        supabase.from("drive_scores").select("*"),
        supabase.from("drive_centre").select("*")
      ]);

      // A missing table only disables that feature; any other error stops the load.
      const results = { t, a, m, w, p, r, rq, u, an, b, q, k, cb, ab, dr, ds, dc };
      const names = { t: "teams", a: "agents", m: "metrics", w: "weekly_entries", p: "prizes", r: "redemptions", rq: "redeem_requests", u: "pp_users", an: "announcements", b: "budget_history", q: "quests", k: "kudos", cb: "custom_badges", ab: "assigned_badges", dr: "drive_rules", ds: "drive_scores", dc: "drive_centre" };
      const missing = [];
      for (const key of Object.keys(results)) {
        const res = results[key];
        if (res && res.error) {
          if (isMissingTableError(res.error)) { missing.push(names[key]); res.data = []; res.error = null; }
          else throw res.error;
        }
      }
      setMissingTables(missing);

      setTeams(t.data || []);
      setAgents(a.data || []);
      setMetrics((m.data || []).length ? m.data : DEFAULT_METRICS);
      setWeeklyEntries(w.data || []);
      setPrizes(p.data || []);
      setRedemptions(r.data || []);
      setRequests(rq.data || []);
      setUsers(u.data || []);
      setAnnouncements(an.data || []);
      setBudgetHistory(b.data || []);
      setQuests(q.data || []);
      setKudos(k.data || []);
      setCustomBadges(cb.data || []);
      setAssignedBadges(ab.data || []);
      const main = (dr.data || []).find((x) => x.id === "main");
      setDriveRules(main ? main.rules : null);
      setDriveScores(ds.data || []);
      setDriveCentre(dc.data || []);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  // Reload automatically when the connection comes back.
  useEffect(() => {
    if (!user) return;
    const onOnline = () => loadAll();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [user, loadAll]);

  // ---------- derived helpers ----------

  const agentEarnedPts = useCallback(
    (agentId) =>
      weeklyEntries
        .filter((e) => e.agent_id === agentId)
        .reduce((s, e) => s + (Number(e.points) || 0), 0),
    [weeklyEntries]
  );

  // Consecutive weeks (from the current week backwards) with any points
  const agentStreak = useCallback(
    (agentId) => {
      let run = 0;
      for (let i = 0; i < 52; i++) {
        const wk = getWeekLabel(i);
        const has = weeklyEntries.some(
          (e) => e.agent_id === agentId && e.week_label === wk && Number(e.points) > 0
        );
        if (has) run++;
        else break;
      }
      return run;
    },
    [weeklyEntries]
  );

  const streakBonus = useCallback(
    (agentId) => {
      const streak = agentStreak(agentId);
      return STREAK_TIERS.filter((t) => streak >= t.weeks).reduce((s, t) => s + t.bonus, 0);
    },
    [agentStreak]
  );

  const agentTotalPts = useCallback(
    (agentId) => agentEarnedPts(agentId) + streakBonus(agentId),
    [agentEarnedPts, streakBonus]
  );

  const agentRedeemedPts = useCallback(
    (agentId) =>
      redemptions
        .filter((r) => r.agent_id === agentId)
        .reduce((s, r) => s + (Number(r.cost) || 0), 0),
    [redemptions]
  );

  const agentAvailPts = useCallback(
    (agentId) => agentTotalPts(agentId) - agentRedeemedPts(agentId),
    [agentTotalPts, agentRedeemedPts]
  );

  const badgeCtx = useMemo(
    () => ({ weeklyEntries, agents, redemptions, agentStreak, agentTotalPts, agentAvailPts, getWeekLabel }),
    [weeklyEntries, agents, redemptions, agentStreak, agentTotalPts, agentAvailPts]
  );

  const agentBadges = useCallback(
    (agent) => BADGES.filter((b) => {
      try { return b.check(agent, badgeCtx); } catch { return false; }
    }),
    [badgeCtx]
  );

  const activeAnnouncements = useMemo(() => {
    const now = Date.now();
    return announcements.filter(
      (a) => a.active && (!a.expires_at || new Date(a.expires_at).getTime() > now)
    );
  }, [announcements]);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests]
  );

  const prizeStockUsed = useCallback(
    (prize) => redemptions.filter((r) => r.prize_name === prize.name).length,
    [redemptions]
  );

  const currentBudget = useMemo(() => {
    const key = monthKey();
    const row = budgetHistory.find((b) => b.month === key);
    const spend = row ? Number(row.spend) || 0 : 0;
    const allocated = row ? Number(row.allocated) || MONTHLY_BUDGET : MONTHLY_BUDGET;
    const carryover = row ? Number(row.carryover) || 0 : 0;
    return { month: key, allocated, carryover, spend, remaining: allocated + carryover - spend };
  }, [budgetHistory]);

  // ---------- mutations ----------

  async function run(promise) {
    let e;
    try { ({ error: e } = await promise); } catch (err) { e = err; }
    if (e) { alert("Not saved. " + friendlyError(e)); return false; }
    await loadAll();
    return true;
  }

  const saveEntry = (agent_id, week_label, metric_id, points) => {
    const existing = weeklyEntries.find(
      (e) => e.agent_id === agent_id && e.week_label === week_label && e.metric_id === metric_id
    );
    if (existing && points <= 0) return run(supabase.from("weekly_entries").delete().eq("id", existing.id));
    if (existing) return run(supabase.from("weekly_entries").update({ points }).eq("id", existing.id));
    if (points <= 0) return Promise.resolve(true);
    return run(supabase.from("weekly_entries").insert({ id: uid(), agent_id, week_label, metric_id, points }));
  };

  const deleteWeeklyEntry = (id) => run(supabase.from("weekly_entries").delete().eq("id", id));

  const adjustPoints = (agent_id, points, reason) =>
    run(
      supabase.from("weekly_entries").insert({
        id: uid(),
        agent_id,
        week_label: getWeekLabel(0),
        metric_id: `manual:${(reason || "adjustment").slice(0, 80)}`,
        points
      })
    );

  const addAgent = (agent) => run(supabase.from("agents").insert({ id: uid(), joined_week: getWeekLabel(0), ...agent }));
  const updateAgent = (id, patch) => run(supabase.from("agents").update(patch).eq("id", id));
  const removeAgent = (id) => run(supabase.from("agents").delete().eq("id", id));

  const addTeam = (team) => run(supabase.from("teams").insert({ id: uid(), ...team }));
  const updateTeam = (id, patch) => run(supabase.from("teams").update(patch).eq("id", id));
  const removeTeam = (id) => run(supabase.from("teams").delete().eq("id", id));

  const addPrize = (prize) => run(supabase.from("prizes").insert({ id: uid(), active: true, ...prize }));
  const updatePrize = (id, patch) => run(supabase.from("prizes").update(patch).eq("id", id));
  const removePrize = (id) => run(supabase.from("prizes").delete().eq("id", id));

  const addUser = (row) => run(supabase.from("pp_users").insert({ id: uid(), created_at: new Date().toISOString(), ...row }));
  const updateUser = (id, patch) => run(supabase.from("pp_users").update(patch).eq("id", id));
  const removeUser = (id) => run(supabase.from("pp_users").delete().eq("id", id));

  const requestRedeem = (agent, prize) =>
    run(
      supabase.from("redeem_requests").insert({
        id: uid(),
        agent_id: agent.id,
        prize_id: prize.id,
        prize_name: prize.name,
        cost: prize.cost,
        status: "pending",
        date: todayISO()
      })
    );

  const resolveRequest = async (req, approve) => {
    const { error: e1 } = await supabase
      .from("redeem_requests")
      .update({ status: approve ? "approved" : "denied" })
      .eq("id", req.id);
    if (e1) { alert("Not saved. " + friendlyError(e1)); return; }
    if (approve) {
      const { error: e2 } = await supabase.from("redemptions").insert({
        id: uid(),
        agent_id: req.agent_id,
        prize_name: req.prize_name,
        cost: req.cost,
        week: getWeekLabel(0),
        date: todayISO()
      });
      if (e2) { alert("Not saved. " + friendlyError(e2)); return; }
      // budget spend in ZAR
      const prize = prizes.find((p) => p.id === req.prize_id || p.name === req.prize_name);
      const rand = prize ? Number(prize.cost_rand) || 0 : 0;
      if (rand > 0) await bumpBudgetSpend(rand);
    }
    await loadAll();
  };

  const bumpBudgetSpend = async (rand) => {
    const key = monthKey();
    const row = budgetHistory.find((b) => b.month === key);
    if (row) {
      await supabase.from("budget_history").update({ spend: (Number(row.spend) || 0) + rand }).eq("id", row.id);
    } else {
      // carryover = last month's remaining
      const prev = budgetHistory.find((b) => b.month === monthKey(1));
      const carry = prev
        ? (Number(prev.allocated) || MONTHLY_BUDGET) + (Number(prev.carryover) || 0) - (Number(prev.spend) || 0)
        : 0;
      await supabase.from("budget_history").insert({
        id: uid(),
        month: key,
        allocated: MONTHLY_BUDGET,
        carryover: Math.max(0, carry),
        spend: rand
      });
    }
  };

  const setBudgetRow = async (patch) => {
    const key = monthKey();
    const row = budgetHistory.find((b) => b.month === key);
    if (row) return run(supabase.from("budget_history").update(patch).eq("id", row.id));
    return run(
      supabase.from("budget_history").insert({
        id: uid(),
        month: key,
        allocated: MONTHLY_BUDGET,
        carryover: 0,
        spend: 0,
        ...patch
      })
    );
  };

  const postAnnouncement = (message, created_by, days) =>
    run(
      supabase.from("announcements").insert({
        id: uid(),
        message,
        created_by,
        active: true,
        expires_at: days ? new Date(Date.now() + days * 864e5).toISOString() : null
      })
    );

  const dismissAnnouncement = (id) => run(supabase.from("announcements").update({ active: false }).eq("id", id));

  // --- Collaborative Quests Mutations ---
  const addQuest = (quest) => run(supabase.from("quests").insert({ id: uid(), ...quest }));
  const updateQuest = (id, patch) => run(supabase.from("quests").update(patch).eq("id", id));
  const removeQuest = (id) => run(supabase.from("quests").delete().eq("id", id));

  // --- Kudos Feed Mutations ---
  const addKudos = (kudo) => run(supabase.from("kudos").insert({ id: uid(), created_at: new Date().toISOString(), ...kudo }));
  const removeKudos = (id) => run(supabase.from("kudos").delete().eq("id", id));

  // --- Dynamic Metrics Mutations ---
  const addMetric = (metric) => run(supabase.from("metrics").insert(metric));
  const updateMetric = (id, patch) => run(supabase.from("metrics").update(patch).eq("id", id));
  const removeMetric = (id) => run(supabase.from("metrics").delete().eq("id", id));

  // --- Custom Badges and Assignment ---
  const getAgentCustomBadges = useCallback((agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return [];
    
    const badgeIds = assignedBadges
      .filter(ab => 
        (ab.target_type === "agent" && ab.target_id === agentId) ||
        (ab.target_type === "team" && ab.target_id === agent.team_id)
      )
      .map(ab => ab.badge_id);
      
    return customBadges.filter(cb => badgeIds.includes(cb.id));
  }, [agents, customBadges, assignedBadges]);

  const addCustomBadge = (badge) => run(supabase.from("custom_badges").insert({ id: uid(), ...badge }));
  const updateCustomBadge = (id, patch) => run(supabase.from("custom_badges").update(patch).eq("id", id));
  const removeCustomBadge = async (id) => {
    const { error: e } = await supabase.from("assigned_badges").delete().eq("badge_id", id);
    if (e && !isMissingTableError(e)) { alert("Not saved. " + friendlyError(e)); return false; }
    return run(supabase.from("custom_badges").delete().eq("id", id));
  };
  const assignBadge = (badgeId, targetType, targetId) =>
    run(supabase.from("assigned_badges").insert({ id: uid(), badge_id: badgeId, target_type: targetType, target_id: targetId, assigned_at: new Date().toISOString() }));
  const unassignBadge = (badgeId, targetType, targetId) =>
    run(supabase.from("assigned_badges").delete().eq("badge_id", badgeId).eq("target_type", targetType).eq("target_id", targetId));

  // --- Bulk import (teams, agents, logins) in one go ---
  const bulkImport = async ({ teams: newTeams = [], agents: newAgents = [], users: newUsers = [] }) => {
    const steps = [
      ["teams", newTeams],
      ["agents", newAgents],
      ["pp_users", newUsers]
    ];
    for (const [table, rows] of steps) {
      if (!rows.length) continue;
      const { error: e } = await supabase.from(table).insert(rows);
      if (e) {
        alert(`Import stopped while adding ${table === "pp_users" ? "logins" : table}. ` + friendlyError(e));
        await loadAll();
        return false;
      }
    }
    await loadAll();
    return true;
  };

  // --- Inbound Service Drive ---
  const saveDriveScores = (rows) =>
    run(supabase.from("drive_scores").upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "month,agent_id" }));
  const saveDriveCentre = (month, asa, answer_rate) =>
    run(supabase.from("drive_centre").upsert({ month, asa, answer_rate, updated_at: new Date().toISOString() }, { onConflict: "month" }));
  const saveDriveRules = (rules) =>
    run(supabase.from("drive_rules").upsert({ id: "main", rules, updated_at: new Date().toISOString() }, { onConflict: "id" }));

  return {
    driveRules, driveScores, driveCentre, saveDriveScores, saveDriveCentre, saveDriveRules, bulkImport,
    // state
    teams, agents, metrics, weeklyEntries, prizes, redemptions, requests,
    users, announcements, budgetHistory, quests, kudos, loading, error, loadAll,
    customBadges, assignedBadges, missingTables,
    // derived
    agentEarnedPts, agentStreak, streakBonus, agentTotalPts, agentRedeemedPts,
    agentAvailPts, agentBadges, activeAnnouncements, pendingRequests,
    prizeStockUsed, currentBudget, getAgentCustomBadges,
    // mutations
    saveEntry, adjustPoints, deleteWeeklyEntry,
    addAgent, updateAgent, removeAgent,
    addTeam, updateTeam, removeTeam,
    addPrize, updatePrize, removePrize,
    addUser, updateUser, removeUser,
    requestRedeem, resolveRequest, setBudgetRow,
    postAnnouncement, dismissAnnouncement,
    // quests
    addQuest, updateQuest, removeQuest,
    // kudos
    addKudos, removeKudos,
    // metrics
    addMetric, updateMetric, removeMetric,
    // custom badges
    addCustomBadge, updateCustomBadge, removeCustomBadge, assignBadge, unassignBadge
  };
}