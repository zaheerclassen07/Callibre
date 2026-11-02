import { useState, useEffect, useRef } from "react";
import { Search, Check, X, ChevronDown } from "lucide-react";

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Cartoon avatar generator ----------
// Deterministic: the same seed (agent id) always produces the same face,
// so an agent's cartoon avatar stays consistent everywhere without needing
// to store anything extra in the database.
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  let state = h >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

const CARTOON_SKIN_TONES = ["#FFDBAC", "#F1C27D", "#E8B589", "#C68642", "#8D5524", "#FFE0BD"];
const CARTOON_HAIR_COLORS = ["#3B2A20", "#5C4033", "#8B5A2B", "#D4A017", "#2B2B2B", "#7A4A2B", "#A0522D", "#4A3222"];
const CARTOON_BG_PAIRS = [
  ["#A78BFA", "#7C3AED"], ["#60A5FA", "#3B82F6"], ["#6EE7B7", "#10B981"],
  ["#FCA5A5", "#EF4444"], ["#F9A8D4", "#EC4899"], ["#5EEAD4", "#14B8A6"],
  ["#FCD34D", "#F59E0B"], ["#C4B5FD", "#8B5CF6"]
];
const CARTOON_TOP_COLORS = ["#7DD3FC", "#FDE68A", "#FCA5A5", "#C4B5FD", "#A7F3D0", "#FBCFE8"];

