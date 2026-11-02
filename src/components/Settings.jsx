import { useState, useEffect } from "react";
import { THEMES } from "../constants.js";
import { hashPassword } from "../lib/helpers.js";
import { Avatar, parseAvatar } from "./ui.jsx";
import { APP_VERSION } from "../version.js";

export default function Settings({ db, user, theme, setTheme, forceTheme = { enabled: false, themeId: "navy_gold" }, saveForceTheme, font, setFont, glassActive, setGlassActive, glassTint, setGlassTint, customThemes = [], setCustomThemes, userAccent, setUserAccent, userAccent2, setUserAccent2, isSuper, brand, saveBrand }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [forceDraft, setForceDraft] = useState(forceTheme);
  useEffect(() => setForceDraft(forceTheme), [forceTheme]);


  const changePassword = async () => {
    if (pw.length < 6) return alert("Use at least 6 characters.");
    if (pw !== pw2) return alert("Passwords don't match.");
    const password_hash = await hashPassword(pw);
    await db.updateUser(user.id, { password_hash });
    setPw(""); setPw2("");
    alert("Password updated.");
  };

  // ---- DYNAMIC THEME BUILDER STATE ----
  const [newThemeName, setNewThemeName] = useState("");
  const [newBg, setNewBg] = useState("#0a0a18");
  const [newPanel, setNewPanel] = useState("#121226");
  const [newPanelOpacity, setNewPanelOpacity] = useState(0.45);
  const [newBorder, setNewBorder] = useState("rgba(255,255,255,0.08)");
  const [newAccent1, setNewAccent1] = useState("#ff007f");
  const [newAccent2, setNewAccent2] = useState("#00ffff");
  const [newIsDark, setNewIsDark] = useState(true);

  const hexToRgb = (hex) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    } catch {
      return "255, 255, 255";
    }
  };

  const handleSaveTheme = () => {
    if (!newThemeName.trim()) return alert("Please enter a name for your custom theme!");
    
    const cleanId = `custom_${Date.now()}`;
    const panelRgb = hexToRgb(newPanel);
    
    const generatedTheme = {
      id: cleanId,
      name: `✨ ${newThemeName.trim()}`,
      navy: newBg,
      navy2: newIsDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", 
      navy3: newIsDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
      panel: `rgba(${panelRgb}, ${newPanelOpacity})`,
      border: newBorder,
      accent: newAccent1,
      accent2: newAccent2,
      swatch: `linear-gradient(135deg, ${newAccent1}, ${newAccent2})`,
      isDark: newIsDark
    };
    
    const updated = [...customThemes, generatedTheme];
    setCustomThemes(updated);
    setTheme(cleanId);
    setNewThemeName("");
    alert(`Custom theme "${newThemeName}" created and activated successfully!`);
  };

  const handleDeleteTheme = (id, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this custom theme?")) {
      const updated = customThemes.filter((t) => t.id !== id);
      setCustomThemes(updated);
      if (theme === id) {
        setTheme("navy_gold");
      }
    }
  };

  // ---- AVATAR CREATOR STATE ----
  const myAgent = db.agents.find((a) => a.id === user.agent_id);

  const [avatarMode, setAvatarMode] = useState("custom"); // "custom" | "cartoon"
  const [cartoonVariant, setCartoonVariant] = useState("");
  const [avatarBgMode, setAvatarBgMode] = useState("grad");
  const [avatarColor1, setAvatarColor1] = useState("#ff5c5c");
  const [avatarColor2, setAvatarColor2] = useState("#3498db");
  const [avatarAngle, setAvatarAngle] = useState("135deg");
  const [avatarContentMode, setAvatarContentMode] = useState("emoji");
  const [avatarEmoji, setAvatarEmoji] = useState("🦊");
  const [avatarText, setAvatarText] = useState("");
  const [avatarShape, setAvatarShape] = useState("circle");

  // Load current agent avatar config if available
  useEffect(() => {
    if (myAgent?.color) {
      if (myAgent.color === "cartoon" || myAgent.color.startsWith("cartoon:")) {
        setAvatarMode("cartoon");
        setCartoonVariant(myAgent.color.startsWith("cartoon:") ? myAgent.color.substring(8) : "");
        return;
      }
      setAvatarMode("custom");
      const parts = myAgent.color.split("|");
      const bgPart = parts[0] || "";
      const contentPart = parts[1] || "";
      const shapePart = parts[2] || "circle";

      setAvatarShape(shapePart === "rounded" ? "rounded" : "circle");

      if (bgPart.startsWith("grad:")) {
        setAvatarBgMode("grad");
        const sub = bgPart.substring(5).split(":");
        setAvatarColor1(sub[0] || "#ff5c5c");
        setAvatarColor2(sub[1] || "#3498db");
        setAvatarAngle(sub[2] || "135deg");
      } else if (bgPart.startsWith("solid:")) {
        setAvatarBgMode("solid");
        setAvatarColor1(bgPart.substring(6) || "#ff5c5c");
      } else if (bgPart.startsWith("#") || bgPart.length > 0) {
        setAvatarBgMode("solid");
        setAvatarColor1(bgPart);
      }

      if (contentPart.startsWith("emoji:")) {
        setAvatarContentMode("emoji");
        setAvatarEmoji(contentPart.substring(6));
      } else if (contentPart.startsWith("text:")) {
        setAvatarContentMode("text");
        setAvatarText(contentPart.substring(5));
      } else if (contentPart === "initials") {
        setAvatarContentMode("initials");
      }
    }
  }, [myAgent]);

  const previewAgentConfig = () => {
    if (avatarMode === "cartoon") {
      return {
        id: myAgent?.id || "preview",
        name: myAgent?.name || "Agent Avatar Preview",
        color: cartoonVariant ? `cartoon:${cartoonVariant}` : "cartoon"
      };
    }
    let bgPart = "";
    if (avatarBgMode === "grad") {
      bgPart = `grad:${avatarColor1}:${avatarColor2}:${avatarAngle}`;
    } else {
      bgPart = `solid:${avatarColor1}`;
    }
    
    let contentPart = "initials";
    if (avatarContentMode === "emoji") {
      contentPart = `emoji:${avatarEmoji}`;
    } else if (avatarContentMode === "text") {
      contentPart = `text:${avatarText || "JS"}`;
    }
    
    return {
      id: myAgent?.id,
      name: myAgent?.name || "Agent Avatar Preview",
      color: `${bgPart}|${contentPart}|${avatarShape}`
    };
  };

  const shuffleCartoonFace = () => {
    setCartoonVariant(Math.random().toString(36).slice(2, 9));
  };

  const handleSaveAvatar = async () => {
    if (!myAgent) return alert("You don't have a linked agent profile to save avatars for.");
    const preview = previewAgentConfig();
    const success = await db.updateAgent(myAgent.id, { color: preview.color });
    if (success) {
      alert("Your custom high-fidelity avatar is updated and live across the app!");
    } else {
      alert("Failed to save. Please try again.");
    }
  };

  const emojiOptions = [
    "🦊", "🦁", "🐯", "🐼", "🐨", "🤖", "🚀", "💻", "🎮", "🦄", 
    "🏆", "💎", "🌟", "🍕", "🍩", "🥑", "👑", "🔥", "🌈", "🎈", 
    "🎯", "🎲", "👾", "🦸", "🕵️", "🧠", "👻", "👽", "🐈", "🐕"
  ];

  return (
    <>
      {isSuper && <BrandingCard brand={brand} saveBrand={saveBrand} />}

      {/* 👤 AVATAR CREATOR CARD */}
      <div className="card">
        <div className="card-title">👤 Personal Avatar Creator</div>
        <div className="muted" style={{ marginBottom: 18 }}>
          Design a custom high-fidelity avatar for your profile! Choose dynamic gradients, custom text shapes, or select from rich graphical emojis.
        </div>

        {myAgent ? (
          <>
          <div className="flex" style={{ gap: 10, marginBottom: 20 }}>
            <button className={`btn btn-sm ${avatarMode === "cartoon" ? "" : "btn-ghost"}`} onClick={() => setAvatarMode("cartoon")} style={{ flex: 1 }}>
              🎭 Cartoon Character
            </button>
            <button className={`btn btn-sm ${avatarMode === "custom" ? "" : "btn-ghost"}`} onClick={() => setAvatarMode("custom")} style={{ flex: 1 }}>
              🎨 Custom Design
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, flexWrap: "wrap" }}>
            
            {/* Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {avatarMode === "cartoon" ? (
                <div>
                  <div className="muted" style={{ marginBottom: 14 }}>
                    A unique cartoon face, generated just for you: skin tone, hair, eyes and all.
                    Don't like this one? Shuffle for a fresh look, it'll always come out different.
                  </div>
                  <button className="btn btn-sm" onClick={shuffleCartoonFace}>🔀 Shuffle Face</button>
                </div>
              ) : (
              <>
              {/* Row 1: Shape & Background Mode */}
              <div className="form-row">
                <div>
                  <label className="lbl">Avatar Shape</label>
                  <div className="flex" style={{ gap: 10, marginTop: 6 }}>
                    <button 
                      className={`btn btn-sm ${avatarShape === "circle" ? "" : "btn-ghost"}`}
                      onClick={() => setAvatarShape("circle")}
                      style={{ flex: 1 }}
                    >
                      🟣 Circular
                    </button>
                    <button 
                      className={`btn btn-sm ${avatarShape === "rounded" ? "" : "btn-ghost"}`}
                      onClick={() => setAvatarShape("rounded")}
                      style={{ flex: 1 }}
                    >
                      🟧 Rounded Square
                    </button>
                  </div>
                </div>

                <div>
                  <label className="lbl">Background Mode</label>
                  <div className="flex" style={{ gap: 10, marginTop: 6 }}>
                    <button 
                      className={`btn btn-sm ${avatarBgMode === "solid" ? "" : "btn-ghost"}`}
                      onClick={() => setAvatarBgMode("solid")}
                      style={{ flex: 1 }}
                    >
                      🎨 Solid Fill
                    </button>
                    <button 
                      className={`btn btn-sm ${avatarBgMode === "grad" ? "" : "btn-ghost"}`}
                      onClick={() => setAvatarBgMode("grad")}
                      style={{ flex: 1 }}
                    >
                      🌈 Custom Gradient
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Color Pickers */}
              <div className="form-row" style={{ background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                <div>
                  <label className="lbl">{avatarBgMode === "grad" ? "Start Color" : "Solid Color"}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <input 
                      type="color" 
                      value={avatarColor1} 
                      onChange={(e) => setAvatarColor1(e.target.value)} 
                      style={{ border: "none", background: "none", width: 34, height: 34, cursor: "pointer" }}
                    />
                    <input 
                      type="text" 
                      className="input" 
                      value={avatarColor1} 
                      onChange={(e) => setAvatarColor1(e.target.value)}
                      style={{ height: 34, padding: "4px 8px", fontSize: 12, fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                {avatarBgMode === "grad" && (
                  <>
                    <div>
                      <label className="lbl">End Color</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <input 
                          type="color" 
                          value={avatarColor2} 
                          onChange={(e) => setAvatarColor2(e.target.value)} 
                          style={{ border: "none", background: "none", width: 34, height: 34, cursor: "pointer" }}
                        />
                        <input 
                          type="text" 
                          className="input" 
                          value={avatarColor2} 
                          onChange={(e) => setAvatarColor2(e.target.value)}
                          style={{ height: 34, padding: "4px 8px", fontSize: 12, fontFamily: "monospace" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="lbl">Angle</label>
                      <select 
                        className="input"
                        value={avatarAngle}
                        onChange={(e) => setAvatarAngle(e.target.value)}
                        style={{ height: 34, marginTop: 4, padding: "2px 8px", fontSize: 12 }}
                      >
                        <option value="45deg">45° Diagonal</option>
                        <option value="90deg">90° Vertical</option>
                        <option value="135deg">135° Slope</option>
                        <option value="180deg">180° Horizontal</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Row 3: Content Options */}
              <div>
                <label className="lbl">Avatar Content</label>
                <div className="flex" style={{ gap: 8, marginTop: 6, marginBottom: 12 }}>
                  <button 
                    className={`btn btn-sm ${avatarContentMode === "emoji" ? "" : "btn-ghost"}`}
                    onClick={() => setAvatarContentMode("emoji")}
                  >
                    🦊 Emoji
                  </button>
                  <button 
                    className={`btn btn-sm ${avatarContentMode === "initials" ? "" : "btn-ghost"}`}
                    onClick={() => setAvatarContentMode("initials")}
                  >
                    ✍️ Use Initials ({myAgent.name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()})
                  </button>
                  <button 
                    className={`btn btn-sm ${avatarContentMode === "text" ? "" : "btn-ghost"}`}
                    onClick={() => setAvatarContentMode("text")}
                  >
                    ✏️ Custom Text
                  </button>
                </div>

                {avatarContentMode === "emoji" && (
                  <div style={{ background: "rgba(0,0,0,0.15)", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 90, overflowY: "auto", padding: "4px" }}>
                      {emojiOptions.map(e => (
                        <span 
                          key={e} 
                          onClick={() => setAvatarEmoji(e)}
                          style={{ 
                            fontSize: 20, 
                            cursor: "pointer", 
                            padding: "4px", 
                            borderRadius: "4px", 
                            background: avatarEmoji === e ? "var(--border)" : "transparent",
                            transition: "all 0.2s"
                          }}
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {avatarContentMode === "text" && (
                  <div>
                    <input 
                      type="text" 
                      className="input" 
                      maxLength={3} 
                      placeholder="e.g. WIN, VIP, A1" 
                      value={avatarText} 
                      onChange={(e) => setAvatarText(e.target.value.toUpperCase())} 
                    />
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Maximum 3 characters.</div>
                  </div>
                )}
              </div>
              </>
              )}
            </div>

            {/* Live Preview Display */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 16 }}>Live Avatar Preview</div>
              
              <Avatar agent={previewAgentConfig()} size={120} />

              <div style={{ marginTop: 14, fontWeight: "bold", fontSize: 14, color: "var(--accent)" }}>{myAgent.name}</div>
              <div className="muted" style={{ fontSize: 11 }}>{myAgent.role || "Team Member"}</div>
              
              <button 
                className="btn" 
                style={{ width: "100%", marginTop: 20 }} 
                onClick={handleSaveAvatar}
              >
                💾 Save Avatar Profile
              </button>
            </div>

          </div>
          </>
        ) : (
          <div style={{ background: "rgba(255,92,92,0.05)", border: "1px dashed var(--red)", padding: 14, borderRadius: 10, color: "var(--red)" }}>
            ⚠️ <strong>Profile Not Bound:</strong> Your user login is not yet linked to an active agent profile. Please ask an administrator to assign your user to an Agent profile under <strong>Admin → Users</strong> to design a personalized avatar.
          </div>
        )}
      </div>

      {/* ✨ PERSONAL ACCENT Highlight CUSTOMIZER */}
      <div className="card">
        <div className="card-title">✨ Personal Accent Highlight ("The Yellow Parts")</div>
        <div className="muted" style={{ marginBottom: 18 }}>
          Personalize the main interface highlights (buttons, selected tabs, badges, progress bars, and glowing borders)! The active theme defaults to yellow, but you can override it with your own favorite color. <strong>Changes are applied instantly to your account only.</strong>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-row">
              <div>
                <label className="lbl">Primary Accent Highlight</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <input 
                    type="color" 
                    value={userAccent || "#F5C842"} 
                    onChange={(e) => setUserAccent(e.target.value)} 
                    style={{ border: "none", background: "none", width: 44, height: 44, cursor: "pointer", padding: 0 }}
                  />
                  <input 
                    type="text" 
                    className="input" 
                    value={userAccent || ""} 
                    placeholder="Theme Default (Yellow)"
                    onChange={(e) => setUserAccent(e.target.value)} 
                    style={{ fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div>
                <label className="lbl">Secondary Glow Accent</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <input 
                    type="color" 
                    value={userAccent2 || "#E0A800"} 
                    onChange={(e) => setUserAccent2(e.target.value)} 
                    style={{ border: "none", background: "none", width: 44, height: 44, cursor: "pointer", padding: 0 }}
                  />
                  <input 
                    type="text" 
                    className="input" 
                    value={userAccent2 || ""} 
                    placeholder="Theme Default (Dark Gold)"
                    onChange={(e) => setUserAccent2(e.target.value)} 
                    style={{ fontFamily: "monospace" }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="lbl" style={{ marginBottom: 8 }}>Quick Highlight Presets</label>
              <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                {[
                  { name: "Neon Gold", c1: "#F5C842", c2: "#E0A800" },
                  { name: "Cyan Ice", c1: "#00FFFF", c2: "#00BC9C" },
                  { name: "Neon Rose", c1: "#FF007F", c2: "#D10066" },
                  { name: "Duolingo Green", c1: "#58CC02", c2: "#46A302" },
                  { name: "Vibrant Orange", c1: "#FF9600", c2: "#E06A00" },
                  { name: "Royal Purple", c1: "#9B59B6", c2: "#7D3C98" },
                  { name: "Electric Blue", c1: "#3498DB", c2: "#2980B9" },
                ].map((p) => (
                  <button 
                    key={p.name}
                    className="btn btn-sm btn-ghost"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8 }}
                    onClick={() => {
                      setUserAccent(p.c1);
                      setUserAccent2(p.c2);
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`, display: "inline-block" }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex" style={{ gap: 10, marginTop: 4 }}>
              <button 
                className="btn btn-sm btn-danger" 
                onClick={() => {
                  setUserAccent("");
                  setUserAccent2("");
                }}
              >
                🔄 Reset to Theme Default
              </button>
            </div>
          </div>

          {/* Quick Preview panel */}
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, border: "1px solid var(--border)", padding: 18, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
            <div style={{ fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted)", textAlign: "center" }}>Instant Live Preview</div>
            
            <button className="btn" style={{ width: "100%" }}>
              Button Highlight ✨
            </button>
            
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <span className="pill" style={{ borderColor: "var(--accent)", color: "var(--accent)", fontWeight: "bold" }}>Badge Style</span>
              <span className="sync-dot" style={{ width: 12, height: 12, alignSelf: "center" }} />
            </div>

            <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11 }}>
              --accent: <span style={{ color: "var(--accent)" }}>{userAccent || "Default"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🎨 COLOR THEME SELECTION & DESIGNER */}
      <div className="card">
        <div className="card-title">🎨 Theme & Dynamic Gradient Creator</div>
        {forceTheme.enabled && !isSuper ? (
          <div className="muted" style={{ marginBottom: 8 }}>
            🔒 Your Super Admin has set a fixed theme for everyone right now, so personal theme
            choice is turned off temporarily. You'll get your own picker back the moment they
            turn the system-wide theme off.
          </div>
        ) : (
          <div className="muted" style={{ marginBottom: 16 }}>
            Choose a visual design theme preset, or craft your own personalized theme with customized gradient flows, slate backplates, and glowing highlights!
          </div>
        )}

        {!(forceTheme.enabled && !isSuper) && (
        <>
        {/* Swatch Picker Grid */}
        <div style={{ marginBottom: 24 }}>
          <label className="lbl" style={{ marginBottom: 10, display: "block" }}>Select Preset or Custom Theme</label>
          <div className="flex" style={{ flexWrap: "wrap", gap: 14 }}>
            {/* Standard presets */}
            {Object.entries(THEMES).map(([id, t]) => (
              <div key={id} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setTheme(id)}>
                <div
                  className={`swatch ${theme === id ? "active" : ""}`}
                  style={{ background: t.swatch, margin: "0 auto" }}
                />
                <div className="muted" style={{ marginTop: 4, fontSize: "11px", fontWeight: theme === id ? "700" : "500", color: theme === id ? "var(--accent)" : "var(--muted)" }}>{t.name}</div>
              </div>
            ))}

            {/* Custom themes list */}
            {customThemes.map((t) => (
              <div key={t.id} style={{ textAlign: "center", cursor: "pointer", position: "relative" }} onClick={() => setTheme(t.id)}>
                <div
                  className={`swatch ${theme === t.id ? "active" : ""}`}
                  style={{ background: t.swatch, margin: "0 auto" }}
                />
                <div className="muted" style={{ marginTop: 4, fontSize: "11px", fontWeight: theme === t.id ? "700" : "500", color: theme === t.id ? "var(--accent)" : "var(--muted)" }}>
                  {t.name}
                </div>
                <button 
                  onClick={(e) => handleDeleteTheme(t.id, e)} 
                  style={{ 
                    position: "absolute", 
                    top: -4, 
                    right: -4, 
                    background: "var(--red)", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "50%", 
                    width: 16, 
                    height: 16, 
                    fontSize: 9, 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="Delete Theme"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* DYNAMIC GRADIENT THEME DESIGNER BLOCK */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
          <div style={{ fontWeight: "700", fontSize: 13, color: "var(--accent)", marginBottom: 12 }}>✨ Dynamic Custom Theme & Gradient Designer</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, flexWrap: "wrap" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-row">
                <div>
                  <label className="lbl">Theme Name</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Neon Horizon" 
                    value={newThemeName} 
                    onChange={(e) => setNewThemeName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="lbl">Style Mode</label>
                  <div className="flex" style={{ gap: 10, marginTop: 4 }}>
                    <button 
                      className={`btn btn-sm ${newIsDark ? "" : "btn-ghost"}`}
                      onClick={() => setNewIsDark(true)}
                      style={{ flex: 1 }}
                    >
                      🌑 Dark Backplate
                    </button>
                    <button 
                      className={`btn btn-sm ${!newIsDark ? "" : "btn-ghost"}`}
                      onClick={() => setNewIsDark(false)}
                      style={{ flex: 1 }}
                    >
                      ☀️ Light Backplate
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-3" style={{ background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 10, border: "1px solid var(--border)", gap: 12 }}>
                <div>
                  <label className="lbl">App Background</label>
                  <input 
                    type="color" 
                    value={newBg} 
                    onChange={(e) => setNewBg(e.target.value)} 
                    style={{ width: "100%", height: 32, border: "none", background: "none", cursor: "pointer", marginTop: 4 }}
                  />
                </div>
                <div>
                  <label className="lbl">Card Face Color</label>
                  <input 
                    type="color" 
                    value={newPanel} 
                    onChange={(e) => setNewPanel(e.target.value)} 
                    style={{ width: "100%", height: 32, border: "none", background: "none", cursor: "pointer", marginTop: 4 }}
                  />
                </div>
                <div>
                  <label className="lbl">Card Opacity ({Math.round(newPanelOpacity * 100)}%)</label>
                  <input 
                    type="range" 
                    min="0.10" 
                    max="1.00" 
                    step="0.05" 
                    value={newPanelOpacity} 
                    onChange={(e) => setNewPanelOpacity(parseFloat(e.target.value))}
                    style={{ width: "100%", height: 32, accentColor: "var(--accent)" }}
                  />
                </div>
              </div>

              <div className="grid grid-3" style={{ background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 10, border: "1px solid var(--border)", gap: 12 }}>
                <div>
                  <label className="lbl">Gradient Stop 1</label>
                  <input 
                    type="color" 
                    value={newAccent1} 
                    onChange={(e) => setNewAccent1(e.target.value)} 
                    style={{ width: "100%", height: 32, border: "none", background: "none", cursor: "pointer", marginTop: 4 }}
                  />
                </div>
                <div>
                  <label className="lbl">Gradient Stop 2</label>
                  <input 
                    type="color" 
                    value={newAccent2} 
                    onChange={(e) => setNewAccent2(e.target.value)} 
                    style={{ width: "100%", height: 32, border: "none", background: "none", cursor: "pointer", marginTop: 4 }}
                  />
                </div>
                <div>
                  <label className="lbl">Card Borders</label>
                  <input 
                    type="color" 
                    value={newBorder.startsWith("rgba") ? "#222222" : newBorder} 
                    onChange={(e) => setNewBorder(e.target.value)} 
                    style={{ width: "100%", height: 32, border: "none", background: "none", cursor: "pointer", marginTop: 4 }}
                  />
                </div>
              </div>
            </div>

            {/* Design Preview Box */}
            <div 
              style={{ 
                background: newBg, 
                color: newIsDark ? "#ffffff" : "#111111", 
                border: "1px solid rgba(255,255,255,0.1)", 
                borderRadius: 12, 
                padding: 16, 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "space-between" 
              }}
            >
              <div>
                <div style={{ fontSize: 9, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Theme Design Preview</div>
                <div 
                  style={{ 
                    background: `rgba(${hexToRgb(newPanel)}, ${newPanelOpacity})`, 
                    border: `1px solid ${newBorder}`, 
                    borderRadius: 8, 
                    padding: 10 
                  }}
                >
                  <div style={{ fontWeight: "700", fontSize: 11, color: newAccent1 }}>🏆 Milestone Header</div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>This preview reflects card faces, translucent variables, and highlighting colors.</div>
                  
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    <div style={{ height: 4, flex: 1, background: `linear-gradient(90deg, ${newAccent1}, ${newAccent2})`, borderRadius: 2 }} />
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-sm" 
                style={{ width: "100%", marginTop: 14, background: `linear-gradient(135deg, ${newAccent1}, ${newAccent2})`, color: "#111", fontWeight: "bold" }}
                onClick={handleSaveTheme}
              >
                🌈 Save & Apply Theme
              </button>
            </div>

          </div>
        </div>

        {/* Global Settings font selectors & Glassmorphism config */}
        <div className="form-row" style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
          <div>
            <label className="lbl" style={{ marginBottom: 8 }}>Font Family</label>
            <select
              className="input"
              value={font}
              onChange={(e) => setFont(e.target.value)}
              style={{ padding: "10px 12px" }}
            >
              <option value="DM Sans">DM Sans (Standard Modern)</option>
              <option value="Space Grotesk">Space Grotesk (Tech/Neo)</option>
              <option value="Inter">Inter (Swiss Minimal)</option>
              <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
              <option value="JetBrains Mono">JetBrains Mono (Developer Console)</option>
            </select>
            <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>
              Changes the system font layout instantly across all screens.
            </div>
          </div>

          <div>
            <label className="lbl" style={{ marginBottom: 8 }}>iOS Glassmorphism Mode</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  id="glass-toggle"
                  type="checkbox"
                  checked={glassActive}
                  onChange={(e) => setGlassActive(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <label htmlFor="glass-toggle" style={{ fontWeight: "600", fontSize: 13, cursor: "pointer", userSelect: "none" }}>
                  {glassActive ? "✨ iOS Glassmorphic Blur Enabled" : "Off (Standard Panels)"}
                </label>
              </div>

              {glassActive && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <span className="muted" style={{ fontSize: 11, fontWeight: "bold" }}>GLASS BACKPLATE:</span>
                  <label className="flex" style={{ gap: 6, cursor: "pointer", fontSize: 12 }}>
                    <input 
                      type="radio" 
                      name="glassTint" 
                      value="tinted" 
                      checked={glassTint === "tinted"} 
                      onChange={() => setGlassTint("tinted")} 
                      style={{ accentColor: "var(--accent)" }}
                    />
                    🎨 Tinted Frosted
                  </label>
                  <label className="flex" style={{ gap: 6, cursor: "pointer", fontSize: 12 }}>
                    <input 
                      type="radio" 
                      name="glassTint" 
                      value="clear" 
                      checked={glassTint === "clear"} 
                      onChange={() => setGlassTint("clear")} 
                      style={{ accentColor: "var(--accent)" }}
                    />
                    💎 Crystal Clear
                  </label>
                </div>
              )}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>
              Applies translucent frosted-glass styling and smooth backdrop blurs. Crystal Clear provides high transparency.
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {isSuper && (
        <div className="card" style={{ border: "1px dashed var(--accent)" }}>
          <div className="card-title">🌐 System-Wide Theme (Super Admin only)</div>
          <div className="muted" style={{ marginBottom: 14 }}>
            Turn this on to force one fixed theme for every agent and team leader, overriding
            everyone's personal choice. Turn it off to let each person pick their own again.
          </div>
          <label className="flex" style={{ gap: 10, cursor: "pointer", marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={forceDraft.enabled}
              onChange={(e) => setForceDraft({ ...forceDraft, enabled: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontWeight: 600 }}>
              {forceDraft.enabled ? "System-wide theme is ON for everyone" : "Let each person choose their own theme"}
            </span>
          </label>
          <div className="flex" style={{ flexWrap: "wrap", gap: 14, opacity: forceDraft.enabled ? 1 : 0.4, pointerEvents: forceDraft.enabled ? "auto" : "none" }}>
            {Object.entries(THEMES).map(([id, t]) => (
              <div key={id} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setForceDraft({ ...forceDraft, themeId: id })}>
                <div
                  className={`swatch ${forceDraft.themeId === id ? "active" : ""}`}
                  style={{ background: t.swatch, margin: "0 auto" }}
                />
                <div className="muted" style={{ marginTop: 4, fontSize: "11px" }}>{t.name}</div>
              </div>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => saveForceTheme && saveForceTheme(forceDraft)}>
            Save system-wide theme setting
          </button>
        </div>
      )}

      {/* ⚡ CONNECTION STATUS */}
      <div className="card">
        <div className="card-title">⚡ Database connection</div>
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: "600", color: db.error ? "var(--red)" : "var(--teal)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="sync-dot" style={{ background: db.error ? "var(--red)" : "var(--teal)" }} />
              {db.error ? "Not connected" : "Connected to the live database"}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {db.error ? db.error : "All changes save straight to Supabase and everyone sees the same data."}
            </div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={db.loadAll}>🔄 Retry / refresh</button>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Callibre v{APP_VERSION}</div>
      </div>

      {/* 🔒 SECURITY PASSWORD CARD */}
      <div className="card">
        <div className="card-title">🔒 Change password</div>
        <div className="form-row">
          <div>
            <label className="lbl">New password</label>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Confirm</label>
            <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
        </div>
        <div className="mt">
          <button className="btn" disabled={!pw} onClick={changePassword}>Update password</button>
        </div>
      </div>
    </>
  );
}

function BrandingCard({ brand, saveBrand }) {
  const [name, setName] = useState(brand.name);
  const [tagline, setTagline] = useState(brand.tagline);
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== brand.name || tagline.trim() !== brand.tagline;

  const save = async () => {
    if (!name.trim()) return alert("The app needs a name!");
    setBusy(true);
    const ok = await saveBrand({ name: name.trim(), tagline: tagline.trim() || "Inbound Team Rewards" });
    setBusy(false);
    if (ok) alert("Saved! Everyone sees the new name on their next refresh.");
  };

  return (
    <div className="card">
      <div className="card-title">✨ App branding (Super Admin)</div>
      <div className="form-row">
        <div>
          <label className="lbl">App name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        </div>
        <div>
          <label className="lbl">Tagline</label>
          <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={40} />
        </div>
      </div>
      <div className="mt flex">
        <button className="btn" disabled={!dirty || busy} onClick={save}>
          {busy ? "Saving…" : "Save name"}
        </button>
        <span className="muted">
          Changes the login screen, top bar and browser tab for everyone. The installed
          home-screen app name updates on the next deploy.
        </span>
      </div>
    </div>
  );
}
