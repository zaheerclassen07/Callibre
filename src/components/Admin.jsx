import { useEffect, useMemo, useState } from "react";
import { AGENT_COLORS, MONTHLY_BUDGET } from "../constants.js";
import { getWeekLabel, hashPassword, uid } from "../lib/helpers.js";
import { Avatar, Modal, Stat, SearchableMemberSelect } from "./ui.jsx";
import ImportMembers from "./ImportMembers.jsx";

/* ---------------- Point allocation: Type-in input ---------------- */
function MetricInput({ db, agentId, week, metric }) {
  const existing = db.weeklyEntries.find(
    (e) => e.agent_id === agentId && e.week_label === week && e.metric_id === metric.id
  );
  const val = existing ? existing.points : "";
  const [temp, setTemp] = useState(val);

  useEffect(() => {
    setTemp(existing ? existing.points : "");
  }, [existing]);

  const commit = async () => {
    const num = temp === "" ? 0 : Number(temp);
    const prevNum = existing ? existing.points : 0;
    if (num === prevNum) return; // no change
    await db.saveEntry(agentId, week, metric.id, num);
  };

  return (
    <input
      type="number"
      className="input text-center"
      style={{
        width: "60px",
        padding: "2px 4px",
        fontSize: "13px",
        fontWeight: temp ? "600" : "normal",
        height: "28px",
        margin: "0 auto",
        textAlign: "center",
        border: temp ? "1px solid var(--accent)" : "1px solid var(--border)",
        background: temp ? "rgba(245, 200, 66, 0.08)" : "rgba(0,0,0,0.15)",
        color: temp ? "var(--accent)" : "var(--text)"
      }}
      value={temp}
      placeholder="0"
      onChange={(e) => setTemp(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.target.blur();
        }
      }}
    />
  );
}