export function CartoonAvatar({ seed, size = 34, style = {} }) {
  const rand = seededRandom(String(seed || "agent"));
  const uid = String(seed || "agent").replace(/[^a-zA-Z0-9]/g, "");
  const skin = pick(rand, CARTOON_SKIN_TONES);
  const hairColor = pick(rand, CARTOON_HAIR_COLORS);
  const [bg1, bg2] = pick(rand, CARTOON_BG_PAIRS);
  const topColor = pick(rand, CARTOON_TOP_COLORS);
  const hairStyle = pick(rand, ["wavy", "short", "bald", "curly", "long", "bun"]);
  const eyeStyle = pick(rand, ["round", "happy", "sleepy"]);
  const mouthStyle = pick(rand, ["smile", "grin", "neutral"]);
  const hasGlasses = rand() < 0.55; // big round glasses are the signature look, so bias toward them

  // Slight gradient-based skin shading and a soft drop shadow give a rounder,
  // more dimensional "chibi" look without needing an actual 3D render.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ borderRadius: "50%", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.25)", ...style }}
    >
      <defs>
        <radialGradient id={`bg-${uid}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={bg1} />
          <stop offset="100%" stopColor={bg2} />
        </radialGradient>
        <radialGradient id={`skin-${uid}`} cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor={skin} stopOpacity="1" />
          <stop offset="100%" stopColor={skin} stopOpacity="0.92" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="50" fill={`url(#bg-${uid})`} />

      {/* crossed-arms body silhouette */}
      <path d="M20,100 Q20,74 34,68 L50,80 L66,68 Q80,74 80,100 Z" fill={topColor} />
      <path d="M30,78 Q50,92 70,78 L70,88 Q50,100 30,88 Z" fill="rgba(255,255,255,0.25)" />

      {/* neck */}
      <rect x="42" y="62" width="16" height="14" fill={skin} />

      {/* head - bigger, rounder "chibi" proportions */}
      <ellipse cx="50" cy="42" rx="28" ry="27" fill={`url(#skin-${uid})`} />

      {/* ears */}
      <circle cx="22" cy="44" r="5.5" fill={skin} />
      <circle cx="78" cy="44" r="5.5" fill={skin} />

      {/* hair (behind-head layer for long/wavy styles) */}
      {(hairStyle === "long" || hairStyle === "wavy") && (
        <path
          d="M18,44 Q14,18 50,12 Q86,18 82,44 L84,72 Q76,58 74,44 Q74,26 50,22 Q26,26 26,44 Q24,58 16,72 Z"
          fill={hairColor}
        />
      )}

      {/* face sits on top of the back-hair layer */}
      <ellipse cx="50" cy="42" rx="26" ry="25" fill={`url(#skin-${uid})`} />

      {/* rosy cheeks */}
      <ellipse cx="32" cy="50" rx="5" ry="3.2" fill="#ff9d9d" opacity="0.55" />
      <ellipse cx="68" cy="50" rx="5" ry="3.2" fill="#ff9d9d" opacity="0.55" />

      {/* front hair styles */}
      {hairStyle === "short" && <path d="M22,38 A28,28 0 0,1 78,38 L78,26 Q50,8 22,26 Z" fill={hairColor} />}
      {hairStyle === "bald" && null}
      {hairStyle === "curly" && (
        <g fill={hairColor}>
          <circle cx="24" cy="28" r="9" /><circle cx="37" cy="17" r="10.5" /><circle cx="53" cy="15" r="10.5" />
          <circle cx="68" cy="19" r="10" /><circle cx="77" cy="32" r="8.5" /><circle cx="22" cy="38" r="7" />
        </g>
      )}
      {hairStyle === "long" && (
        <path d="M22,36 Q19,14 50,10 Q81,14 78,36 L78,28 Q50,12 22,28 Z" fill={hairColor} />
      )}
      {hairStyle === "wavy" && (
        <path
          d="M20,36 Q17,12 50,9 Q83,12 80,36 Q77,28 71,30 Q66,20 58,24 Q52,16 44,24 Q36,20 31,30 Q25,28 20,36 Z"
          fill={hairColor}
        />
      )}
      {hairStyle === "bun" && (
        <>
          <path d="M22,38 A28,28 0 0,1 78,38 L78,26 Q50,6 22,26 Z" fill={hairColor} />
          <circle cx="50" cy="8" r="9" fill={hairColor} />
        </>
      )}

      {/* big, soft, sparkly chibi eyes */}
      {eyeStyle === "round" && (
        <>
          <circle cx="38" cy="44" r="6" fill="#2b2320" />
          <circle cx="62" cy="44" r="6" fill="#2b2320" />
          <circle cx="40" cy="41.5" r="1.8" fill="#fff" />
          <circle cx="64" cy="41.5" r="1.8" fill="#fff" />
        </>
      )}
      {eyeStyle === "happy" && (
        <>
          <path d="M32,44 Q38,37 44,44" stroke="#2b2320" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M56,44 Q62,37 68,44" stroke="#2b2320" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {eyeStyle === "sleepy" && (
        <>
          <circle cx="38" cy="44" r="5.4" fill="#2b2320" />
          <circle cx="62" cy="44" r="5.4" fill="#2b2320" />
          <path d="M31,41 Q38,37 45,41" stroke={skin} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M55,41 Q62,37 69,41" stroke={skin} strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* eyebrows */}
      <path d="M31,34 Q38,30 45,33" stroke={hairColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M55,33 Q62,30 69,34" stroke={hairColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* big round glasses, the signature detail from the reference look */}
      {hasGlasses && (
        <g stroke="#33302c" strokeWidth="2.6" fill="rgba(255,255,255,0.12)">
          <circle cx="38" cy="44" r="10.5" />
          <circle cx="62" cy="44" r="10.5" />
          <line x1="48.5" y1="44" x2="51.5" y2="44" />
          <line x1="27.5" y1="41" x2="20" y2="38" strokeLinecap="round" />
          <line x1="72.5" y1="41" x2="80" y2="38" strokeLinecap="round" />
        </g>
      )}

      {/* mouth */}
      {mouthStyle === "smile" && <path d="M40,56 Q50,63 60,56" stroke="#9a5b46" strokeWidth="2.8" fill="none" strokeLinecap="round" />}
      {mouthStyle === "grin" && <path d="M38,55 Q50,67 62,55 Q50,60 38,55 Z" fill="#9a5b46" />}
      {mouthStyle === "neutral" && <path d="M42,58 Q50,60 58,58" stroke="#9a5b46" strokeWidth="2.8" fill="none" strokeLinecap="round" />}
    </svg>
  );
}

export function parseAvatar(colorStr) {
  const def = { type: "solid", color: "var(--accent)", emoji: "", text: "", shape: "circle" };
  if (!colorStr) return def;

  if (colorStr === "cartoon" || colorStr.startsWith("cartoon:")) {
    const variant = colorStr.startsWith("cartoon:") ? colorStr.substring(8) : "";
    return { type: "cartoon", shape: "circle", variant };
  }

  // Format could be: solid:#FF5C5C|emoji:🦊|circle or grad:#FF5C5C:#3498DB:135deg|emoji:🦊|circle or solid:#FF5C5C|initials|rounded
  const parts = colorStr.split("|");
  const bgPart = parts[0] || "";
  const contentPart = parts[1] || "";
  const shapePart = parts[2] || "circle";
  
  if (bgPart.startsWith("grad:")) {
    const bgSub = bgPart.substring(5).split(":"); // hex1:hex2:angle
    def.type = "grad";
    def.color1 = bgSub[0] || "#f1c40f";
    def.color2 = bgSub[1] || "#e67e22";
    def.angle = bgSub[2] || "135deg";
  } else if (bgPart.startsWith("solid:")) {
    def.type = "solid";
    def.color = bgPart.substring(6) || "var(--accent)";
  } else {
    // legacy format, just solid hex or CSS color
    def.type = "solid";
    def.color = colorStr;
  }
  
  if (contentPart.startsWith("emoji:")) {
    def.emoji = contentPart.substring(6);
  } else if (contentPart.startsWith("text:")) {
    def.text = contentPart.substring(5);
  } else if (contentPart === "initials") {
    // defaults to using initials
  }
  
  def.shape = shapePart === "rounded" ? "rounded" : "circle";
  return def;
}

export function Avatar({ agent, size = 34, style = {} }) {
  const avatarData = parseAvatar(agent?.color);

  if (avatarData.type === "cartoon") {
    const seed = `${agent?.id || agent?.name || "agent"}:${avatarData.variant || ""}`;
    return <CartoonAvatar seed={seed} size={size} style={style} />;
  }
  
  let bgStyle = {};
  if (avatarData.type === "grad") {
    bgStyle.background = `linear-gradient(${avatarData.angle}, ${avatarData.color1}, ${avatarData.color2})`;
  } else {
    bgStyle.background = avatarData.color;
  }
  
  const initials = (agent?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
    
  return (
    <div
      className="avatar"
      style={{ 
        width: size, 
        height: size, 
        borderRadius: avatarData.shape === "rounded" ? "10px" : "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "700",
        color: "#fff",
        fontSize: size * 0.38,
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        lineHeight: 1,
        ...bgStyle,
        ...style 
      }}
    >
      {avatarData.emoji ? (
        <span style={{ fontSize: size * 0.52, lineHeight: 1 }}>{avatarData.emoji}</span>
      ) : (
        avatarData.text || initials
      )}
    </div>
  );
}

export function Stat({ num, label }) {
  return (
    <div className="stat">
      <div className="stat-num">{num}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function Progress({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="prog-bar">
      <div className="prog-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SearchableMemberSelect({ 
  agents = [], 
  teams = [],
  selectedIds = [],
  onChange,
  placeholder = "Select team members...",
  multiple = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (teams.find(t => t.id === a.team_id)?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    if (multiple) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter(x => x !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      onChange([id]);
      setIsOpen(false);
    }
  };

  const removeSelected = (id, e) => {
    e.stopPropagation();
    onChange(selectedIds.filter(x => x !== id));
  };

  return (
    <div className="searchable-select-container" ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div 
        className="input select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          alignItems: "center",
          minHeight: "42px",
          height: "auto",
          padding: "6px 12px",
          cursor: "pointer",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", flex: 1, alignItems: "center" }}>
          {selectedIds.length === 0 ? (
            <span className="muted" style={{ fontSize: "13.5px" }}>{placeholder}</span>
          ) : (
            selectedIds.map(id => {
              const agent = agents.find(a => a.id === id);
              if (!agent) return null;
              return (
                <span 
                  key={id} 
                  className="pill" 
                  style={{ 
                    margin: 0, 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "4px",
                    background: "var(--accent)",
                    color: "#111",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: "600",
                    fontSize: "12px"
                  }}
                >
                  <Avatar agent={agent} size={16} />
                  {agent.name}
                  {multiple && (
                    <X 
                      size={12} 
                      style={{ cursor: "pointer", strokeWidth: 3 }} 
                      onClick={(e) => removeSelected(id, e)}
                    />
                  )}
                </span>
              );
            })
          )}
        </div>
        <ChevronDown size={16} className="muted" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>

      {isOpen && (
        <div 
          className="select-dropdown" 
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--navy-solid)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            zIndex: 300,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            maxHeight: "260px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.1)" }}>
            <Search size={14} className="muted" style={{ marginRight: "8px" }} />
            <input 
              type="text" 
              className="select-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or team..."
              style={{
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text)",
                fontSize: "13px",
                width: "100%",
                padding: "4px 0"
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {search && <X size={14} className="muted" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
          </div>

          <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
            {filteredAgents.length === 0 ? (
              <div className="muted" style={{ padding: "12px", textAlign: "center", fontSize: "12px" }}>No results found</div>
            ) : (
              filteredAgents.map(a => {
                const isSelected = selectedIds.includes(a.id);
                const t = teams.find(team => team.id === a.team_id);
                return (
                  <div 
                    key={a.id}
                    className={`select-item ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleSelect(a.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                      background: isSelected ? "rgba(245,200,66,0.1)" : "transparent",
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? "rgba(245,200,66,0.1)" : "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Avatar agent={a} size={20} />
                      <div>
                        <div style={{ fontWeight: isSelected ? "600" : "400", color: isSelected ? "var(--accent)" : "var(--text)" }}>{a.name}</div>
                        {t && <div className="muted" style={{ fontSize: "10.5px" }}>{t.name}</div>}
                      </div>
                    </div>
                    {isSelected && <Check size={14} style={{ color: "var(--accent)" }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
