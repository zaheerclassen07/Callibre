import { useMemo, useState, useEffect } from "react";
import { BADGES, STREAK_TIERS } from "../constants.js";
import { getWeekLabel } from "../lib/helpers.js";
import { Avatar, Progress, Stat, SearchableMemberSelect } from "./ui.jsx";

export default function Dashboard({ db, agent, readOnly = false }) {
  if (!agent) {
    return (
      <div className="card">
        <div className="card-title">Dashboard</div>
        <div className="muted">
          Your login isn't linked to an agent profile yet. Ask a team leader to link your
          account under Admin → Users.
        </div>
      </div>
    );
  }

  const team = db.teams.find((t) => t.id === agent.team_id);
  const streak = db.agentStreak(agent.id);
  const unlocked = db.agentBadges(agent).map((b) => b.id);
  const nextTier = STREAK_TIERS.find((t) => streak < t.weeks);

  const recentWeeks = [0, 1, 2, 3].map((i) => {
    const wk = getWeekLabel(i);
    const entries = db.weeklyEntries.filter((e) => e.agent_id === agent.id && e.week_label === wk);
    return { wk, entries, total: entries.reduce((s, e) => s + (Number(e.points) || 0), 0) };
  });

  // ---- Customizable Dashboard Widgets ----
  const DEFAULT_WIDGETS = [
    { id: "profile", label: "👤 Profile Summary & Stats", visible: true, desc: "Displays your profile details, point summary stats, and streak progress bar." },
    { id: "spinner", label: "🎡 Wheel of Fortune Spinner", visible: true, desc: "Let's you spin the daily fortune wheel to earn point modifiers or fun rewards." },
    { id: "quests", label: "🛡️ Team Collaborative Quests", visible: true, desc: "Shows progress on team-wide collaborative target milestones and quests." },
    { id: "kudos", label: "💬 Live Kudos Wall", visible: true, desc: "A live social appreciation board where colleagues exchange feedback and positive vibes." },
    { id: "logs", label: "📊 Recent Point Logs", visible: true, desc: "A weekly tabular log showing your points earned from each metric over the last few weeks." },
    { id: "achievements", label: "🏆 My Achievements", visible: true, desc: "A beautiful display of system-calculated unlockable milestones and honors." },
    { id: "badges", label: "🎖️ Special Custom Honors", visible: true, desc: "Your unique assigned honors awarded directly by Team Leaders and Super Admins." }
  ];

  const [widgets, setWidgets] = useState(() => {
    const key = `db_dashboard_widgets:${agent.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Keep this person's saved order/visibility, but add in any widget
        // that's been introduced since they last saved (e.g. Kudos), so new
        // features don't silently stay hidden just because someone's layout
        // predates them.
        const knownIds = new Set(parsed.map((w) => w.id));
        const merged = [...parsed, ...DEFAULT_WIDGETS.filter((d) => !knownIds.has(d.id))];
        return merged;
      } catch (e) {
        // use default fallback below
      }
    }
    return DEFAULT_WIDGETS;
  });

  const [showConfig, setShowConfig] = useState(false);

  const saveWidgets = (newWidgets) => {
    setWidgets(newWidgets);
    localStorage.setItem(`db_dashboard_widgets:${agent.id}`, JSON.stringify(newWidgets));
  };

  const toggleWidget = (id) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    saveWidgets(updated);
  };

  const moveWidget = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    saveWidgets(updated);
  };

  const renderWidget = (id) => {
    switch (id) {
      case "profile":
        return (
          <div key="profile" className="card" style={{ marginBottom: 0 }}>
            <div className="agent-hero">
              <Avatar agent={agent} size={72} />
              <div>
                <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 34, letterSpacing: 1, color: "var(--accent)", lineHeight: 1, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span>{agent.name}</span>
                  <span style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", alignItems: "center", textShadow: "none" }}>
                    {db.agentBadges(agent).map((b) => (
                      <span key={b.id} title={`System Badge: ${b.name} - ${b.desc}`} style={{ fontSize: "20px", cursor: "help", display: "inline-flex" }}>
                        {b.icon}
                      </span>
                    ))}
                    {(db.assignedBadges || [])
                      .filter(ab => ab.target_type === "agent" && ab.target_id === agent.id)
                      .map(ab => db.customBadges.find(cb => cb.id === ab.badge_id))
                      .filter(Boolean)
                      .map(cb => (
                        <span key={cb.id} title={`Custom Honor: ${cb.name} - ${cb.desc}`} style={{ fontSize: "20px", cursor: "help", display: "inline-flex" }}>
                          {cb.icon || "🎖️"}
                        </span>
                      ))}
                    {agent.team_id && (db.assignedBadges || [])
                      .filter(ab => ab.target_type === "team" && ab.target_id === agent.team_id)
                      .map(ab => db.customBadges.find(cb => cb.id === ab.badge_id))
                      .filter(Boolean)
                      .map(cb => (
                        <span key={cb.id} title={`Team Honor: ${cb.name} - ${cb.desc}`} style={{ fontSize: "20px", cursor: "help", display: "inline-flex" }}>
                          {cb.icon || "🛡️"}
                        </span>
                      ))}
                  </span>
                </h2>
                <div className="mt" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: 8 }}>
                  <span className="pill" style={{ borderColor: team?.color }}>
                    🛡️ {team?.full_name || team?.name || "No team"}
                  </span>
                  <span className="pill" style={{ color: "var(--accent)" }}>
                    🔥 {streak}-week streak
                  </span>
                  {agent.emp_id && <span className="pill">🆔 {agent.emp_id}</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-4 mt" style={{ marginTop: 20 }}>
              <Stat num={db.agentAvailPts(agent.id)} label="Available pts" />
              <Stat num={db.agentTotalPts(agent.id)} label="Total earned" />
              <Stat num={db.agentRedeemedPts(agent.id)} label="Redeemed" />
              <Stat num={db.streakBonus(agent.id)} label="Streak bonus" />
            </div>
            {nextTier && (
              <div className="mt" style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, marginTop: 16 }}>
                <div className="muted" style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                  <span>Streak Milestone Level</span>
                  <span style={{ color: "var(--accent)", fontWeight: "bold" }}>
                    {nextTier.weeks - streak} week{nextTier.weeks - streak === 1 ? "" : "s"} to {nextTier.label} (+{nextTier.bonus}pts)
                  </span>
                </div>
                <Progress value={streak} max={nextTier.weeks} />
              </div>
            )}
          </div>
        );
      case "spinner":
        return (
          <div key="spinner" className="card animate-fade-in" style={{ marginBottom: 0 }}>
            <WheelOfFortune db={db} agent={agent} readOnly={readOnly} />
          </div>
        );
      case "quests":
        return <TeamQuests key="quests" db={db} agent={agent} team={team} />;
      case "kudos":
        return (
          <div key="kudos" className="card animate-fade-in" style={{ marginBottom: 0 }}>
            <KudosWall db={db} agent={agent} readOnly={readOnly} />
          </div>
        );
      case "logs":
        return (
          <div key="logs" className="card animate-fade-in" style={{ marginBottom: 0 }}>
            <div className="card-title">Recent weeks history</div>
            <table className="tbl">
              <thead>
                <tr><th>Week</th><th>Metrics scored</th><th style={{ textAlign: "right" }}>Points</th></tr>
              </thead>
              <tbody>
                {recentWeeks.map((r) => (
                  <tr key={r.wk}>
                    <td>{r.wk}</td>
                    <td className="muted" style={{ fontSize: "16px" }}>
                      {r.entries.length
                        ? r.entries
                            .map((e) => db.metrics.find((m) => m.id === e.metric_id)?.icon || "✏️")
                            .join(" ")
                        : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono'", color: "var(--accent)", fontWeight: "bold" }}>
                      {r.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "achievements":
        return (
          <div key="achievements" className="card animate-fade-in" style={{ marginBottom: 0 }}>
            <div className="card-title">My Achievements</div>
            <div className="grid grid-4">
              {BADGES.map((b) => (
                <div key={b.id} className={`badge-tile ${unlocked.includes(b.id) ? "" : "locked"}`} style={{ transition: "all 0.3s" }}>
                  <div className="badge-icon" style={{ transform: unlocked.includes(b.id) ? "scale(1.1)" : "scale(1)" }}>{b.icon}</div>
                  <div className="badge-name">{b.name}</div>
                  <div className="badge-desc">{b.desc}</div>
                  {unlocked.includes(b.id) ? (
                    <span className="tag ok" style={{ fontSize: 9, marginTop: 6, display: "inline-block" }}>Unlocked</span>
                  ) : (
                    <span className="tag bad" style={{ fontSize: 9, marginTop: 6, display: "inline-block", background: "none" }}>Locked</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case "badges":
        return db.getAgentCustomBadges && db.getAgentCustomBadges(agent.id).length > 0 ? (
          <div key="badges" className="card animate-fade-in" style={{ marginBottom: 0 }}>
            <div className="card-title" style={{ color: "var(--accent)", marginBottom: 16 }}>🎖️ Special Team & Leaderboard Honors</div>
            <div className="grid grid-4">
              {db.getAgentCustomBadges(agent.id).map((b) => {
                const bgGradient = `linear-gradient(${b.gradient_angle || '135deg'}, ${b.gradient_from || 'var(--accent)'}, ${b.gradient_to || 'var(--teal)'})`;
                return (
                  <div 
                    key={b.id} 
                    className="badge-tile" 
                    style={{ 
                      transition: "all 0.3s",
                      position: "relative",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "var(--navy3)"
                    }}
                  >
                    <div 
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "4px",
                        background: bgGradient
                      }}
                    />
                    <div className="badge-icon" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>{b.icon}</div>
                    <div className="badge-name" style={{ color: b.gradient_from || "var(--accent)" }}>{b.name}</div>
                    <div className="badge-desc">{b.desc}</div>
                    <span 
                      className="tag" 
                      style={{ 
                        fontSize: 9, 
                        marginTop: 8, 
                        display: "inline-block",
                        background: bgGradient,
                        color: "#111",
                        fontWeight: "bold",
                        padding: "2px 8px",
                        borderRadius: "4px"
                      }}
                    >
                      Assigned Honor
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: "800", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted)" }}>
          🖥️ CUSTOMIZABLE DASHBOARD WORKSPACE
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => setShowConfig(!showConfig)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 11 }}
        >
          {showConfig ? "⚙️ Hide Widget Manager" : "⚙️ Customize Dashboard Layout"}
        </button>
      </div>

      {widgets.some(w => w.id === "kudos" && !w.visible) && (
        <div style={{
          background: "rgba(235, 175, 40, 0.08)",
          border: "1px dashed var(--accent)",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap"
        }}>
          <div style={{ fontSize: 13 }}>
            💡 <strong>Kudos Wall is currently hidden:</strong> It looks like your custom workspace has the Kudos Wall disabled or hidden in your layout preferences.
          </div>
          <button 
            className="btn btn-sm" 
            onClick={() => {
              const updated = widgets.map(w => w.id === "kudos" ? { ...w, visible: true } : w);
              saveWidgets(updated);
            }}
          >
            🔌 Enable Kudos Wall
          </button>
        </div>
      )}

      {showConfig && (
        <div className="card" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px dashed var(--accent)", marginBottom: 24 }}>
          <div className="card-title" style={{ color: "var(--accent)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span>🛠️ Dashboard Widget Workspace Manager</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button 
                className="btn btn-sm btn-ghost" 
                style={{ fontSize: 11, padding: "2px 8px" }} 
                onClick={() => {
                  if (confirm("Reset layout order and enable all widgets by default?")) {
                    saveWidgets(DEFAULT_WIDGETS);
                  }
                }}
              >
                🔄 Reset Layout
              </button>
              <button className="btn btn-ghost btn-sm" style={{ padding: "2px 8px" }} onClick={() => setShowConfig(false)}>✕</button>
            </div>
          </div>
          <div className="muted" style={{ marginBottom: 16, fontSize: 12 }}>
            Toggle which cards are active on your personal board, and arrange their exact display order to match your ideal workspace.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {widgets.map((w, idx) => (
              <div 
                key={w.id} 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  background: "var(--navy3)", 
                  padding: "10px 14px", 
                  borderRadius: 10, 
                  border: "1px solid var(--border)",
                  gap: 12
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <input 
                    type="checkbox" 
                    id={`widget-chk-${w.id}`}
                    checked={w.visible} 
                    onChange={() => toggleWidget(w.id)}
                    style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <label htmlFor={`widget-chk-${w.id}`} style={{ fontWeight: "700", cursor: "pointer", fontSize: 12.5, color: w.visible ? "var(--text)" : "var(--muted)" }}>
                      {w.label} {!w.visible && <span style={{ fontSize: 10, opacity: 0.6 }}>(Hidden)</span>}
                    </label>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.desc}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px", fontSize: 11 }} disabled={idx === 0} onClick={() => moveWidget(idx, -1)}>
                    ▲
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px", fontSize: 11 }} disabled={idx === widgets.length - 1} onClick={() => moveWidget(idx, 1)}>
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {widgets.filter(w => w.visible).map(w => renderWidget(w.id))}
      </div>
    </>
  );
}

/* ============================================================
   INTERACTIVE GAMIFICATION: Wheel of Fortune Component
   ============================================================ */
function WheelOfFortune({ db, agent, readOnly = false }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [outcome, setOutcome] = useState(null);

  const availablePoints = db.agentAvailPts(agent.id);

  const segmentValues = useMemo(() => {
    try {
      const stored = localStorage.getItem("db_wheel_prizes");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Could not load wheel prizes:", e);
    }
    return [
      { label: "+10 Pts", pts: 10, name: "10 Bonus Points" },
      { label: "+25 Pts", pts: 25, name: "25 Bonus Points" },
      { label: "Jackpot 💎", pts: 100, name: "100 Points Mega Jackpot!" },
      { label: "Coffee ☕", pts: 0, name: "Free Coffee Voucher" },
      { label: "+50 Pts 💰", pts: 50, name: "50 Points (Refund)" },
      { label: "Try Again 🍀", pts: 0, name: "Better Luck Next Time!" }
    ];
  }, []);

  const spin = async () => {
    if (readOnly) {
      alert("You're viewing this dashboard in read-only mode, so spinning isn't available here.");
      return;
    }
    if (spinning) return;
    if (availablePoints < 50) {
      alert("Spin costs 50 available points. Earn more points first!");
      return;
    }

    // Deduct 50 points cost
    await db.adjustPoints(agent.id, -50, "Wheel of Fortune spin");
    
    // Choose segment index
    const segmentIndex = Math.floor(Math.random() * segmentValues.length);
    const degreesPerSlice = 360 / segmentValues.length;
    
    // Spin 5-8 full rotations plus targeting the specific slice
    const totalSpins = 5 + Math.floor(Math.random() * 3);
    const newRotation = rotation + (totalSpins * 360) + (360 - (segmentIndex * degreesPerSlice) - (degreesPerSlice / 2));
    
    setRotation(newRotation);
    setSpinning(true);
    setOutcome(null);

    // Play/Simulate ticks or animation state
    setTimeout(async () => {
      setSpinning(false);
      const prize = segmentValues[segmentIndex];
      setOutcome(prize);

      // Add prize points if positive
      if (prize.pts > 0) {
        await db.adjustPoints(agent.id, prize.pts, `Won ${prize.name} from Wheel of Fortune!`);
      } else if (prize.name.includes("Coffee")) {
        // Log voucher win as 0pts ledger entry so admins can see/deliver it!
        await db.adjustPoints(agent.id, 0, `Won: Free Coffee Voucher! (Leader will arrange)`);
      } else {
        await db.adjustPoints(agent.id, 0, "Spin result: Try Again");
      }
    }, 4000);
  };

  return (
    <div className="wheel-section">
      <div className="card-title" style={{ width: "100%", textAlign: "left", marginBottom: 6 }}>
        🎡 Spin to Win! (50 pts)
      </div>
      <div className="muted" style={{ width: "100%", marginBottom: 12 }}>
        Exchange 50 points for a chance to win 100 pts Jackpot or delicious Free Coffee!
      </div>

      <div className="wheel-wrapper">
        <div className={`wheel-pointer ${spinning ? "wiggling" : ""}`} />
        <div 
          className="wheel-outer" 
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {segmentValues.map((s, idx) => {
            const rot = idx * (360 / segmentValues.length);
            return (
              <div 
                key={idx} 
                className="wheel-slice-text" 
                style={{ transform: `rotate(${rot}deg)` }}
              >
                {s.label}
              </div>
            );
          })}
        </div>
        <button 
          className="wheel-center-btn" 
          disabled={readOnly || spinning || availablePoints < 50} 
          onClick={spin}
        >
          {spinning ? "SPINNING" : "SPIN"}
        </button>
      </div>

      {outcome && (
        <div className="mt" style={{ textAlign: "center", background: "rgba(0,201,167,0.1)", border: "1px solid var(--teal)", padding: 10, borderRadius: 10, width: "100%" }}>
          <strong style={{ color: "var(--teal)" }}>🎉 You Won: {outcome.name}</strong>
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Points balance updated automatically.</div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   COLLABORATIVE STATS: Team & Office Quests
   ============================================================ */
function TeamQuests({ db, agent, team }) {
  const currentWeek = getWeekLabel(0);

  // Filter only active quests
  const activeQuests = db.quests.filter((q) => q.active);

  // Dynamic quest progress calculator
  const calculateProgress = (q) => {
    const scopeAgents = q.team_id ? db.agents.filter(a => a.team_id === q.team_id) : db.agents;
    const scopeIds = scopeAgents.map(a => a.id);

    if (q.target_type === "total_points") {
      // Sum points of these agents in the current week
      return db.weeklyEntries
        .filter(e => scopeIds.includes(e.agent_id) && e.week_label === currentWeek)
        .reduce((sum, e) => sum + (Number(e.points) || 0), 0);
    }
    if (q.target_type === "metrics_count") {
      // Count times any specified metrics are met by team members this week
      return db.weeklyEntries
        .filter(e => scopeIds.includes(e.agent_id) && e.week_label === currentWeek)
        .length;
    }
    return q.current_value || 0;
  };

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-title">⚔️ Collaborative Team Quests</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Join forces with teammates to achieve weekly office milestones and unlock bonuses!
      </div>

      {activeQuests.map((q) => {
        const prog = calculateProgress(q);
        const pct = q.target_value > 0 ? Math.min(100, Math.round((prog / q.target_value) * 100)) : 0;
        const isTeamSpecific = q.team_id != null;
        const matchingTeam = isTeamSpecific ? db.teams.find(t => t.id === q.team_id) : null;

        return (
          <div key={q.id} className="quest-card">
            <div className="spread">
              <strong style={{ color: isTeamSpecific ? matchingTeam?.color || "var(--accent)" : "var(--accent)" }}>
                {q.title}
              </strong>
              <span className="tag ok">
                {isTeamSpecific ? `${matchingTeam?.name} Team` : "Office-Wide"}
              </span>
            </div>
            <p className="muted" style={{ fontSize: "11.5px", marginTop: 4, lineHeight: 1.4 }}>
              {q.description}
            </p>
            <div className="quest-progress-container">
              <div className="prog-bar" style={{ height: 6 }}>
                <div 
                  className="prog-fill" 
                  style={{ 
                    width: `${pct}%`, 
                    background: isTeamSpecific ? matchingTeam?.color : "linear-gradient(90deg, var(--accent), var(--teal))" 
                  }} 
                />
              </div>
              <div className="quest-metrics-row">
                <span>Progress: {pct}%</span>
                <span>{prog} / {q.target_value} target</span>
              </div>
            </div>
          </div>
        );
      })}

      {!activeQuests.length && (
        <div className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
          No active collaborative quests at the moment.
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SOCIAL COLLABORATION: Live Kudos Appreciations Wall
   ============================================================ */
function KudosWall({ db, agent, readOnly = false }) {
  const [kudosMsg, setKudosMsg] = useState("");
  const [recipientIds, setRecipientIds] = useState([]);
  const [emoji, setEmoji] = useState("🙌");
  const [submitting, setSubmitting] = useState(false);

  const emojiOptions = ["🙌", "🔥", "🌟", "👑", "🎯", "🚀", "💎", "❤️"];

  // Sort kudos posts to display newest first
  const sortedKudos = useMemo(() => {
    return [...db.kudos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [db.kudos]);

  const sendKudos = async (e) => {
    e.preventDefault();
    if (readOnly) return alert("You're viewing this dashboard in read-only mode, so posting isn't available here.");
    if (!kudosMsg.trim()) return alert("Write a message first!");
    if (recipientIds.length === 0) return alert("Select at least one recipient!");

    setSubmitting(true);
    let allSuccess = true;
    for (const rId of recipientIds) {
      const receiver = db.agents.find(a => a.id === rId);
      if (!receiver) continue;
      const success = await db.addKudos({
        sender_name: agent.name,
        receiver_name: receiver.name,
        message: kudosMsg.trim(),
        emoji: emoji
      });
      if (!success) allSuccess = false;
    }

    setSubmitting(false);
    if (allSuccess) {
      setKudosMsg("");
      setRecipientIds([]);
    }
  };

  return (
    <div className="kudos-container" style={{ height: "100%" }}>
      <div className="card-title">💬 Live Kudos Wall</div>
      <div className="muted" style={{ marginBottom: 14 }}>
        Celebrate colleagues! Say thank you, call out outstanding support, and spread positive vibes.
      </div>

      {/* Kudos Composer */}
      <form onSubmit={sendKudos} className="kudos-composer">
        <label className="lbl">Shout-out to colleague(s)</label>
        <SearchableMemberSelect 
          agents={db.agents.filter((a) => a.id !== agent.id)}
          teams={db.teams}
          selectedIds={recipientIds}
          onChange={setRecipientIds}
          placeholder="Search and select colleague(s)..."
          multiple={true}
        />

        <label className="lbl">Appreciation Message</label>
        <textarea 
          className="input" 
          rows={2} 
          maxLength={120}
          value={kudosMsg} 
          onChange={(e) => setKudosMsg(e.target.value)} 
          placeholder="Type something amazing... (max 120 chars)"
          required
        />

        <label className="lbl">Select reaction vibe</label>
        <div className="emoji-picker-row">
          {emojiOptions.map((e) => (
            <span 
              key={e} 
              className={`emoji-option ${emoji === e ? "active" : ""}`}
              onClick={() => setEmoji(e)}
            >
              {e}
            </span>
          ))}
        </div>

        <button 
          type="submit" 
          className="btn" 
          style={{ width: "100%", marginTop: 8 }}
          disabled={readOnly || submitting || recipientIds.length === 0 || !kudosMsg.trim()}
        >
          {submitting ? "Sharing..." : "Post to Kudos Wall 🚀"}
        </button>
      </form>

      {/* Kudos Grid Feed */}
      <div className="kudos-grid">
        {sortedKudos.map((k) => (
          <div key={k.id} className="kudos-item">
            <div className="kudos-top">
              <div className="kudos-header-names">
                <span style={{ color: "var(--accent)" }}>{k.sender_name}</span> 
                <span className="muted" style={{ margin: "0 4px" }}>→</span> 
                <span>{k.receiver_name}</span>
              </div>
              <span className="kudos-emoji-tag">{k.emoji || "🙌"}</span>
            </div>
            <p className="kudos-body">"{k.message}"</p>
            <div className="kudos-footer">
              <span>Peer Appreciated</span>
              <span>{new Date(k.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}

        {!sortedKudos.length && (
          <div className="muted" style={{ textAlign: "center", padding: "40px 0" }}>
            The kudos wall is looking fresh. Be the first to share an appreciation!
          </div>
        )}
      </div>
    </div>
  );
}
