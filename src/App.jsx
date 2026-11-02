import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_BRAND } from "./config.js";
import { supabase, friendlyError } from "./supabase.js";
import { makeCSS } from "./theme.js";
import { hashPassword, store } from "./lib/helpers.js";
import { useData } from "./lib/useData.js";
import Dashboard from "./components/Dashboard.jsx";
import Kudos from "./components/Kudos.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import Prizes from "./components/Prizes.jsx";
import Admin from "./components/Admin.jsx";
import Settings from "./components/Settings.jsx";
import Drive, { defaultDriveMonth } from "./components/Drive.jsx";
import { DRIVE_MONTHS, mergeRules, metricPoints, monthResults } from "./lib/drive.js";
import { Bell } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(() => store.get("session", null));

  // ---- "Act As" (impersonation) ----
  // viewingAs holds the person currently being viewed/acted-as, separate
  // from the real logged-in `user`, so the real account is never lost.
  // mode "full"    - Super Admin, full access, behaves exactly as that login.
  // mode "readonly" - Team Leader, dashboard preview only, cannot write.
  const [viewingAs, setViewingAs] = useState(null); // { user, mode } | null
  const startActingAs = (targetUser, mode) => setViewingAs({ user: targetUser, mode });
  const stopActingAs = () => setViewingAs(null);
  const effectiveUser = viewingAs ? viewingAs.user : user;

  // ---- personal appearance settings ----
  // Namespaced per logged-in user (by id) so a shared computer never lets
  // one person's theme/font choice leak into the next person's session.
  const apKey = (base) => (user ? `${base}:${user.id}` : base);

  const [theme, setThemeState] = useState(() => store.get(apKey("theme"), "navy_gold"));
  const setTheme = (t) => { setThemeState(t); store.set(apKey("theme"), t); };

  const [font, setFontState] = useState(() => store.get(apKey("font"), "DM Sans"));
  const setFont = (f) => { setFontState(f); store.set(apKey("font"), f); };

  const [glassActive, setGlassState] = useState(() => store.get(apKey("glassActive"), false));
  const setGlassActive = (g) => { setGlassState(g); store.set(apKey("glassActive"), g); };

  const [glassTint, setGlassTintState] = useState(() => store.get(apKey("glassTint"), "tinted"));
  const setGlassTint = (t) => { setGlassTintState(t); store.set(apKey("glassTint"), t); };

  const [userAccent, setUserAccentState] = useState(() => store.get(apKey("userAccent"), ""));
  const setUserAccent = (color) => { setUserAccentState(color); store.set(apKey("userAccent"), color); };

  const [userAccent2, setUserAccent2State] = useState(() => store.get(apKey("userAccent2"), ""));
  const setUserAccent2 = (color) => { setUserAccent2State(color); store.set(apKey("userAccent2"), color); };

  // Whenever the logged-in user changes (login, logout, or switching accounts
  // on the same browser), reload each person's own saved preferences instead
  // of carrying over whatever was on screen for the previous person.
  useEffect(() => {
    setThemeState(store.get(apKey("theme"), "navy_gold"));
    setFontState(store.get(apKey("font"), "DM Sans"));
    setGlassState(store.get(apKey("glassActive"), false));
    setGlassTintState(store.get(apKey("glassTint"), "tinted"));
    setUserAccentState(store.get(apKey("userAccent"), ""));
    setUserAccent2State(store.get(apKey("userAccent2"), ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [customThemes, setCustomThemesState] = useState(() => {
    try {
      const stored = localStorage.getItem(apKey("db_custom_themes"));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const setCustomThemes = (updated) => {
    setCustomThemesState(updated);
    localStorage.setItem(apKey("db_custom_themes"), JSON.stringify(updated));
  };
  useEffect(() => {
    try {
      const stored = localStorage.getItem(apKey("db_custom_themes"));
      setCustomThemesState(stored ? JSON.parse(stored) : []);
    } catch {
      setCustomThemesState([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ---- dynamic branding (super admin can rename the app in Settings) ----
  const [brand, setBrand] = useState(() => store.get("brand", DEFAULT_BRAND));

  // ---- admin-controlled global theme override ----
  // When enabled, every user sees this theme regardless of their own personal
  // choice. When disabled, everyone falls back to their own saved preference.
  const [forceTheme, setForceThemeState] = useState({ enabled: false, themeId: "navy_gold" });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("key,value")
          .in("key", ["app_name", "app_tagline", "force_theme_enabled", "force_theme_id"]);
        if (error || !data) return; // table may not exist yet - fall back to defaults
        const next = { ...DEFAULT_BRAND };
        const ft = { enabled: false, themeId: "navy_gold" };
        data.forEach((row) => {
          if (row.key === "app_name" && row.value) next.name = row.value;
          if (row.key === "app_tagline" && row.value) next.tagline = row.value;
          if (row.key === "force_theme_enabled") ft.enabled = row.value === "true";
          if (row.key === "force_theme_id" && row.value) ft.themeId = row.value;
        });
        setBrand(next);
        store.set("brand", next);
        setForceThemeState(ft);
      } catch {
        /* offline or table missing - defaults are fine */
      }
    })();
  }, []);

  const saveForceTheme = useCallback(async (next) => {
    const rows = [
      { key: "force_theme_enabled", value: String(next.enabled), updated_at: new Date().toISOString() },
      { key: "force_theme_id", value: next.themeId, updated_at: new Date().toISOString() }
    ];
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    if (error) {
      alert(`Couldn't save the theme override: ${error.message}`);
      return false;
    }
    setForceThemeState(next);
    return true;
  }, []);

  // The theme actually applied: the admin's forced choice wins when active,
  // otherwise each person's own saved preference is used.
  const effectiveTheme = forceTheme.enabled ? forceTheme.themeId : theme;

  const saveBrand = useCallback(async (next) => {
    const rows = [
      { key: "app_name", value: next.name, updated_at: new Date().toISOString() },
      { key: "app_tagline", value: next.tagline, updated_at: new Date().toISOString() }
    ];
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    if (error) {
      alert(
        `Couldn't save the name: ${error.message}\n\nIf the app_settings table doesn't exist yet, run sql/new-project-setup.sql in the Supabase SQL editor once.`
      );
      return false;
    }
    setBrand(next);
    store.set("brand", next);
    return true;
  }, []);

  useEffect(() => {
    document.title = `${brand.name} \u2013 ${brand.tagline}`;
  }, [brand]);

  // Inject theme CSS synchronously during render to prevent FOUC (Flash of Unstyled Content)
  // This ensures the stylesheet is active in document.head before the DOM is ever painted.
  if (typeof document !== "undefined") {
    let el = document.getElementById("theme-css");
    if (!el) {
      el = document.createElement("style");
      el.id = "theme-css";
      document.head.appendChild(el);
    }
    const currentCSS = makeCSS(effectiveTheme, font, glassActive, glassTint, userAccent, userAccent2);
    if (el.textContent !== currentCSS) {
      el.textContent = currentCSS;
    }
  }

  // Also keep useEffect for reactive updates when dependencies change asynchronously
  useEffect(() => {
    let el = document.getElementById("theme-css");
    if (!el) {
      el = document.createElement("style");
      el.id = "theme-css";
      document.head.appendChild(el);
    }
    el.textContent = makeCSS(effectiveTheme, font, glassActive, glassTint, userAccent, userAccent2);
  }, [effectiveTheme, font, glassActive, glassTint, customThemes, userAccent, userAccent2]);

  if (!user) {
    return <Login brand={brand} onLogin={(u) => { setUser(u); store.set("session", u); }} />;
  }
  return (
    <Shell
      user={effectiveUser}
      realUser={user}
      viewingAs={viewingAs}
      onActAs={startActingAs}
      onExitActingAs={stopActingAs}
      brand={brand}
      saveBrand={saveBrand}
      theme={theme}
      setTheme={setTheme}
      effectiveTheme={effectiveTheme}
      forceTheme={forceTheme}
      saveForceTheme={saveForceTheme}
      font={font}
      setFont={setFont}
      glassActive={glassActive}
      setGlassActive={setGlassActive}
      glassTint={glassTint}
      setGlassTint={setGlassTint}
      customThemes={customThemes}
      setCustomThemes={setCustomThemes}
      userAccent={userAccent}
      setUserAccent={setUserAccent}
      userAccent2={userAccent2}
      setUserAccent2={setUserAccent2}
      onLogout={() => { setViewingAs(null); setUser(null); store.remove("session"); }}
    />
  );
}

/* ---------------- Login ---------------- */

function Login({ brand, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const hash = await hashPassword(password);
      const { data, error } = await supabase
        .from("pp_users")
        .select("*")
        .eq("username", username.trim())
        .eq("password_hash", hash)
        .limit(1);
      if (error) throw error;
      if (!data?.length) { setErr("Wrong username or password."); return; }
      const u = data[0];
      onLogin({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        role: u.role,
        agent_id: u.agent_id,
        team_id: u.team_id
      });
    } catch (e) {
      setErr(friendlyError(e) || "Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-bg-glow1" />
      <div className="login-bg-glow2" />
      <div className="login-card">
        <div className="login-brand">{brand.name.toUpperCase()}</div>
        <div className="login-sub">{brand.tagline}</div>
        
        <div className="login-input-group">
          <label className="login-input-label">Username</label>
          <input
            className="input"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        
        <div className="login-input-group">
          <label className="login-input-label">Password</label>
          <input
            className="input"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        
        {err && (
          <div className="mt" style={{ color: "var(--red)", fontSize: 13, background: "rgba(255,92,92,0.1)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,92,92,0.2)" }}>
            {err}
          </div>
        )}
        
        <div style={{ height: 16 }} />
        <button className="login-btn" disabled={busy || !username || !password} onClick={submit}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Shell ---------------- */

function Shell({ user, realUser, viewingAs, onActAs, onExitActingAs, brand, saveBrand, theme, setTheme, effectiveTheme, forceTheme, saveForceTheme, font, setFont, glassActive, setGlassActive, glassTint, setGlassTint, customThemes, setCustomThemes, userAccent, setUserAccent, userAccent2, setUserAccent2, onLogout }) {
  const db = useData(user);
  const isSuper = user.role === "super";
  const isAdmin = isSuper || user.role === "admin";
  const myAgent = useMemo(
    () => db.agents.find((a) => a.id === user.agent_id) || null,
    [db.agents, user.agent_id]
  );

  // Floating "back to top" button - shows once the page has scrolled down a
  // reasonable distance, since some admin/agent pages get long.
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [driveView, setDriveView] = useState("results");
  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const tabs = [
    ...(myAgent || !isAdmin ? [["dash", "Dashboard"]] : []),
    ["kudos", "💬 Kudos Wall"],
    ["drive", "🏁 Service Drive"],
    ["board", "Leaderboard"],
    ["prizes", "Prizes"],
    ...(isAdmin ? [["admin", "Admin"]] : []),
    ["settings", "Settings"]
  ];
  const [tab, setTab] = useState(tabs[0][0]);

  const roleLabel = { super: "Super Admin", admin: "Team Leader", agent: "Agent" }[user.role] || user.role;

  // ---- Notifications Activity Engine ----
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`read_notifications_${user.id}`) || "[]");
    } catch {
      return [];
    }
  });

  const notifications = useMemo(() => {
    const list = [];
    
    // 1. Peer Kudos received
    if (user.agent_id && myAgent) {
      const myKudos = db.kudos.filter(k => k.receiver_name === myAgent.name);
      myKudos.forEach(k => {
        list.push({
          id: `kudos_${k.id}`,
          type: "kudos",
          icon: k.emoji || "🙌",
          title: "Received Kudos!",
          message: `${k.sender_name} appreciated you: "${k.message}"`,
          date: k.created_at || new Date().toISOString()
        });
      });
    }

    // 2. Custom Badges awarded
    if (user.agent_id) {
      const myBadges = db.assignedBadges.filter(ab => ab.target_id === user.agent_id && ab.target_type === "agent");
      myBadges.forEach(ab => {
        const badge = db.customBadges.find(cb => cb.id === ab.badge_id);
        if (badge) {
          list.push({
            id: `badge_${ab.id}`,
            type: "badge",
            icon: badge.icon || "🎖️",
            title: "Badge Awarded!",
            message: `You were awarded the custom badge "${badge.name}"!`,
            date: ab.assigned_at || new Date().toISOString()
          });
        }
      });
    }

    // 3. Team Badges awarded
    if (myAgent?.team_id) {
      const teamBadges = db.assignedBadges.filter(ab => ab.target_id === myAgent.team_id && ab.target_type === "team");
      teamBadges.forEach(ab => {
        const badge = db.customBadges.find(cb => cb.id === ab.badge_id);
        if (badge) {
          list.push({
            id: `badge_team_${ab.id}`,
            type: "team_badge",
            icon: badge.icon || "🛡️",
            title: "Team Badge Awarded!",
            message: `Your team was awarded the custom badge "${badge.name}"!`,
            date: ab.assigned_at || new Date().toISOString()
          });
        }
      });
    }

    // 4. Redemption requests
    if (user.agent_id) {
      const myRequests = db.requests.filter(r => r.agent_id === user.agent_id);
      myRequests.forEach(r => {
        list.push({
          id: `req_${r.id}_${r.status}`,
          type: "request",
          icon: r.status === "approved" ? "✅" : r.status === "denied" ? "❌" : "⏳",
          title: `Redemption ${r.status ? r.status.toUpperCase() : "PENDING"}`,
          message: `Your request for "${r.prize_name}" has been ${r.status || "submitted for approval"}.`,
          date: r.created_at || new Date().toISOString()
        });
      });
    }

    // 5. Active Announcements
    db.activeAnnouncements.forEach(a => {
      list.push({
        id: `ann_${a.id}`,
        type: "announcement",
        icon: "📢",
        title: "Announcement",
        message: a.message,
        date: new Date().toISOString() // Keep announcement at the top
      });
    });

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [db.kudos, db.assignedBadges, db.customBadges, db.requests, db.activeAnnouncements, user.agent_id, myAgent]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      const allIds = notifications.map(n => n.id);
      setReadIds(allIds);
      localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(allIds));
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-brand">{brand.name.toUpperCase()}</span>
        <div className="topbar-right" style={{ position: "relative" }}>
          <span className="role-chip">{roleLabel}</span>
          <span className="muted" style={{ marginRight: 4 }}>{user.display_name || user.username}</span>

          {/* Notification Bell Icon & Dropdown */}
          <div style={{ position: "relative", display: "inline-block" }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={handleOpenNotifications}
              style={{ padding: "6px 10px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Activity & Notifications"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span 
                  style={{
                    position: "absolute",
                    top: "-3px",
                    right: "-3px",
                    background: "var(--red)",
                    color: "white",
                    borderRadius: "50%",
                    fontSize: "9px",
                    fontWeight: "bold",
                    width: "14px",
                    height: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 4px var(--red)"
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div 
                className="notifications-popover"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "300px",
                  maxHeight: "360px",
                  background: "var(--navy2)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  zIndex: 350,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "12px", color: "var(--text)" }}>Activity & Kudos</strong>
                  {unreadCount > 0 && <span className="muted" style={{ fontSize: "10px" }}>{unreadCount} unread</span>}
                </div>
                <div style={{ overflowY: "auto", flex: 1, maxHeight: "310px" }}>
                  {notifications.length === 0 ? (
                    <div className="muted" style={{ padding: "20px", textAlign: "center", fontSize: "11.5px" }}>
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id}
                        style={{
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--border)",
                          display: "flex",
                          gap: "8px",
                          alignItems: "flex-start",
                          background: "rgba(255,255,255,0.01)"
                        }}
                      >
                        <span style={{ fontSize: "14px", marginTop: "1px" }}>{n.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: "600", fontSize: "11.5px", color: "var(--accent)" }}>{n.title}</div>
                          <div style={{ fontSize: "11px", color: "var(--text)", marginTop: "1px", lineHeight: "1.3", overflowWrap: "break-word" }}>{n.message}</div>
                          <div style={{ fontSize: "9.5px", color: "var(--muted)", marginTop: "4px" }}>
                            {new Date(n.date).toLocaleDateString()} {new Date(n.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="sync-dot" title={db.error ? "Not connected to the database" : "Connected to live database"} style={{ marginLeft: 6, background: db.error ? "var(--red, #e74c3c)" : undefined }} />
          <button className="btn btn-ghost btn-sm" onClick={onLogout} style={{ marginLeft: 6 }}>Logout</button>
        </div>
      </div>

      {viewingAs && (
        <div style={{ background: viewingAs.mode === "full" ? "#7c3aed" : "#0ea5e9", color: "#fff", padding: "10px 16px", textAlign: "center", fontWeight: 700, fontSize: 13, letterSpacing: 0.3, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span>
            {viewingAs.mode === "full" ? "👤 ACTING AS " : "👁️ VIEWING (READ-ONLY) "}
            {user.display_name || user.username}
            {viewingAs.mode === "readonly" ? " — you can look around but nothing you click here saves" : ""}
          </span>
          <button
            className="btn btn-sm"
            style={{ background: "rgba(255,255,255,0.2)" }}
            onClick={onExitActingAs}
          >
            Exit — back to {realUser.display_name || realUser.username}
          </button>
        </div>
      )}

      {db.activeAnnouncements.map((a) => (
        <div key={a.id} className="banner">
          <span>📢 {a.message}</span>
          {isSuper && (
            <button
              className="btn btn-sm btn-ghost"
              style={{ color: "#111", borderColor: "rgba(0,0,0,.25)" }}
              onClick={() => db.dismissAnnouncement(a.id)}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      <div className="nav">
        {tabs.map(([id, label]) => (
          <button key={id} className={`nav-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
            {label}
            {id === "admin" && db.pendingRequests.length > 0 && (
              <span className="req-badge">{db.pendingRequests.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="main">
        {db.missingTables && db.missingTables.filter((t) => !t.startsWith("drive_")).length > 0 && (
          <div className="card" style={{ border: "1px dashed #f1c40f", background: "rgba(241, 196, 15, 0.04)", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20 }}>💡</span>
              <div>
                <strong style={{ color: "#f1c40f", fontSize: 13, display: "block" }}>Features Offline (Missing Database Tables)</strong>
                <p className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: "1.4" }}>
                  Your live Supabase project is missing the following required tables: <strong>{db.missingTables.filter((t) => !t.startsWith("drive_")).join(", ")}</strong>.
                  Because of this, features like the <strong>Kudos Wall</strong> or <strong>Team Collaborative Quests</strong> are currently empty or disabled on your live database.
                </p>
                {isAdmin && (
                  <div style={{ marginTop: 10, background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, color: "var(--accent)", marginBottom: 4 }}>How to resolve as an Admin:</div>
                    <div style={{ fontSize: 11, lineHeight: "1.4" }} className="muted">
                      Open your Supabase Dashboard, go to the SQL Editor, paste the contents of <code style={{ color: "var(--teal)", fontFamily: "monospace" }}>/sql/new-project-setup.sql</code>, and click <strong>Run</strong>. It only adds what is missing and never changes existing data.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {db.error && (
          <div className="card" style={{ borderColor: "var(--red)" }}>
            <strong style={{ color: "var(--red)" }}>Not connected to the database.</strong>{" "}
            <span className="muted">{db.error}</span>{" "}
            <button className="btn btn-sm mt" onClick={db.loadAll}>Retry</button>
          </div>
        )}
        {db.loading && <div className="muted">Loading…</div>}
        {!db.loading && (
          <>
            {tab === "dash" && <Dashboard db={db} agent={myAgent} readOnly={viewingAs?.mode === "readonly"} />}
            {tab === "kudos" && <Kudos db={db} user={user} agent={myAgent} />}
            {tab === "drive" && <Drive db={db} user={user} agent={myAgent} isAdmin={isAdmin} isSuper={isSuper} readOnly={viewingAs?.mode === "readonly"} view={driveView} setView={setDriveView} />}
            {tab === "board" && <Leaderboard db={db} myAgentId={user.agent_id} />}
            {tab === "prizes" && <Prizes db={db} user={user} agent={myAgent} isAdmin={isAdmin} readOnly={viewingAs?.mode === "readonly"} />}
            {tab === "admin" && isAdmin && <Admin db={db} user={user} isSuper={isSuper} onActAs={onActAs} />}
            {tab === "settings" && (
              <Settings
                db={db}
                user={user}
                theme={theme}
                setTheme={setTheme}
                forceTheme={forceTheme}
                saveForceTheme={saveForceTheme}
                font={font}
                setFont={setFont}
                glassActive={glassActive}
                setGlassActive={setGlassActive}
                glassTint={glassTint}
                setGlassTint={setGlassTint}
                customThemes={customThemes}
                setCustomThemes={setCustomThemes}
                userAccent={userAccent}
                setUserAccent={setUserAccent}
                userAccent2={userAccent2}
                setUserAccent2={setUserAccent2}
                isSuper={isSuper}
                brand={brand}
                saveBrand={saveBrand}
              />
            )}
          </>
        )}
      </div>

      {showTopBtn && (
        <button
          onClick={scrollToTop}
          title="Back to top"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 46,
            height: 46,
            borderRadius: "50%",
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          ▲
        </button>
      )}

      <HelperAngel db={db} user={user} agent={myAgent} isAdmin={isAdmin} isSuper={isSuper} setTab={setTab} setDriveView={setDriveView} />
    </div>
  );
}

/* ============================================================
   Floating "helper angel" - a small friendly widget, tucked in
   the bottom-left corner (the back-to-top button lives bottom-right,
   so the two never collide). Click to pop open quick actions:
   check your points, send a fast kudos, or jump to a tab.
   ============================================================ */
function HelperAngel({ db, user, agent, isAdmin, isSuper, setTab, setDriveView }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [toId, setToId] = useState("");
  const [sending, setSending] = useState(false);

  const R = mergeRules(db.driveRules);
  const month = defaultDriveMonth();
  const monthName = DRIVE_MONTHS.find((m) => m.key === month)?.label || "";
  const scope = isAdmin && !isSuper && user.team_id ? db.agents.filter((a) => a.team_id === user.team_id) : db.agents;
  const scored = scope.filter((a) => metricPoints(db.driveScores.find((x) => x.month === month && x.agent_id === a.id), R)).length;
  const myRow = agent ? db.driveScores.find((x) => x.month === month && x.agent_id === agent.id) : null;
  const myPts = metricPoints(myRow, R);
  const myRank = agent ? monthResults(month, db.driveScores, db.agents, R).ranked.find((r) => r.agent.id === agent.id)?.rank : null;

  const teammates = agent ? db.agents.filter((a) => a.id !== agent.id) : [];
  const avail = agent ? db.agentAvailPts(agent.id) : 0;
  const go = (tab, view) => { setTab(tab); if (view) setDriveView(view); setOpen(false); window.scrollTo({ top: 0 }); };
  const goImport = () => {
    setTab("admin"); setOpen(false);
    setTimeout(() => document.getElementById("admin-sec-import")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  };
  const firstName = (agent?.name || user.display_name || user.username || "").split(" ")[0];

  const sendQuickKudos = async () => {
    if (!toId) return alert("Pick who it's for!");
    if (!msg.trim()) return alert("Write a quick message first.");
    const receiver = db.agents.find((a) => a.id === toId);
    if (!receiver) return;
    setSending(true);
    const ok = await db.addKudos({ sender_id: agent.id, sender_name: agent.name, receiver_id: receiver.id, receiver_name: receiver.name, message: msg.trim(), emoji: "👼" });
    setSending(false);
    if (ok) {
      setMsg("");
      setToId("");
      alert("Sent! Your kudos is on its way. ✨");
    }
  };

  const tile = { background: "var(--navy3)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, textAlign: "center" };
  const big = { fontFamily: "'Bebas Neue'", fontSize: 26, color: "var(--accent)", lineHeight: 1 };

  return (
    <>
      <style>{`
        @keyframes helper-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes helper-pop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .helper-fab { animation: helper-bob 2.6s ease-in-out infinite; }
        .helper-fab:hover { animation-play-state: paused; }
        .helper-panel { animation: helper-pop 0.18s ease-out; transform-origin: bottom left; }
      `}</style>

      {open && (
        <div
          className="helper-panel card"
          style={{
            position: "fixed",
            bottom: 90,
            left: 24,
            width: 280,
            zIndex: 301,
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            marginBottom: 0
          }}
        >
          <div className="spread" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>👼 Hey {firstName}!</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>✕</button>
          </div>

          {isAdmin && (
            <>
              <div style={tile}>
                <div style={big}>{scored} / {scope.length}</div>
                <div className="muted" style={{ fontSize: 11 }}>agents with {monthName} drive scores</div>
              </div>
              <div className="flex" style={{ gap: 8, marginBottom: 8 }}>
                <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => go("drive", "enter")}>✏️ Enter scores</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => go("drive", "results")}>🏆 Results</button>
              </div>
              <div className="flex" style={{ gap: 8, marginBottom: agent ? 12 : 0 }}>
                {isSuper && <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={goImport}>📥 Import members</button>}
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => go("admin")}>
                  ✅ Approvals{db.pendingRequests.length ? ` (${db.pendingRequests.length})` : ""}
                </button>
              </div>
            </>
          )}

          {agent && (
            <>
              <div className="flex" style={{ gap: 8 }}>
                <div style={{ ...tile, flex: 1 }}>
                  <div style={big}>{avail}</div>
                  <div className="muted" style={{ fontSize: 11 }}>points available</div>
                </div>
                <div style={{ ...tile, flex: 1, cursor: "pointer" }} onClick={() => go("drive", "results")} title="Open Service Drive">
                  <div style={big}>{myPts ? myPts.total : "–"}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{monthName} drive{myRank ? ` · #${myRank}` : ""}</div>
                </div>
              </div>

              <div className="lbl">Quick kudos</div>
              <select className="input" style={{ marginBottom: 8 }} value={toId} onChange={(e) => setToId(e.target.value)}>
                <option value="">Who's it for?</option>
                {teammates.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input className="input" style={{ marginBottom: 8 }} placeholder="A quick thank you..." maxLength={120} value={msg} onChange={(e) => setMsg(e.target.value)} />
              <button className="btn" style={{ width: "100%", marginBottom: 12 }} disabled={sending} onClick={sendQuickKudos}>
                {sending ? "Sending…" : "Send kudos 🚀"}
              </button>

              <div className="flex" style={{ gap: 8 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => go("drive", "board")}>📊 Drive board</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => go("prizes")}>🎁 Prizes</button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        className="helper-fab"
        onClick={() => setOpen(!open)}
        title="Quick actions"
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #fff7d6, #ffe08a)",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(255, 200, 60, 0.45)",
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26
        }}
      >
        👼
      </button>
    </>
  );
}
