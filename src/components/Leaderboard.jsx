import { useMemo, useState } from "react";
import { Avatar } from "./ui.jsx";

export default function Leaderboard({ db, myAgentId }) {
  const [teamFilter, setTeamFilter] = useState("all");

  const ranked = useMemo(() => {
    const pool = teamFilter === "all" ? db.agents : db.agents.filter((a) => a.team_id === teamFilter);
    return [...pool].sort((a, b) => db.agentAvailPts(b.id) - db.agentAvailPts(a.id));
  }, [db, teamFilter]);

  // Top 3 for podium
  const topThree = useMemo(() => {
    return ranked.slice(0, 3);
  }, [ranked]);

  // Remaining for table
  const remaining = useMemo(() => {
    return ranked.slice(3);
  }, [ranked]);

  // Team battle: total earned points per team
  const battle = useMemo(
    () =>
      db.teams
        .map((t) => ({
          team: t,
          total: db.agents
            .filter((a) => a.team_id === t.id)
            .reduce((s, a) => s + db.agentTotalPts(a.id), 0)
        }))
        .sort((a, b) => b.total - a.total),
    [db]
  );
  const battleMax = Math.max(1, ...battle.map((b) => b.total));

  // Hall of fame
  const fame = useMemo(() => {
    const byAgentWeek = {};
    db.weeklyEntries.forEach((e) => {
      const key = `${e.agent_id}|${e.week_label}`;
      byAgentWeek[key] = (byAgentWeek[key] || 0) + (Number(e.points) || 0);
    });
    let bestWeek = null;
    Object.entries(byAgentWeek).forEach(([key, total]) => {
      if (!bestWeek || total > bestWeek.total) {
        const [agent_id, week] = key.split("|");
        bestWeek = { agent: db.agents.find((a) => a.id === agent_id), week, total };
      }
    });
    const topAllTime = [...db.agents].sort((a, b) => db.agentTotalPts(b.id) - db.agentTotalPts(a.id))[0];
    const longestStreak = [...db.agents].sort((a, b) => db.agentStreak(b.id) - db.agentStreak(a.id))[0];
    return { bestWeek, topAllTime, longestStreak };
  }, [db]);

  return (
    <div className="leaderboard-layout">
      {/* Left Column: Leaderboard Card */}
      <div className="leaderboard-main-col">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="spread">
            <div className="card-title" style={{ marginBottom: 0 }}>🏆 Office Leaderboard</div>
            <select className="input" style={{ width: "auto", height: "34px", padding: "0 10px" }} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
              <option value="all">All teams</option>
              {db.teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* 1. Gorgeous 3D Podium for Top 3 (if we have at least 3 agents in active filter) */}
          {ranked.length >= 3 ? (
            <div className="podium-section">
              {/* 2nd Place Spot */}
              {topThree[1] && (
                <div className="podium-spot second">
                  <div className="podium-avatar-container">
                    <Avatar agent={topThree[1]} size={54} />
                    <div className="podium-name-tag">{topThree[1].name}</div>
                    <div className="podium-pts-tag">{db.agentAvailPts(topThree[1].id)} pts</div>
                  </div>
                  <div className="podium-pedestal">2</div>
                </div>
              )}

              {/* 1st Place Spot (Center / Tallest) */}
              {topThree[0] && (
                <div className="podium-spot first">
                  <div className="podium-avatar-container">
                    <span className="podium-crown">👑</span>
                    <Avatar agent={topThree[0]} size={68} />
                    <div className="podium-name-tag" style={{ fontSize: 13, fontWeight: 800 }}>{topThree[0].name}</div>
                    <div className="podium-pts-tag" style={{ fontSize: 12 }}>{db.agentAvailPts(topThree[0].id)} pts</div>
                  </div>
                  <div className="podium-pedestal">1</div>
                </div>
              )}

              {/* 3rd Place Spot */}
              {topThree[2] && (
                <div className="podium-spot third">
                  <div className="podium-avatar-container">
                    <Avatar agent={topThree[2]} size={48} />
                    <div className="podium-name-tag">{topThree[2].name}</div>
                    <div className="podium-pts-tag">{db.agentAvailPts(topThree[2].id)} pts</div>
                  </div>
                  <div className="podium-pedestal">3</div>
                </div>
              )}
            </div>
          ) : null}

          {/* 2. Detailed ranking list */}
          <div className="mt" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* If we had a podium, we list from rank 4+ here. Otherwise, list all starting from rank 1 */}
            {(ranked.length >= 3 ? remaining : ranked).map((a, i) => {
              const actualRank = ranked.length >= 3 ? i + 4 : i + 1;
              return (
                <div key={a.id} className={`lb-row ${a.id === myAgentId ? "me" : ""}`}>
                  <div className={`lb-rank ${actualRank < 4 ? "top" : ""}`}>
                    {actualRank === 1 ? "🥇" : actualRank === 2 ? "🥈" : actualRank === 3 ? "🥉" : actualRank}
                  </div>
                  <Avatar agent={a} />
                  <div className="lb-name">
                    {a.name}
                    <span className="muted" style={{ marginLeft: 8, marginRight: 8, fontSize: "11px", fontWeight: "normal" }}>
                      {db.teams.find((t) => t.id === a.team_id)?.name}
                    </span>
                    <span style={{ display: "inline-flex", gap: "4px" }}>
                      {db.getAgentCustomBadges && db.getAgentCustomBadges(a.id).map(cb => (
                        <span 
                          key={cb.id} 
                          title={`${cb.name}: ${cb.desc}`} 
                          style={{ 
                            fontSize: "13px", 
                            cursor: "help",
                            textShadow: "0 1px 2px rgba(0,0,0,0.4)"
                          }}
                        >
                          {cb.icon}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="pill" style={{ padding: "3px 8px", fontSize: "11px" }}>🔥 {db.agentStreak(a.id)}w streak</div>
                  <div className="lb-pts" style={{ fontSize: "14px" }}>{db.agentAvailPts(a.id)} pts</div>
                </div>
              );
            })}
            
            {!ranked.length && <div className="muted" style={{ textAlign: "center", padding: "24px 0" }}>No agents found matching this team filter.</div>}
          </div>
        </div>
      </div>

      {/* Right Column: Team battle & Hall of Fame */}
      <div className="leaderboard-side-col">
        {/* Team Battle progress meters */}
        <div className="card">
          <div className="card-title">⚔️ Team Battle</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            A cumulative team race of all earned points since inception. Let's see who dominates!
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {battle.map((b, i) => (
              <div key={b.team.id} style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div className="spread">
                  <strong style={{ fontSize: "13px" }}>{i === 0 ? "👑 " : ""}{b.team.full_name || b.team.name}</strong>
                  <span className="lb-pts" style={{ color: b.team.color || "var(--accent)", fontSize: "13px" }}>{b.total} pts</span>
                </div>
                <div className="prog-bar" style={{ height: "8px", marginTop: "8px" }}>
                  <div
                    className="prog-fill"
                    style={{ width: `${Math.round((b.total / battleMax) * 100)}%`, background: b.team.color || "var(--accent)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hall of Fame Records */}
        <div className="card">
          <div className="card-title">🌟 Office Hall of Fame</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            Historical high-scores and record-breakers in Callibre rewards.
          </div>
          <table className="tbl">
            <tbody>
              <tr>
                <td className="muted" style={{ fontWeight: 600 }}>🏆 All-time top scorer</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {fame.topAllTime ? `${fame.topAllTime.name} (${db.agentTotalPts(fame.topAllTime.id)} pts)` : "—"}
                </td>
              </tr>
              <tr>
                <td className="muted" style={{ fontWeight: 600 }}>⚡ Best single week record</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {fame.bestWeek?.agent ? `${fame.bestWeek.agent.name} (${fame.bestWeek.total} pts in ${fame.bestWeek.week})` : "—"}
                </td>
              </tr>
              <tr>
                <td className="muted" style={{ fontWeight: 600 }}>🔥 Longest active streak</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {fame.longestStreak ? `${fame.longestStreak.name} (${db.agentStreak(fame.longestStreak.id)} weeks)` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