/* ---------------- Audit Ledger (super only) ---------------- */
function AuditLedger({ db }) {
  const [search, setSearch] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const entries = useMemo(() => {
    return db.weeklyEntries
      .slice()
      .filter((e) => {
        const agent = db.agents.find((a) => a.id === e.agent_id);
        if (!agent) return false;
        
        // Agent filter
        if (selectedAgentId && e.agent_id !== selectedAgentId) return false;

        // Search text
        if (search) {
          const lower = search.toLowerCase();
          const matchesAgentName = agent.name.toLowerCase().includes(lower);
          const metric = db.metrics.find((m) => m.id === e.metric_id);
          const matchesMetricLabel = metric ? metric.label.toLowerCase().includes(lower) : false;
          const matchesMetricId = e.metric_id.toLowerCase().includes(lower);
          return matchesAgentName || matchesMetricLabel || matchesMetricId;
        }

        return true;
      })
      .sort((a, b) => b.week_label.localeCompare(a.week_label));
  }, [db.weeklyEntries, db.agents, db.metrics, search, selectedAgentId]);

  const handleReverse = async (entry) => {
    const agent = db.agents.find((a) => a.id === entry.agent_id);
    const metric = db.metrics.find((m) => m.id === entry.metric_id);
    const label = metric ? metric.label : entry.metric_id;
    if (confirm(`Are you sure you want to reverse (delete) this award of ${entry.points} points for ${agent?.name} under ${label}?`)) {
      await db.deleteWeeklyEntry(entry.id);
    }
  };

  return (
    <div className="card">
      <div className="spread">
        <div className="card-title" style={{ marginBottom: 0 }}>📜 Points Audit Ledger</div>
        <div className="flex" style={{ gap: 12, flexWrap: "wrap" }}>
          <select
            className="input"
            style={{ width: 180, height: 34, padding: "0 8px" }}
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
          >
            <option value="">All Agents</option>
            {db.agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <input
            className="input"
            style={{ width: 200, height: 34, padding: "0 12px" }}
            placeholder="Search category, agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="muted mt" style={{ marginBottom: 12 }}>
        Below is a complete ledger of all individual metric scores, points adjustments, and manual overrides. As a Super User, you can audit, verify, and reverse any entry.
      </div>

      <div style={{ maxHeight: 350, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Week</th>
              <th>Agent</th>
              <th>Point Category</th>
              <th>Value</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const agent = db.agents.find((a) => a.id === e.agent_id);
              const metric = db.metrics.find((m) => m.id === e.metric_id);
              const isManual = String(e.metric_id).startsWith("manual");
              const label = isManual ? `Adjustment: ${e.metric_id.split(":")[1] || "Reason not provided"}` : (metric?.label || e.metric_id);
              const icon = isManual ? "✍️" : (metric?.icon || "🎯");
              return (
                <tr key={e.id}>
                  <td style={{ fontFamily: "'JetBrains Mono'" }}>{e.week_label}</td>
                  <td>
                    <div className="flex" style={{ gap: 6 }}>
                      <Avatar agent={agent} size={20} />
                      {agent?.name || "Unknown"}
                    </div>
                  </td>
                  <td>
                    <span style={{ marginRight: 6 }}>{icon}</span>
                    {label}
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono'", color: e.points > 0 ? "var(--teal)" : "var(--red)", fontWeight: "bold" }}>
                    {e.points > 0 ? `+${e.points}` : e.points} pts
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => handleReverse(e)}
                    >
                      Reverse
                    </button>
                  </td>
                </tr>
              );
            })}
            {!entries.length && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
                  No matching audit entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuickAdd({ db, isSuper, myTeamId }) {
  const [activeTab, setActiveTab] = useState("single"); // "single" or "bulk"

  // Single Add form states
  const [fullName, setFullName] = useState("");
  const [empId, setEmpId] = useState("");
  const [teamId, setTeamId] = useState(myTeamId || db.teams[0]?.id || "");
  const [color, setColor] = useState("cartoon");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent"); // agent, admin, super
  const [busy, setBusy] = useState(false);

  // Bulk Add form states
  const [bulkText, setBulkText] = useState("");
  const [bulkTeamId, setBulkTeamId] = useState(myTeamId || db.teams[0]?.id || "");
  const [bulkRole, setBulkRole] = useState("agent");
  const [tempPassword, setTempPassword] = useState("Welcome@123");

  // Sync team selection if team is empty or changed
  useEffect(() => {
    if (!teamId && db.teams.length > 0) {
      setTeamId(myTeamId || db.teams[0].id);
    }
    if (!bulkTeamId && db.teams.length > 0) {
      setBulkTeamId(myTeamId || db.teams[0].id);
    }
  }, [db.teams, myTeamId, teamId, bulkTeamId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      alert("Please fill in Full Name, Username, and Password.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    // Check if username is already taken
    const lowerUsername = username.trim().toLowerCase();
    const isTaken = db.users.some(u => u.username.toLowerCase() === lowerUsername);
    if (isTaken) {
      alert(`Username "${username}" is already taken. Please choose another username.`);
      return;
    }

    setBusy(true);
    try {
      const newAgentId = uid();
      const passwordHash = await hashPassword(password);

      // 1. Create Agent profile
      const agentData = {
        id: newAgentId,
        name: fullName.trim(),
        emp_id: empId.trim() || null,
        team_id: teamId || null,
        color: color
      };
      
      const agentSuccess = await db.addAgent(agentData);
      if (!agentSuccess) {
        throw new Error("Failed to create agent profile.");
      }

      // 2. Create User account and automatically link to the new agent profile
      const userData = {
        username: lowerUsername,
        display_name: fullName.trim(),
        role: role,
        agent_id: role === "agent" ? newAgentId : null,
        team_id: role === "admin" ? teamId : null,
        password_hash: passwordHash
      };

      const userSuccess = await db.addUser(userData);
      if (!userSuccess) {
        throw new Error("Failed to create user account.");
      }

      alert(`Success! Created Agent profile and linked User account for ${fullName.trim()}.`);
      
      // Clear form
      setFullName("");
      setEmpId("");
      setUsername("");
      setPassword("");
      setColor("cartoon");
    } catch (err) {
      alert(err.message || "An error occurred during account creation.");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) {
      alert("Please enter at least one name.");
      return;
    }
    if (!tempPassword.trim() || tempPassword.trim().length < 6) {
      alert("Please provide a temporary password of at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const lines = bulkText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const passwordHash = await hashPassword(tempPassword.trim());
      const created = [];

      for (const line of lines) {
        let name = line;
        let empIdVal = null;

        // Support formats: "David Miller, CSR024" or tab separated or just "David Miller"
        if (line.includes(",")) {
          const parts = line.split(",");
          name = parts[0].trim();
          empIdVal = parts.slice(1).join(",").trim() || null;
        } else if (line.includes("\t")) {
          const parts = line.split("\t");
          name = parts[0].trim();
          empIdVal = parts.slice(1).join("\t").trim() || null;
        }

        if (!name) continue;

        // Generate clean username from name
        let baseUser = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!baseUser) baseUser = "agent";
        let finalUser = baseUser;
        let counter = 1;

        while (
          db.users.some(u => u.username.toLowerCase() === finalUser.toLowerCase()) ||
          created.some(u => u.username.toLowerCase() === finalUser.toLowerCase())
        ) {
          finalUser = `${baseUser}${counter}`;
          counter++;
        }

        const newAgentId = uid();
        const randColor = "cartoon";

        // 1. Create agent profile
        const agentData = {
          id: newAgentId,
          name: name,
          emp_id: empIdVal,
          team_id: bulkTeamId || null,
          color: randColor
        };
        const agentSuccess = await db.addAgent(agentData);
        if (!agentSuccess) continue;

        // 2. Create user account
        const userData = {
          username: finalUser,
          display_name: name,
          role: bulkRole,
          agent_id: bulkRole === "agent" ? newAgentId : null,
          team_id: bulkRole === "admin" ? bulkTeamId : null,
          password_hash: passwordHash
        };
        const userSuccess = await db.addUser(userData);
        if (!userSuccess) continue;

        created.push({ name, username: finalUser });
      }

      alert(
        `Bulk Import Complete!\n\nSuccessfully created ${created.length} new users/agents.\n` +
        `Temporary password for all accounts is: "${tempPassword.trim()}"\n\n` +
        created.map(c => `• ${c.name} (username: ${c.username})`).join("\n")
      );
      setBulkText("");
    } catch (err) {
      alert(err.message || "An error occurred during bulk import.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">👥 Unified Member Creator</div>
      <div className="muted" style={{ marginBottom: 14 }}>
        Quickly provision team member profiles and their system login credentials in one go.
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid var(--border)", marginBottom: 18, gap: 12 }}>
        <button 
          className={`nav-btn ${activeTab === "single" ? "active" : ""}`} 
          style={{ padding: "8px 12px", borderBottomWidth: 2, background: "none" }}
          onClick={() => setActiveTab("single")}
          type="button"
        >
          👤 Single Member
        </button>
        <button 
          className={`nav-btn ${activeTab === "bulk" ? "active" : ""}`} 
          style={{ padding: "8px 12px", borderBottomWidth: 2, background: "none" }}
          onClick={() => setActiveTab("bulk")}
          type="button"
        >
          👥 Add Multiple Members
        </button>
      </div>

      {activeTab === "single" ? (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div>
              <label className="lbl">Full Name</label>
              <input 
                className="input" 
                value={fullName} 
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (!username) {
                    const suggested = e.target.value.toLowerCase().replace(/\s+/g, "");
                    setUsername(suggested);
                  }
                }} 
                placeholder="e.g. David Miller" 
                required 
              />
            </div>
            <div>
              <label className="lbl">Employee ID (Optional)</label>
              <input 
                className="input" 
                value={empId} 
                onChange={(e) => setEmpId(e.target.value)} 
                placeholder="e.g. CSR024" 
              />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="lbl">Team Assignment</label>
              <select 
                className="input" 
                disabled={!isSuper && !!myTeamId} 
                value={teamId} 
                onChange={(e) => setTeamId(e.target.value)}
              >
                <option value="">-- No Team --</option>
                {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.full_name || t.name})</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">System Role</label>
              <select 
                className="input" 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                disabled={!isSuper}
              >
                <option value="agent">Agent (Standard Scoreboard Access)</option>
                <option value="admin">Team Leader / Admin</option>
                <option value="super">Super Admin</option>
              </select>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div>
              <label className="lbl">Login Username</label>
              <input 
                className="input" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="e.g. davidm" 
                required 
              />
            </div>
            <div>
              <label className="lbl">Login Password</label>
              <input 
                className="input" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Min. 6 characters" 
                required 
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="lbl">Profile Accent Color</label>
            <div className="flex" style={{ flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {AGENT_COLORS.map((c) => (
                <div
                  key={c}
                  className={`swatch ${color === c ? "active" : ""}`}
                  style={{ background: c, width: 28, height: 28, borderRadius: "50%", cursor: "pointer" }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button type="submit" className="btn" disabled={busy || !fullName.trim() || !username.trim() || !password.trim()}>
              {busy ? "Creating Profile & Account..." : "👥 Save Member & Create Account"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit}>
          <div className="muted" style={{ marginBottom: 16, fontSize: 12.5 }}>
            Pasting multiple names is fast. Put one member per line. Optionally add an employee ID separated by a comma (e.g. <code>John Doe, CSR012</code>).
          </div>
          <div>
            <label className="lbl">Member List (one per line)</label>
            <textarea 
              className="input" 
              rows={6}
              style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: "1.4" }}
              value={bulkText} 
              onChange={(e) => setBulkText(e.target.value)} 
              placeholder={"David Miller, CSR024\nSarah Connor, CSR025\nJohn Doe"}
              required
            />
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div>
              <label className="lbl">Common Team Assignment</label>
              <select 
                className="input" 
                disabled={!isSuper && !!myTeamId} 
                value={bulkTeamId} 
                onChange={(e) => setBulkTeamId(e.target.value)}
              >
                <option value="">-- No Team --</option>
                {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.full_name || t.name})</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Common System Role</label>
              <select 
                className="input" 
                value={bulkRole} 
                onChange={(e) => setBulkRole(e.target.value)}
                disabled={!isSuper}
              >
                <option value="agent">Agent (Standard Scoreboard Access)</option>
                <option value="admin">Team Leader / Admin</option>
                <option value="super">Super Admin</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="lbl">🔑 One-Time Password (Common for all added users)</label>
            <input 
              className="input" 
              value={tempPassword} 
              onChange={(e) => setTempPassword(e.target.value)} 
              placeholder="e.g. Welcome@123" 
              required 
            />
            <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
              Makes onboarding extremely easy. Users can change this in their Settings tab after signing in.
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button type="submit" className="btn" disabled={busy || !bulkText.trim() || !tempPassword.trim()}>
              {busy ? "Importing Bulk Users..." : "👥 Add All Multiple Members Now"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Admin({ db, user, isSuper, onActAs }) {
  const [activeSection, setActiveSection] = useState("quick_add");

  // Team leaders only manage their own team's agents
  const myTeamId = user.team_id || null;
  const scopeAgents = isSuper || !myTeamId ? db.agents : db.agents.filter((a) => a.team_id === myTeamId);

  const sections = useMemo(() => [
    { id: "quick_add", label: "Add Member", component: <QuickAdd db={db} isSuper={isSuper} myTeamId={myTeamId} /> },
    ...(isSuper ? [{ id: "import", label: "Import members", component: <ImportMembers db={db} /> }] : []),
    { id: "points", label: "Weekly points", component: <PointsEntry db={db} agents={scopeAgents} /> },
    { id: "requests", label: `Approvals${db.pendingRequests.length ? ` (${db.pendingRequests.length})` : ""}`, component: <Approvals db={db} /> },
    { id: "badges", label: "Custom Badges", component: <CustomBadges db={db} isSuper={isSuper} /> },
    ...(isSuper ? [
      { id: "audit", label: "Audit Ledger", component: <AuditLedger db={db} /> }
    ] : []),
    { id: "gamification", label: "Quests & Kudos", component: <Gamification db={db} /> },
    { id: "announce", label: "Announcements", component: <Announce db={db} user={user} /> },
    { id: "members", label: "Members", component: <Members db={db} agents={scopeAgents} isSuper={isSuper} myTeamId={myTeamId} onActAs={onActAs} /> },
    ...(isSuper ? [
      { id: "teams", label: "Teams", component: <Teams db={db} /> }
    ] : []),
    { id: "metrics", label: "Point Options", component: <Metrics db={db} /> },
    { id: "wheel", label: "Wheel Prizes", component: <WheelPrizeManager db={db} /> },
    { id: "budget", label: "Budget", component: <Budget db={db} isSuper={isSuper} /> }
  ], [db, scopeAgents, isSuper, user]);

  useEffect(() => {
    const handleScroll = () => {
      let current = "quick_add";
      let minDistance = Infinity;
      sections.forEach((s) => {
        const el = document.getElementById(`admin-sec-${s.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top - 120);
          if (dist < minDistance && rect.top < window.innerHeight / 2) {
            minDistance = dist;
            current = s.id;
          }
        }
      });
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id) => {
    const el = document.getElementById(`admin-sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="admin-scroll-layout">
      {/* Sticky Table of Contents rail */}
      <div className="admin-toc-bar">
        <div className="admin-toc-inner">
          <span className="admin-toc-title">⚡ Control Panel</span>
          <div className="admin-toc-links">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`admin-toc-btn ${activeSection === s.id ? "active" : ""}`}
                onClick={() => scrollToSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Infinite Scroll Content Feed */}
      <div className="admin-sections-feed">
        {sections.map((s) => (
          <div key={s.id} id={`admin-sec-${s.id}`} className="admin-section-wrapper">
            <div className="admin-section-header">
              <h2>{s.label}</h2>
              <span className="admin-section-anchor">#{s.id}</span>
            </div>
            {s.component}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Weekly points entry ---------------- */

function PointsEntry({ db, agents }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const week = getWeekLabel(weekOffset);

  const entryFor = (agentId, metricId) =>
    db.weeklyEntries.find(
      (e) => e.agent_id === agentId && e.week_label === week && e.metric_id === metricId
    );

  const toggle = async (agent, metric) => {
    const existing = entryFor(agent.id, metric.id);
    await db.saveEntry(agent.id, week, metric.id, existing ? 0 : metric.pts);
  };

  const [adjusting, setAdjusting] = useState(null);

  return (
    <div className="card">
      <div className="spread">
        <div className="card-title" style={{ marginBottom: 0 }}>Points · {week}</div>
        <div className="flex">
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(weekOffset + 1)}>← Prev</button>
          <button className="btn btn-ghost btn-sm" disabled={weekOffset === 0} onClick={() => setWeekOffset(weekOffset - 1)}>Next →</button>
        </div>
      </div>
      <div className="mt" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Agent</th>
              {db.metrics.filter((m) => !String(m.id).startsWith("manual")).map((m) => (
                <th key={m.id} title={`${m.label} (+${m.pts})`} style={{ textAlign: "center" }}>{m.icon}</th>
              ))}
              <th style={{ textAlign: "right" }}>Week</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => {
              const weekTotal = db.weeklyEntries
                .filter((e) => e.agent_id === a.id && e.week_label === week)
                .reduce((s, e) => s + (Number(e.points) || 0), 0);
              return (
                <tr key={a.id}>
                  <td><div className="flex"><Avatar agent={a} size={26} /> {a.name}</div></td>
                  {db.metrics.filter((m) => !String(m.id).startsWith("manual")).map((m) => (
                    <td key={m.id} style={{ textAlign: "center" }}>
                      <MetricInput db={db} agentId={a.id} week={week} metric={m} />
                    </td>
                  ))}
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono'", color: "var(--accent)" }}>{weekTotal}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAdjusting(a)}>±</button>
                  </td>
                </tr>
              );
            })}
            {!agents.length && <tr><td colSpan={9} className="muted">No agents in your scope yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="muted mt">Type a point value directly in any category to award or adjust points. Press Enter or click away to save. Use "±" to apply an adjustment with a reason.</div>

      {adjusting && (
        <AdjustModal
          agent={adjusting}
          onClose={() => setAdjusting(null)}
          onSave={async (pts, reason) => {
            await db.adjustPoints(adjusting.id, pts, reason);
            setAdjusting(null);
          }}
        />
      )}
    </div>
  );
}

function AdjustModal({ agent, onClose, onSave }) {
  const [pts, setPts] = useState(10);
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Adjust · ${agent.name}`} onClose={onClose}>
      <label className="lbl">Points (negative to deduct)</label>
      <input className="input" type="number" value={pts} onChange={(e) => setPts(e.target.value)} />
      <label className="lbl">Reason</label>
      <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Exceptional call handled" />
      <div className="flex mt">
        <button className="btn" disabled={!reason.trim() || !Number(pts)} onClick={() => onSave(Number(pts), reason.trim())}>Apply</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ---------------- Redemption approvals ---------------- */

function Approvals({ db }) {
  return (
    <div className="card">
      <div className="card-title">Redemption requests</div>
      <table className="tbl">
        <thead>
          <tr><th>Agent</th><th>Prize</th><th>Cost</th><th>Date</th><th /></tr>
        </thead>
        <tbody>
          {db.requests
            .slice()
            .sort((a, b) => (a.status === "pending" ? -1 : 1))
            .map((r) => {
              const agent = db.agents.find((a) => a.id === r.agent_id);
              return (
                <tr key={r.id}>
                  <td>{agent?.name || "Unknown"}</td>
                  <td>{r.prize_name}</td>
                  <td>{r.cost} pts</td>
                  <td className="muted">{r.date}</td>
                  <td style={{ textAlign: "right" }}>
                    {r.status === "pending" ? (
                      <div className="flex" style={{ justifyContent: "flex-end" }}>
                        <button className="btn btn-sm" onClick={() => db.resolveRequest(r, true)}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => db.resolveRequest(r, false)}>Deny</button>
                      </div>
                    ) : (
                      <span className={`tag ${r.status === "approved" ? "ok" : "bad"}`}>{r.status}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          {!db.requests.length && <tr><td colSpan={5} className="muted">No requests yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Agents ---------------- */

function Members({ db, agents, isSuper, myTeamId, onActAs }) {
  const [editing, setEditing] = useState(null);
  const roleLabel = { super: "Super Admin", admin: "Team Leader", agent: "Agent" };
  const linkedUserFor = (agentId) => db.users.find((u) => u.agent_id === agentId);
  const staffOnly = db.users.filter((u) => !u.agent_id); // admins/supers with no agent profile

  return (
    <>
      <div className="card">
        <div className="spread">
          <div className="card-title" style={{ marginBottom: 0 }}>Members</div>
          <button className="btn btn-sm" onClick={() => setEditing("new")}>+ Add member</button>
        </div>
        <div className="muted" style={{ marginTop: 4, marginBottom: 4 }}>
          Each person's performance profile and login live together here now, no more flipping
          between two separate lists to manage one person.
        </div>
        <table className="tbl mt">
          <thead><tr><th>Member</th><th>Team</th><th>Total pts</th><th>Login</th><th /></tr></thead>
          <tbody>
            {agents.map((a) => {
              const u = linkedUserFor(a.id);
              return (
                <tr key={a.id}>
                  <td><div className="flex"><Avatar agent={a} size={26} /> {a.name}{a.emp_id && <span className="muted" style={{ marginLeft: 6 }}>({a.emp_id})</span>}</div></td>
                  <td className="muted">{db.teams.find((t) => t.id === a.team_id)?.name || "—"}</td>
                  <td style={{ fontFamily: "'JetBrains Mono'" }}>{db.agentTotalPts(a.id)}</td>
                  <td>
                    {u ? (
                      <span className="tag warn">{u.username} · {roleLabel[u.role] || u.role}</span>
                    ) : (
                      <span className="muted">No login yet</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="flex" style={{ justifyContent: "flex-end" }}>
                      {isSuper && u && onActAs && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--teal, #00c9a7)", borderColor: "rgba(0, 201, 167, 0.3)" }}
                          onClick={() => {
                            if (confirm(`Act as ${u.username} with full access? Everything you do will apply to their account until you exit.`)) {
                              onActAs(u, "full");
                            }
                          }}
                        >
                          👤 Act As
                        </button>
                      )}
                      {!isSuper && onActAs && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--teal, #00c9a7)", borderColor: "rgba(0, 201, 167, 0.3)" }}
                          title="View their dashboard exactly as they see it. Read-only, nothing you click here saves."
                          onClick={() => {
                            onActAs(
                              { id: `viewas-${a.id}`, username: a.name, display_name: a.name, role: "agent", agent_id: a.id, team_id: a.team_id },
                              "readonly"
                            );
                          }}
                        >
                          👁️ View as
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(a)}>Edit</button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => confirm(`Remove ${a.name}? Their points history stays in the database.`) && db.removeAgent(a.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isSuper && (
        <div className="card">
          <div className="spread">
            <div className="card-title" style={{ marginBottom: 0 }}>Staff accounts (no agent profile)</div>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing({ __staffUser: "new" })}>+ Add staff-only account</button>
          </div>
          <div className="muted" style={{ marginBottom: 10, marginTop: 4 }}>
            Logins that aren't tied to a performance profile, typically other Super Admins or Team
            Leaders who don't personally earn points.
          </div>
          {staffOnly.length > 0 ? (
          <table className="tbl">
            <thead><tr><th>Username</th><th>Role</th><th>Team</th><th /></tr></thead>
            <tbody>
              {staffOnly.map((u) => (
                <tr key={u.id}>
                  <td>{u.username} {u.display_name && <span className="muted">({u.display_name})</span>}</td>
                  <td><span className="tag warn">{roleLabel[u.role] || u.role}</span></td>
                  <td className="muted">{db.teams.find((t) => t.id === u.team_id)?.name || "All teams"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className="flex" style={{ justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ __staffUser: u })}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => confirm(`Delete user ${u.username}?`) && db.removeUser(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
            <div className="muted">None yet.</div>
          )}
        </div>
      )}

      {editing && editing.__staffUser && (
        <UserForm
          user={editing.__staffUser === "new" ? null : editing.__staffUser}
          agents={db.agents}
          teams={db.teams}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing.__staffUser === "new") await db.addUser(data);
            else await db.updateUser(editing.__staffUser.id, data);
            setEditing(null);
          }}
        />
      )}

      {editing && !editing.__staffUser && (
        <MemberForm
          agent={editing === "new" ? null : editing}
          linkedUser={editing === "new" ? null : linkedUserFor(editing.id)}
          teams={db.teams}
          lockTeam={!isSuper ? myTeamId : null}
          onClose={() => setEditing(null)}
          onSaveAgent={async (data) => {
            if (editing === "new") {
              const newId = uid();
              await db.addAgent({ id: newId, ...data });
              return { id: newId };
            }
            await db.updateAgent(editing.id, data);
            return editing;
          }}
          onSaveLogin={async (agentId, agentName, loginData) => {
            const existing = linkedUserFor(agentId);
            if (existing) {
              await db.updateUser(existing.id, loginData);
            } else if (loginData.username) {
              await db.addUser({ ...loginData, role: "agent", agent_id: agentId, display_name: agentName });
            }
          }}
          onDone={() => setEditing(null)}
        />
      )}
    </>
  );
}

function MemberForm({ agent, linkedUser, teams, lockTeam, onClose, onSaveAgent, onSaveLogin, onDone }) {
  const [form, setForm] = useState({
    name: agent?.name || "",
    emp_id: agent?.emp_id || "",
    team_id: agent?.team_id || lockTeam || teams[0]?.id || "",
    color: agent?.color || "cartoon"
  });
  const [username, setUsername] = useState(linkedUser?.username || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.team_id) return;
    setSaving(true);
    const savedAgent = await onSaveAgent({ ...form, name: form.name.trim() });
    const agentId = agent ? agent.id : savedAgent?.id;
    if (agentId && (username.trim() || password)) {
      const loginData = { username: username.trim() };
      if (password) loginData.password_hash = await hashPassword(password);
      if (!linkedUser && !password) {
        alert("Set a password to create a new login for this member.");
      } else {
        await onSaveLogin(agentId, form.name.trim(), loginData);
      }
    }
    setSaving(false);
    onDone();
  };

  return (
    <Modal title={agent ? "Edit member" : "Add member"} onClose={onClose}>
      <label className="lbl">Full name</label>
      <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <div className="form-row">
        <div>
          <label className="lbl">Employee ID</label>
          <input className="input" value={form.emp_id} onChange={(e) => setForm({ ...form, emp_id: e.target.value })} />
        </div>
        <div>
          <label className="lbl">Team</label>
          <select className="input" disabled={!!lockTeam} value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <label className="lbl">Colour (only used if not on a cartoon avatar)</label>
      <div className="flex" style={{ flexWrap: "wrap" }}>
        {AGENT_COLORS.map((c) => (
          <div
            key={c}
            className={`swatch ${form.color === c ? "active" : ""}`}
            style={{ background: c }}
            onClick={() => setForm({ ...form, color: c })}
          />
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginTop: 18, paddingTop: 14 }}>
        <div className="muted" style={{ marginBottom: 10, fontSize: 12 }}>
          {linkedUser
            ? "This member already has a login. Change their username or set a new password below."
            : "Give this member a login now, or leave both blank and add one later."}
        </div>
        <label className="lbl">Username</label>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="optional" />
        <label className="lbl">{linkedUser ? "New password (blank = unchanged)" : "Password"}</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="optional" />
      </div>

      <div className="flex mt">
        <button className="btn" disabled={saving || !form.name.trim() || !form.team_id} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ---------------- Budget ---------------- */

function Budget({ db, isSuper }) {
  const b = db.currentBudget;
  const history = [...db.budgetHistory].sort((x, y) => (x.month < y.month ? 1 : -1));
  return (
    <div className="card">
      <div className="card-title">💰 Budget · {b.month}</div>
      <div className="grid grid-4">
        <Stat num={`R${b.allocated}`} label="Allocated" />
        <Stat num={`R${b.carryover}`} label="Carryover" />
        <Stat num={`R${b.spend}`} label="Spent" />
        <Stat num={`R${b.remaining}`} label="Remaining" />
      </div>
      {isSuper && (
        <div className="flex mt">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const val = prompt("Set this month's allocation (ZAR):", String(b.allocated || MONTHLY_BUDGET));
              if (val != null && !isNaN(Number(val))) db.setBudgetRow({ allocated: Number(val) });
            }}
          >
            Edit allocation
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const val = prompt("Set this month's carryover (ZAR):", String(b.carryover));
              if (val != null && !isNaN(Number(val))) db.setBudgetRow({ carryover: Number(val) });
            }}
          >
            Edit carryover
          </button>
        </div>
      )}
      <div className="card-title mt">History</div>
      <table className="tbl">
        <thead><tr><th>Month</th><th>Allocated</th><th>Carryover</th><th>Spend</th><th>Remaining</th></tr></thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td>{h.month}</td>
              <td>R{Number(h.allocated) || 0}</td>
              <td>R{Number(h.carryover) || 0}</td>
              <td>R{Number(h.spend) || 0}</td>
              <td style={{ fontFamily: "'JetBrains Mono'" }}>
                R{(Number(h.allocated) || 0) + (Number(h.carryover) || 0) - (Number(h.spend) || 0)}
              </td>
            </tr>
          ))}
          {!history.length && <tr><td colSpan={5} className="muted">No budget history yet. It starts when the first prize is approved.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Teams (super only) ---------------- */

function Teams({ db }) {
  const [editing, setEditing] = useState(null);
  return (
    <div className="card">
      <div className="spread">
        <div className="card-title" style={{ marginBottom: 0 }}>Teams</div>
        <button className="btn btn-sm" onClick={() => setEditing("new")}>+ Add team</button>
      </div>
      <table className="tbl mt">
        <thead><tr><th>Team</th><th>Full name</th><th>Agents</th><th /></tr></thead>
        <tbody>
          {db.teams.map((t) => (
            <tr key={t.id}>
              <td><span className="pill" style={{ background: t.color || "var(--navy3)", color: "#fff" }}>{t.name}</span></td>
              <td className="muted">{t.full_name || "—"}</td>
              <td>{db.agents.filter((a) => a.team_id === t.id).length}</td>
              <td style={{ textAlign: "right" }}>
                <div className="flex" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(t)}>Edit</button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => confirm(`Delete team ${t.name}? Agents must be moved first.`) && db.removeTeam(t.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <Modal title={editing === "new" ? "Add team" : "Edit team"} onClose={() => setEditing(null)}>
          <TeamForm
            team={editing === "new" ? null : editing}
            onSave={async (data) => {
              if (editing === "new") await db.addTeam(data);
              else await db.updateTeam(editing.id, data);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function TeamForm({ team, onSave }) {
  const [form, setForm] = useState({
    name: team?.name || "",
    full_name: team?.full_name || "",
    color: team?.color || "#3498DB"
  });
  return (
    <>
      <label className="lbl">Short name (e.g. CSR)</label>
      <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label className="lbl">Full name</label>
      <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <label className="lbl">Colour</label>
      <div className="flex" style={{ flexWrap: "wrap" }}>
        {AGENT_COLORS.map((c) => (
          <div key={c} className={`swatch ${form.color === c ? "active" : ""}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
        ))}
      </div>
      <div className="mt">
        <button className="btn" disabled={!form.name.trim()} onClick={() => onSave({ ...form, name: form.name.trim() })}>Save</button>
      </div>
    </>
  );
}

/* ---------------- Staff-only accounts are edited via UserForm below,
   invoked directly from Members for people with no agent profile. ---------------- */

function UserForm({ user, agents, teams, onClose, onSave }) {
  const [form, setForm] = useState({
    username: user?.username || "",
    display_name: user?.display_name || "",
    role: user?.role || "agent",
    agent_id: user?.agent_id || "",
    team_id: user?.team_id || "",
    password: ""
  });
  const save = async () => {
    const data = {
      username: form.username.trim(),
      display_name: form.display_name.trim() || null,
      role: form.role,
      agent_id: form.role === "agent" ? form.agent_id || null : null,
      team_id: form.role === "admin" ? form.team_id || null : null
    };
    if (form.password) data.password_hash = await hashPassword(form.password);
    if (!user && !form.password) return alert("New users need a password.");
    onSave(data);
  };
  return (
    <Modal title={user ? "Edit user" : "Add user"} onClose={onClose}>
      <div className="form-row">
        <div>
          <label className="lbl">Username</label>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </div>
        <div>
          <label className="lbl">Display name</label>
          <input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </div>
      </div>
      <label className="lbl">Role</label>
      <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
        <option value="agent">Agent</option>
        <option value="admin">Team Leader (Admin)</option>
        <option value="super">Super Admin</option>
      </select>
      {form.role === "agent" && (
        <>
          <label className="lbl">Link to agent profile</label>
          <SearchableMemberSelect 
            agents={agents}
            teams={teams}
            selectedIds={form.agent_id ? [form.agent_id] : []}
            onChange={(ids) => setForm({ ...form, agent_id: ids[0] || "" })}
            placeholder="Search and link agent profile..."
            multiple={false}
          />
        </>
      )}
      {form.role === "admin" && (
        <>
          <label className="lbl">Team scope</label>
          <select className="input" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
            <option value="">All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </>
      )}
      <label className="lbl">{user ? "New password (blank = unchanged)" : "Password"}</label>
      <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <div className="flex mt">
        <button className="btn" disabled={!form.username.trim()} onClick={save}>Save</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ---------------- Announcements (super only) ---------------- */

function Announce({ db, user }) {
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(7);
  return (
    <div className="card">
      <div className="card-title">📢 Announcements</div>
      <label className="lbl">Message</label>
      <textarea className="input" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. New prizes just dropped!" />
      <label className="lbl">Show for (days)</label>
      <input className="input" type="number" style={{ maxWidth: 120 }} value={days} onChange={(e) => setDays(e.target.value)} />
      <div className="mt">
        <button
          className="btn"
          disabled={!message.trim()}
          onClick={async () => {
            await db.postAnnouncement(message.trim(), user.display_name || user.username, Number(days) || null);
            setMessage("");
          }}
        >
          Post
        </button>
      </div>
      <div className="card-title mt">Active</div>
      {db.activeAnnouncements.map((a) => (
        <div key={a.id} className="lb-row">
          <div className="lb-name">{a.message} <span className="muted">— {a.created_by}</span></div>
          <button className="btn btn-ghost btn-sm" onClick={() => db.dismissAnnouncement(a.id)}>Hide</button>
        </div>
      ))}
      {!db.activeAnnouncements.length && <div className="muted">None active.</div>}
    </div>
  );
}

/* ---------------- Point Options / Metrics (super only) ---------------- */
function Metrics({ db }) {
  const [editing, setEditing] = useState(null);

  return (
    <div className="card">
      <div className="spread">
        <div className="card-title" style={{ marginBottom: 0 }}>🎯 Point Options (Metrics Manager)</div>
        <button className="btn btn-sm" onClick={() => setEditing("new")}>+ Add Point Option</button>
      </div>
      <div className="muted mt">
        Configure operational targets and point values. The agents' weekly score is calculated from these.
      </div>
      <table className="tbl mt">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Metric Label</th>
            <th>Description</th>
            <th>Value</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {db.metrics.map((m) => (
            <tr key={m.id}>
              <td style={{ fontSize: 20 }}>{m.icon}</td>
              <td><strong>{m.label}</strong> <span className="muted">({m.id})</span></td>
              <td className="muted">{m.description || "—"}</td>
              <td style={{ fontFamily: "'JetBrains Mono'", color: "var(--accent)", fontWeight: "bold" }}>+{m.pts} pts</td>
              <td style={{ textAlign: "right" }}>
                <div className="flex" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(m)}>Edit</button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => confirm(`Are you sure you want to delete metric "${m.label}"? Any existing scores for this metric will lose their label but remain in the audit ledger database.`) && db.removeMetric(m.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <MetricForm
          metric={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing === "new") {
              const slug = data.label.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16) + "_" + Math.floor(Math.random() * 100);
              await db.addMetric({ id: slug, ...data });
            } else {
              await db.updateMetric(editing.id, data);
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function MetricForm({ metric, onClose, onSave }) {
  const [form, setForm] = useState({
    label: metric?.label || "",
    pts: metric?.pts ?? 20,
    icon: metric?.icon || "🎯",
    description: metric?.description || ""
  });

  return (
    <Modal title={metric ? "Edit Point Option" : "Add Point Option"} onClose={onClose}>
      <label className="lbl">Metric Label (e.g. Schedule Adherence)</label>
      <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
      
      <div className="form-row">
        <div>
          <label className="lbl">Points Value</label>
          <input className="input" type="number" value={form.pts} onChange={(e) => setForm({ ...form, pts: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="lbl">Icon (emoji)</label>
          <input className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        </div>
      </div>

      <label className="lbl">Description</label>
      <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Target or criteria for earning this point option" />

      <div className="flex mt">
        <button className="btn" disabled={!form.label.trim()} onClick={() => onSave(form)}>Save</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ---------------- Gamification & Quests (super only) ---------------- */
function Gamification({ db }) {
  const [editingQuest, setEditingQuest] = useState(null);

  return (
    <div className="card">
      {/* Team Quests Panel */}
      <div className="spread">
        <div className="card-title" style={{ marginBottom: 0 }}>⚔️ Team Quests Manager</div>
        <button className="btn btn-sm" onClick={() => setEditingQuest("new")}>+ Create Quest</button>
      </div>
      <div className="muted mt">
        Quests require cooperative efforts across agents. Set target points or resolutions to complete.
      </div>
      <table className="tbl mt">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Target Value</th>
            <th>Team Scope</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {db.quests.map((q) => (
            <tr key={q.id}>
              <td>
                <strong>{q.title}</strong>
                <div className="muted" style={{ fontSize: 11 }}>{q.description}</div>
              </td>
              <td><span className="pill">{q.target_type === "total_points" ? "Total Weekly Points" : "Resolution Scored Count"}</span></td>
              <td style={{ fontFamily: "'JetBrains Mono'" }}>{q.target_value}</td>
              <td className="muted">
                {q.team_id ? db.teams.find(t => t.id === q.team_id)?.name : "Office-Wide"}
              </td>
              <td>
                <span className={`tag ${q.active ? "ok" : "bad"}`}>{q.active ? "Active" : "Inactive"}</span>
              </td>
              <td style={{ textAlign: "right" }}>
                <div className="flex" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingQuest(q)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => confirm(`Delete quest "${q.title}"?`) && db.removeQuest(q.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!db.quests.length && <tr><td colSpan={6} className="muted">No quests created yet.</td></tr>}
        </tbody>
      </table>

      {/* Kudos Wall Moderation Section */}
      <div className="card-title mt" style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 10 }}>
        💬 Kudos Wall Moderation
      </div>
      <div className="muted">
        Super admins can monitor or remove post entries from the live Kudos celebration board.
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 12, border: "1px solid var(--border)", borderRadius: 10, padding: 8 }}>
        <table className="tbl">
          <thead>
            <tr><th>From</th><th>To</th><th>Message</th><th /></tr>
          </thead>
          <tbody>
            {db.kudos.map((k) => (
              <tr key={k.id}>
                <td>{k.sender_name}</td>
                <td>{k.receiver_name}</td>
                <td className="muted">"{k.message}" {k.emoji}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-danger btn-sm" onClick={() => confirm("Delete this kudos post?") && db.removeKudos(k.id)}>✕</button>
                </td>
              </tr>
            ))}
            {!db.kudos.length && <tr><td colSpan={4} className="muted">No kudos posted yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editingQuest && (
        <QuestForm
          quest={editingQuest === "new" ? null : editingQuest}
          teams={db.teams}
          onClose={() => setEditingQuest(null)}
          onSave={async (data) => {
            if (editingQuest === "new") {
              await db.addQuest(data);
            } else {
              await db.updateQuest(editingQuest.id, data);
            }
            setEditingQuest(null);
          }}
        />
      )}
    </div>
  );
}

function QuestForm({ quest, teams, onClose, onSave }) {
  const [form, setForm] = useState({
    title: quest?.title || "",
    description: quest?.description || "",
    target_type: quest?.target_type || "total_points",
    target_value: quest?.target_value ?? 1000,
    team_id: quest?.team_id || "",
    active: quest?.active ?? true
  });

  return (
    <Modal title={quest ? "Edit Team Quest" : "Create Team Quest"} onClose={onClose}>
      <label className="lbl">Quest Title</label>
      <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. CSR Champions" />

      <label className="lbl">Quest Objective Description</label>
      <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. CSR team scores 500 points this week collectively" />

      <div className="form-row">
        <div>
          <label className="lbl">Target Metric Type</label>
          <select className="input" value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })}>
            <option value="total_points">Weekly Total Points</option>
            <option value="metrics_count">Operational Target Scored Count</option>
          </select>
        </div>
        <div>
          <label className="lbl">Target Numeric Goal</label>
          <input className="input" type="number" min="1" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: Math.max(1, Number(e.target.value) || 1) })} />
        </div>
      </div>

      <div className="form-row">
        <div>
          <label className="lbl">Team Scope (optional)</label>
          <select className="input" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value || null })}>
            <option value="">Office-Wide (All Teams)</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", paddingTop: 26 }}>
          <label className="lbl" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Quest is Active
          </label>
        </div>
      </div>

      <div className="flex mt">
        <button className="btn" disabled={!form.title.trim()} onClick={() => onSave(form)}>Save Quest</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ---------------- Custom Badges Section ---------------- */
function CustomBadges({ db, isSuper }) {
  const [editingBadge, setEditingBadge] = useState(null);
  const [assigningBadge, setAssigningBadge] = useState(null);

  // Assignment states
  const [assignTargetType, setAssignTargetType] = useState("agent"); // "agent" or "team"
  const [assignTargetId, setAssignTargetId] = useState("");
  const [assignTargetIds, setAssignTargetIds] = useState([]); // Multiple agents selection

  const handleAssign = async (e) => {
    e.preventDefault();
    if (assignTargetType === "agent") {
      if (assignTargetIds.length === 0) {
        alert("Please select at least one agent.");
        return;
      }
      for (const id of assignTargetIds) {
        const exists = (db.assignedBadges || []).some(
          a => a.badge_id === assigningBadge.id && a.target_type === "agent" && a.target_id === id
        );
        if (!exists) {
          await db.assignBadge(assigningBadge.id, "agent", id);
        }
      }
      setAssignTargetIds([]);
      setAssigningBadge(null);
      alert("Badge successfully assigned!");
    } else {
      if (!assignTargetId) {
        alert("Please select a team.");
        return;
      }
      const exists = (db.assignedBadges || []).some(
        a => a.badge_id === assigningBadge.id && a.target_type === "team" && a.target_id === assignTargetId
      );
      if (exists) {
        alert("This badge is already assigned to this target.");
        return;
      }
      await db.assignBadge(assigningBadge.id, "team", assignTargetId);
      setAssignTargetId("");
      setAssigningBadge(null);
      alert("Badge successfully assigned!");
    }
  };

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="card-title" style={{ marginBottom: 4 }}>🎖️ Custom Badges & Honors</div>
          <div className="muted">
            Create custom corporate honors with unique color gradients and assign them to teams or individual team members.
          </div>
        </div>
        <button className="btn" onClick={() => setEditingBadge("new")}>
          ➕ Create Custom Badge
        </button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {(db.customBadges || []).map((b) => {
          const bgGradient = `linear-gradient(${b.gradient_angle || '135deg'}, ${b.gradient_from || '#f5c842'}, ${b.gradient_to || '#00c9a7'})`;
          return (
            <div 
              key={b.id} 
              className="badge-tile"
              style={{
                position: "relative",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--navy3)",
                textAlign: "left",
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
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
              
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 28, textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>{b.icon || "🎖️"}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-sm btn-ghost" style={{ padding: "3px 6px", fontSize: 11 }} onClick={() => setEditingBadge(b)}>✏️</button>
                    <button className="btn btn-sm btn-danger" style={{ padding: "3px 6px", fontSize: 11 }} onClick={() => confirm(`Delete custom badge "${b.name}"?`) && db.removeCustomBadge(b.id)}>✕</button>
                  </div>
                </div>
                <div style={{ fontWeight: "700", fontSize: 14, color: "var(--text)" }}>{b.name}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.3 }}>{b.desc}</div>
              </div>

              <div style={{ marginTop: 16 }}>
                <button 
                  className="btn btn-sm btn-ghost" 
                  style={{ width: "100%", justifyContent: "center", display: "flex", gap: 4 }} 
                  onClick={() => {
                    setAssigningBadge(b);
                    setAssignTargetId("");
                  }}
                >
                  🤝 Assign Badge
                </button>
              </div>
            </div>
          );
        })}
        {!(db.customBadges || []).length && (
          <div className="muted" style={{ gridColumn: "span 3", textAlign: "center", padding: "24px 0" }}>
            No custom badges created yet. Create your first corporate honor above!
          </div>
        )}
      </div>

      {/* Active Assignments table */}
      <div className="card-title mt" style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 12 }}>
        🤝 Active Assignments & Honors
      </div>
      <div style={{ maxHeight: 250, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Badge</th>
              <th>Recipient Type</th>
              <th>Target Recipient</th>
              <th>Assigned At</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(db.assignedBadges || []).map((ab) => {
              const badge = (db.customBadges || []).find(b => b.id === ab.badge_id);
              if (!badge) return null;
              
              let recipientName = "Unknown";
              if (ab.target_type === "agent") {
                const agent = db.agents.find(a => a.id === ab.target_id);
                recipientName = agent ? `👤 ${agent.name}` : `👤 (Agent deleted)`;
              } else {
                const team = db.teams.find(t => t.id === ab.target_id);
                recipientName = team ? `🛡️ Team ${team.name}` : `🛡️ (Team deleted)`;
              }

              return (
                <tr key={ab.id}>
                  <td>
                    <div className="flex" style={{ gap: 6 }}>
                      <span>{badge.icon}</span>
                      <strong style={{ color: badge.gradient_from }}>{badge.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="pill" style={{ textTransform: "capitalize", fontSize: 11 }}>{ab.target_type}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{recipientName}</span>
                  </td>
                  <td className="muted">
                    {ab.assigned_at ? new Date(ab.assigned_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button 
                      className="btn btn-sm btn-danger" 
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={() => confirm(`Revoke badge "${badge.name}" from ${recipientName}?`) && db.unassignBadge(badge.id, ab.target_type, ab.target_id)}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              );
            })}
            {!(db.assignedBadges || []).length && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
                  No badges currently assigned to any team or agent.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Badge creation dialog modal */}
      {editingBadge && (
        <BadgeForm
          badge={editingBadge === "new" ? null : editingBadge}
          onClose={() => setEditingBadge(null)}
          onSave={async (data) => {
            if (editingBadge === "new") {
              await db.addCustomBadge(data);
            } else {
              await db.updateCustomBadge(editingBadge.id, data);
            }
            setEditingBadge(null);
          }}
        />
      )}

      {/* Badge assignment dialog modal */}
      {assigningBadge && (
        <Modal title={`Assign Honor: ${assigningBadge.name}`} onClose={() => setAssigningBadge(null)}>
          <form onSubmit={handleAssign}>
            <label className="lbl">Recipient Scope</label>
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <label className="flex" style={{ gap: 6, cursor: "pointer" }}>
                <input 
                  type="radio" 
                  name="targetType" 
                  checked={assignTargetType === "agent"} 
                  onChange={() => {
                    setAssignTargetType("agent");
                    setAssignTargetId("");
                  }} 
                  style={{ accentColor: "var(--accent)" }}
                />
                👤 Individual Agent
              </label>
              <label className="flex" style={{ gap: 6, cursor: "pointer" }}>
                <input 
                  type="radio" 
                  name="targetType" 
                  checked={assignTargetType === "team"} 
                  onChange={() => {
                    setAssignTargetType("team");
                    setAssignTargetId("");
                  }} 
                  style={{ accentColor: "var(--accent)" }}
                />
                🛡️ Entire Team
              </label>
            </div>

            <label className="lbl">Select Recipient</label>
            {assignTargetType === "agent" ? (
              <SearchableMemberSelect 
                agents={db.agents}
                teams={db.teams}
                selectedIds={assignTargetIds}
                onChange={setAssignTargetIds}
                placeholder="Search and select agent(s)..."
                multiple={true}
              />
            ) : (
              <select className="input" value={assignTargetId} onChange={(e) => setAssignTargetId(e.target.value)} required>
                <option value="">-- Choose Team --</option>
                {db.teams.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name || t.name}</option>
                ))}
              </select>
            )}

            <div className="flex mt" style={{ marginTop: 24 }}>
              <button type="submit" className="btn">Assign Badge</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAssigningBadge(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function BadgeForm({ badge, onClose, onSave }) {
  const [form, setForm] = useState({
    name: badge?.name || "",
    desc: badge?.desc || "",
    icon: badge?.icon || "🏆",
    gradient_from: badge?.gradient_from || "#f1c40f",
    gradient_to: badge?.gradient_to || "#e67e22",
    gradient_angle: badge?.gradient_angle || "135deg"
  });

  return (
    <Modal title={badge ? "Edit Custom Honor Badge" : "Create Corporate Honor Badge"} onClose={onClose}>
      <label className="lbl">Badge Name</label>
      <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CSR Champion" required />

      <label className="lbl">Description / Reason</label>
      <input className="input" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="e.g. Awarded for pristine adherence scores" required />

      <div className="form-row">
        <div>
          <label className="lbl">Badge Emoji Icon</label>
          <select className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
            <option value="🏆">🏆 Trophy</option>
            <option value="👑">👑 Crown</option>
            <option value="⚡">⚡ Lightning Bolt</option>
            <option value="🌟">🌟 Star</option>
            <option value="🔥">🔥 Fire</option>
            <option value="🛡️">🛡️ Shield</option>
            <option value="🏅">🏅 Medal</option>
            <option value="🚀">🚀 Rocket</option>
            <option value="💎">💎 Diamond</option>
            <option value="🎯">🎯 Target</option>
            <option value="🙌">🙌 High Five</option>
          </select>
        </div>
        <div>
          <label className="lbl">Gradient Angle</label>
          <select className="input" value={form.gradient_angle} onChange={(e) => setForm({ ...form, gradient_angle: e.target.value })}>
            <option value="45deg">45° Diagonal Up</option>
            <option value="90deg">90° Horizontal</option>
            <option value="135deg">135° Diagonal Down</option>
            <option value="180deg">180° Vertical</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div>
          <label className="lbl">Gradient Start Color</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="color" value={form.gradient_from} onChange={(e) => setForm({ ...form, gradient_from: e.target.value })} style={{ width: 42, height: 40, padding: 0, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }} />
            <input type="text" className="input" value={form.gradient_from} onChange={(e) => setForm({ ...form, gradient_from: e.target.value })} style={{ fontFamily: "'JetBrains Mono'", fontSize: 13 }} />
          </div>
        </div>
        <div>
          <label className="lbl">Gradient End Color</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="color" value={form.gradient_to} onChange={(e) => setForm({ ...form, gradient_to: e.target.value })} style={{ width: 42, height: 40, padding: 0, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }} />
            <input type="text" className="input" value={form.gradient_to} onChange={(e) => setForm({ ...form, gradient_to: e.target.value })} style={{ fontFamily: "'JetBrains Mono'", fontSize: 13 }} />
          </div>
        </div>
      </div>

      <label className="lbl">Live Design Preview</label>
      <div 
        style={{ 
          background: "var(--navy3)", 
          border: "1px solid var(--border)", 
          borderRadius: 12, 
          padding: 20, 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          marginTop: 6
        }}
      >
        <div 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "4px",
            background: `linear-gradient(${form.gradient_angle}, ${form.gradient_from}, ${form.gradient_to})`
          }}
        />
        <div style={{ fontSize: 36, marginBottom: 8, textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>{form.icon}</div>
        <div style={{ fontWeight: "bold", fontSize: 15, color: form.gradient_from }}>{form.name || "Badge Name"}</div>
        <div className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 4, maxWidth: "80%" }}>{form.desc || "Badge Description / Objective"}</div>
      </div>

      <div className="flex mt" style={{ marginTop: 24 }}>
        <button className="btn" disabled={!form.name.trim() || !form.desc.trim()} onClick={() => onSave(form)}>Save Badge</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function WheelPrizeManager({ db }) {
  const [prizes, setPrizes] = useState(() => {
    try {
      const stored = localStorage.getItem("db_wheel_prizes");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Could not load wheel prizes in admin:", e);
    }
    return [
      { label: "+10 Pts", pts: 10, name: "10 Bonus Points" },
      { label: "+25 Pts", pts: 25, name: "25 Bonus Points" },
      { label: "Jackpot 💎", pts: 100, name: "100 Points Mega Jackpot!" },
      { label: "Coffee ☕", pts: 0, name: "Free Coffee Voucher" },
      { label: "+50 Pts 💰", pts: 50, name: "50 Points (Refund)" },
      { label: "Try Again 🍀", pts: 0, name: "Better Luck Next Time!" }
    ];
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ label: "", pts: 0, name: "" });

  const saveAll = (updated) => {
    setPrizes(updated);
    localStorage.setItem("db_wheel_prizes", JSON.stringify(updated));
  };

  const handleEdit = (idx) => {
    setEditingIndex(idx);
    setForm(prizes[idx]);
  };

  const handleSave = () => {
    const updated = [...prizes];
    updated[editingIndex] = form;
    saveAll(updated);
    setEditingIndex(null);
  };

  return (
    <div className="card">
      <div className="card-title">🎡 Wheel of Fortune Prize Manager</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Customise the 6 segments of the fortune spin wheel. Note: For 0-point outcomes like coffee vouchers, you can award them with a custom description, and they will be recorded in the audit ledger.
      </div>
      <div className="grid grid-3" style={{ gap: 12 }}>
        {prizes.map((p, idx) => (
          <div key={idx} className="prize-tile" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", background: "var(--navy3)", padding: 16, border: "1px solid var(--border)", borderRadius: 12 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="pill" style={{ fontSize: 11, background: "rgba(255,255,255,0.05)" }}>Segment {idx + 1}</span>
                <button className="btn btn-sm btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => handleEdit(idx)}>Edit</button>
              </div>
              <div style={{ fontSize: 18, fontWeight: "bold", margin: "8px 0 4px", color: "var(--accent)" }}>{p.label}</div>
              <div className="muted" style={{ fontSize: 12 }}>{p.name}</div>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'JetBrains Mono'", color: p.pts > 0 ? "var(--teal)" : "var(--muted)", fontWeight: "bold" }}>
              Value: {p.pts} pts
            </div>
          </div>
        ))}
      </div>

      {editingIndex !== null && (
        <Modal title={`Edit Segment ${editingIndex + 1}`} onClose={() => setEditingIndex(null)}>
          <label className="lbl">Segment Text (Label on the wheel)</label>
          <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. +10 Pts" />

          <label className="lbl">Prize Full Name (Displayed when won)</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 10 Bonus Points" />

          <label className="lbl">Points Value (0 for non-point rewards)</label>
          <input className="input" type="number" value={form.pts} onChange={(e) => setForm({ ...form, pts: Number(e.target.value) || 0 })} />

          <div className="flex mt">
            <button className="btn" disabled={!form.label.trim() || !form.name.trim()} onClick={handleSave}>Save Changes</button>
            <button className="btn btn-ghost" onClick={() => setEditingIndex(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
