import { useState, useMemo, useEffect } from "react";
import confetti from "canvas-confetti";
import { Search, Send, Trash2, Award, Flame, Trophy, Smile, MessageSquare, Check, X, Sparkles } from "lucide-react";
import { Avatar, SearchableMemberSelect } from "./ui.jsx";

// Meta Helper functions to serialize / deserialize metadata in the existing 'emoji' column
export function parseKudoMetadata(kudo) {
  const defaultMeta = {
    emoji: kudo.emoji || "🙌",
    theme: "classic",
    reactions: { "🎉": 0, "🔥": 0, "❤️": 0, "👑": 0 },
    comments: []
  };
  
  if (!kudo.emoji) return defaultMeta;
  
  if (!kudo.emoji.includes("|")) {
    return { ...defaultMeta, emoji: kudo.emoji };
  }
  
  try {
    const parts = kudo.emoji.split("|");
    const emoji = parts[0] || "🙌";
    const theme = parts[1] || "classic";
    
    let reactions = { "🎉": 0, "🔥": 0, "❤️": 0, "👑": 0 };
    if (parts[2]) {
      try {
        reactions = { ...reactions, ...JSON.parse(parts[2]) };
      } catch (e) {}
    }
    
    let comments = [];
    if (parts[3]) {
      try {
        comments = JSON.parse(parts[3]);
      } catch (e) {}
    }
    
    return { emoji, theme, reactions, comments };
  } catch (err) {
    console.error("Error parsing kudo metadata:", err);
    return defaultMeta;
  }
}

export function serializeKudoMetadata(emoji, theme, reactions, comments) {
  return [
    emoji,
    theme,
    JSON.stringify(reactions),
    JSON.stringify(comments)
  ].join("|");
}

export default function Kudos({ db, user, agent }) {
  const [activeTab, setActiveTab] = useState("all"); // "all", "team", "given", "received"
  const [searchQuery, setSearchQuery] = useState("");
  
  // Composer state
  const [recipientIds, setRecipientIds] = useState([]);
  const [kudosMsg, setKudosMsg] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🙌");
  const [selectedTheme, setSelectedTheme] = useState("classic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Inline Comment State by Kudo ID
  const [commentInput, setCommentInput] = useState({});
  const [expandedComments, setExpandedComments] = useState({});

  const emojiOptions = ["🙌", "🔥", "🌟", "👑", "🎯", "🚀", "💎", "❤️", "🍿", "🍕", "☕", "🦄", "⚡", "🧠", "🎉"];
  
  const themeOptions = [
    { id: "classic", label: "Classic Team", style: { background: "var(--navy-solid)", border: "1px solid var(--border)" } },
    { id: "cosmic", label: "🌌 Cosmic Space", style: { background: "linear-gradient(135deg, #1e1b4b, #311042)", border: "1px solid #c084fc", boxShadow: "0 0 15px rgba(192, 132, 252, 0.25)" } },
    { id: "fire", label: "🔥 Hot Fire", style: { background: "linear-gradient(135deg, #111, #1e0b0b)", border: "2px solid #ef4444", boxShadow: "0 0 15px rgba(239, 68, 68, 0.3)" } },
    { id: "gold", label: "🏆 Gold Hall", style: { background: "linear-gradient(135deg, #2d2205, #1c1502)", border: "2px solid #f5c842", boxShadow: "0 0 15px rgba(245, 200, 66, 0.35)" } },
    { id: "cyberpunk", label: "🚀 Cyber Punk", style: { background: "linear-gradient(135deg, #020617, #0f172a)", border: "2px solid #06b6d4", boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)" } },
    { id: "bubblegum", label: "🍭 Sweet Pastels", style: { background: "linear-gradient(135deg, #3b0728, #180828)", border: "1px solid #ec4899", boxShadow: "0 0 12px rgba(236, 72, 153, 0.25)" } },
    { id: "zen", label: "🌿 Zen Fresh", style: { background: "linear-gradient(135deg, #062f1e, #0c1a14)", border: "1px solid #10b981", boxShadow: "0 0 12px rgba(16, 185, 129, 0.2)" } }
  ];

  const quickComments = [
    "👏 Pure class!",
    "🔥 Absolutely crushed it!",
    "👑 Absolute legend!",
    "🙌 Highly deserved!",
    "🚀 Outstanding job!",
    "🏆 GOAT vibes!"
  ];

  // Confetti helper
  const triggerConfetti = (type = "basic") => {
    if (type === "frenzy") {
      const duration = 2 * 1000;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 }
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 }
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.7 }
      });
    }
  };

  // Sort kudos posts to display newest first and parse their metadata
  const enrichedKudos = useMemo(() => {
    return db.kudos.map(k => {
      const meta = parseKudoMetadata(k);
      return {
        ...k,
        parsedEmoji: meta.emoji,
        theme: meta.theme,
        reactions: meta.reactions,
        comments: meta.comments,
        totalReactions: Object.values(meta.reactions).reduce((a, b) => a + b, 0)
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [db.kudos]);

  // Filters
  const myTeamId = agent?.team_id;
  const filteredKudos = useMemo(() => {
    return enrichedKudos.filter((k) => {
      // Search matches
      const matchesSearch =
        k.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.receiver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.message.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab matches
      if (activeTab === "all") return true;
      if (activeTab === "team") {
        if (!myTeamId) return false;
        // Find agents on my team
        const teamAgentNames = db.agents
          .filter((a) => a.team_id === myTeamId)
          .map((a) => a.name);
        return teamAgentNames.includes(k.sender_name) || teamAgentNames.includes(k.receiver_name);
      }
      if (activeTab === "given") {
        return agent && k.sender_name === agent.name;
      }
      if (activeTab === "received") {
        return agent && k.receiver_name === agent.name;
      }
      return true;
    });
  }, [enrichedKudos, activeTab, searchQuery, myTeamId, db.agents, agent]);

  // Vibe Champions calculations
  const champions = useMemo(() => {
    const receivedCounts = {};
    const givenCounts = {};
    const celebrationCounts = {};

    db.agents.forEach(a => {
      receivedCounts[a.name] = 0;
      givenCounts[a.name] = 0;
      celebrationCounts[a.name] = 0;
    });

    enrichedKudos.forEach(k => {
      if (receivedCounts[k.receiver_name] !== undefined) {
        receivedCounts[k.receiver_name]++;
      } else {
        receivedCounts[k.receiver_name] = 1;
      }

      if (givenCounts[k.sender_name] !== undefined) {
        givenCounts[k.sender_name]++;
      } else {
        givenCounts[k.sender_name] = 1;
      }

      const totalClaps = k.totalReactions;
      if (celebrationCounts[k.receiver_name] !== undefined) {
        celebrationCounts[k.receiver_name] += totalClaps;
      } else {
        celebrationCounts[k.receiver_name] = totalClaps;
      }
    });

    const mapSorted = (obj) => {
      return Object.entries(obj)
        .map(([name, count]) => {
          const matchedAgent = db.agents.find(a => a.name === name);
          return { name, count, agent: matchedAgent };
        })
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    };

    return {
      topReceivers: mapSorted(receivedCounts),
      topGivers: mapSorted(givenCounts),
      mostCelebrated: mapSorted(celebrationCounts)
    };
  }, [enrichedKudos, db.agents]);

  const handleSendKudos = async (e) => {
    e.preventDefault();
    if (!kudosMsg.trim()) return alert("Write a message first!");
    if (recipientIds.length === 0) return alert("Select at least one recipient!");
    if (!agent) return alert("You need a linked Agent profile to send Kudos!");

    setIsSubmitting(true);
    let allSuccess = true;

    for (const rId of recipientIds) {
      const receiver = db.agents.find(a => a.id === rId);
      if (!receiver) continue;

      const serializedEmoji = serializeKudoMetadata(
        selectedEmoji,
        selectedTheme,
        { "🎉": 0, "🔥": 0, "❤️": 0, "👑": 0 },
        []
      );

      const success = await db.addKudos({
        sender_id: agent.id,
        sender_name: agent.name,
        receiver_id: receiver.id,
        receiver_name: receiver.name,
        message: kudosMsg.trim().slice(0, 200),
        emoji: serializedEmoji
      });
      if (!success) allSuccess = false;
    }

    setIsSubmitting(false);
    if (allSuccess) {
      triggerConfetti("frenzy");
      setKudosMsg("");
      setRecipientIds([]);
      setSelectedEmoji("🙌");
      setSelectedTheme("classic");
    }
  };

  const handleCelebrate = async (kudoId, reactionType) => {
    const kudo = db.kudos.find(k => k.id === kudoId);
    if (!kudo) return;

    triggerConfetti("basic");

    const meta = parseKudoMetadata(kudo);
    const updatedReactions = { ...meta.reactions };
    updatedReactions[reactionType] = (updatedReactions[reactionType] || 0) + 1;

    const serialized = serializeKudoMetadata(
      meta.emoji,
      meta.theme,
      updatedReactions,
      meta.comments
    );

    await db.updateKudos(kudoId, { emoji: serialized });
  };

  const handleAddComment = async (kudoId, commentText = null) => {
    const textToPost = commentText || commentInput[kudoId];
    if (!textToPost || !textToPost.trim()) return;
    if (!agent) return alert("You must have a linked Agent profile to add banter!");

    const kudo = db.kudos.find(k => k.id === kudoId);
    if (!kudo) return;

    const meta = parseKudoMetadata(kudo);
    const newComment = {
      id: Math.random().toString(36).substring(2, 9),
      sender_name: agent.name,
      agent_id: agent.id,
      text: textToPost.trim(),
      created_at: new Date().toISOString()
    };

    const updatedComments = [...meta.comments, newComment];

    const serialized = serializeKudoMetadata(
      meta.emoji,
      meta.theme,
      meta.reactions,
      updatedComments
    );

    const success = await db.updateKudos(kudoId, { emoji: serialized });
    if (success) {
      setCommentInput(prev => ({ ...prev, [kudoId]: "" }));
      setExpandedComments(prev => ({ ...prev, [kudoId]: true }));
    }
  };

  const handleKeyPressComment = (e, kudoId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment(kudoId);
    }
  };

  const toggleComments = (id) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Get matching styles for kudo cards based on theme selection
  const getCardThemeStyles = (themeId) => {
    switch (themeId) {
      case "cosmic":
        return {
          background: "linear-gradient(135deg, #131135 0%, #280a3c 100%)",
          border: "2px solid #a855f7",
          boxShadow: "0 8px 30px rgba(168, 85, 247, 0.2)",
          color: "#fff",
          position: "relative",
          overflow: "hidden"
        };
      case "fire":
        return {
          background: "linear-gradient(135deg, #1c1111 0%, #0c0202 100%)",
          border: "2px solid #ef4444",
          boxShadow: "0 8px 30px rgba(239, 68, 68, 0.25)",
          color: "#fff"
        };
      case "gold":
        return {
          background: "linear-gradient(135deg, #2a1f05 0%, #151002 100%)",
          border: "2px solid #f5c842",
          boxShadow: "0 8px 30px rgba(245, 200, 66, 0.25)",
          color: "#fff"
        };
      case "cyberpunk":
        return {
          background: "linear-gradient(135deg, #020617 0%, #0b1329 100%)",
          border: "2px solid #06b6d4",
          boxShadow: "0 8px 30px rgba(6, 182, 212, 0.3)",
          color: "#fff",
          fontFamily: "var(--app-font-mono, monospace)"
        };
      case "bubblegum":
        return {
          background: "linear-gradient(135deg, #2e0821 0%, #140526 100%)",
          border: "2px solid #ec4899",
          boxShadow: "0 8px 30px rgba(236, 72, 153, 0.2)"
        };
      case "zen":
        return {
          background: "linear-gradient(135deg, #042517 0%, #06110a 100%)",
          border: "2px solid #10b981",
          boxShadow: "0 8px 30px rgba(16, 185, 129, 0.15)",
          color: "#fff"
        };
      default:
        return {
          background: "var(--navy-solid, #152238)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.15)"
        };
    }
  };

  return (
    <div className="kudos-hub" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", minHeight: "80vh", fontFamily: "var(--app-font), sans-serif" }}>
      
      {/* LEFT COLUMN: Feed and Composer */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* COMPOSER CARD */}
        {agent ? (
          <div className="card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 4px" }}>
              <Sparkles style={{ color: "var(--accent)" }} size={18} />
              Spread the Vibe & Banter!
            </h2>
            <p className="muted" style={{ fontSize: "12.5px", margin: "0 0 16px" }}>
              Post custom peer-appreciation cards. Elevate your colleagues, trigger dynamic confetti, and start playful comms banter!
            </p>

            <form onSubmit={handleSendKudos} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* MEMBER SELECT */}
              <div>
                <label className="lbl" style={{ marginTop: 0, marginBottom: "6px" }}>Select Colleague(s) to Praise</label>
                <SearchableMemberSelect 
                  agents={db.agents.filter((a) => a.id !== agent.id)}
                  teams={db.teams}
                  selectedIds={recipientIds}
                  onChange={setRecipientIds}
                  placeholder="Who deserves recognition today?"
                  multiple={true}
                />
              </div>

              {/* MESSAGE & SELECT STYLE ROW */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "16px" }}>
                <div>
                  <label className="lbl" style={{ marginTop: 0, marginBottom: "6px" }}>Appreciation message ({200 - kudosMsg.length} characters left)</label>
                  <textarea 
                    className="input" 
                    rows={3} 
                    maxLength={200}
                    value={kudosMsg} 
                    onChange={(e) => setKudosMsg(e.target.value)} 
                    placeholder="Type an epic shout-out, banter, or thanks... (e.g. 'Saved my skin with that tricky client call! Absolute legend!')"
                    required
                    style={{ resize: "none" }}
                  />
                </div>

                {/* THEME SELECTOR & PREVIEW */}
                <div>
                  <label className="lbl" style={{ marginTop: 0, marginBottom: "6px" }}>Vibe Card Style</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <select 
                      className="input"
                      value={selectedTheme} 
                      onChange={(e) => setSelectedTheme(e.target.value)}
                    >
                      {themeOptions.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>

                    {/* LIVE CARD MINI PREVIEW */}
                    <div style={{ 
                      borderRadius: "10px", 
                      padding: "10px 12px", 
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      ...getCardThemeStyles(selectedTheme),
                      transition: "all 0.2s ease",
                      borderWidth: "1px"
                    }}>
                      <span style={{ fontSize: "20px" }}>{selectedEmoji}</span>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        <strong style={{ color: "var(--accent)" }}>{agent.name}</strong> 
                        <span style={{ opacity: 0.7, margin: "0 4px" }}>→</span>
                        <span>{recipientIds.length > 0 ? `${recipientIds.length} select` : "Colleague"}</span>
                        <div style={{ opacity: 0.9, fontSize: "10px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {kudosMsg.trim() ? `"${kudosMsg.slice(0, 30)}..."` : "Draft message..."}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* REACTION VIBE PICKER */}
              <div>
                <label className="lbl" style={{ marginTop: 0, marginBottom: "8px" }}>Select reaction vibe emoji</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  {emojiOptions.slice(0, 10).map((e) => (
                    <button 
                      type="button"
                      key={e} 
                      className={`emoji-option ${selectedEmoji === e ? "active" : ""}`}
                      onClick={() => setSelectedEmoji(e)}
                      style={{ 
                        fontSize: "18px", 
                        padding: "8px 12px", 
                        borderRadius: "8px",
                        background: selectedEmoji === e ? "var(--accent)" : "rgba(255,255,255,0.03)",
                        border: selectedEmoji === e ? "1px solid var(--accent)" : "1px solid var(--border)",
                        color: selectedEmoji === e ? "#111" : "inherit",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {e}
                    </button>
                  ))}
                  
                  <div style={{ position: "relative" }}>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-ghost" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{ fontSize: "11.5px", padding: "6px 10px" }}
                    >
                      More {showEmojiPicker ? "✕" : "▼"}
                    </button>

                    {showEmojiPicker && (
                      <div style={{
                        position: "absolute",
                        bottom: "calc(100% + 8px)",
                        left: 0,
                        background: "var(--navy-solid, #152238)",
                        border: "1px solid var(--border)",
                        padding: "10px",
                        borderRadius: "10px",
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: "6px",
                        zIndex: 200,
                        boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                        width: "180px"
                      }}>
                        {emojiOptions.map(e => (
                          <span 
                            key={e}
                            onClick={() => { setSelectedEmoji(e); setShowEmojiPicker(false); }}
                            style={{ fontSize: "20px", padding: "4px", cursor: "pointer", textAlign: "center", borderRadius: "4px" }}
                            className="hover-bright"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* POST BUTTON */}
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ alignSelf: "flex-end", padding: "10px 24px", minWidth: "180px", fontWeight: "700" }}
                disabled={isSubmitting || recipientIds.length === 0 || !kudosMsg.trim()}
              >
                {isSubmitting ? "Sharing vibes..." : "Blast Kudos Card! 🚀"}
              </button>

            </form>
          </div>
        ) : (
          <div className="card" style={{ padding: "16px", textAlign: "center" }}>
            <div className="muted" style={{ fontSize: "13.5px" }}>
              👤 Your user login isn't linked to an agent profile. Ask an administrator to link your account in <strong>Admin → Users</strong> to post kudos!
            </div>
          </div>
        )}

        {/* FEED CONTROLS AND WALL */}
        <div className="card" style={{ padding: "20px" }}>
          
          {/* SEARCH & FILTERS ROW */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "16px" }}>
            
            {/* SEARCH INPUT */}
            <div style={{ position: "relative", flex: "1", minWidth: "220px" }}>
              <Search size={16} className="muted" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="text" 
                className="input" 
                placeholder="Search colleagues or vibes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "36px", height: "38px", fontSize: "13px" }}
              />
              {searchQuery && (
                <X 
                  size={14} 
                  className="muted" 
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>

            {/* TAB BUTTONS */}
            <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.15)", padding: "4px", borderRadius: "10px" }}>
              {[
                { id: "all", label: "🌐 All Office" },
                ...(myTeamId ? [{ id: "team", label: "🛡️ My Team" }] : []),
                { id: "received", label: "📥 Received" },
                { id: "given", label: "📤 Sent" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    background: activeTab === t.id ? "var(--navy3-solid, #1e2d42)" : "transparent",
                    color: activeTab === t.id ? "var(--accent)" : "var(--muted)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* STREAM OF KUDOS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {filteredKudos.map((k) => {
              const cardStyles = getCardThemeStyles(k.theme);
              const senderAgent = db.agents.find(a => a.name === k.sender_name);
              const receiverAgent = db.agents.find(a => a.name === k.receiver_name);
              
              const isMyPost = agent && k.sender_name === agent.name;
              
              return (
                <div 
                  key={k.id} 
                  className="kudo-interactive-card"
                  style={{
                    ...cardStyles,
                    borderRadius: "14px",
                    padding: "20px",
                    position: "relative",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  
                  {/* GLOW DECORATIONS FOR SPECIAL THEMES */}
                  {k.theme !== "classic" && (
                    <div style={{
                      position: "absolute",
                      top: 10,
                      right: 12,
                      opacity: 0.2,
                      fontSize: "30px",
                      pointerEvents: "none",
                      userSelect: "none"
                    }}>
                      {k.parsedEmoji}
                    </div>
                  )}

                  {/* HEADER */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                    
                    {/* AVATARS & RECIPIENTS */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                        <Avatar agent={senderAgent} size={36} />
                        <div style={{ width: "8px" }} />
                        <span style={{ fontSize: "14px", opacity: 0.7 }}>→</span>
                        <div style={{ width: "8px" }} />
                        <Avatar agent={receiverAgent} size={36} />
                      </div>

                      <div>
                        <div style={{ fontSize: "13.5px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ color: "var(--accent)" }}>{k.sender_name}</span> 
                          <span className="muted" style={{ fontWeight: "400" }}>praised</span> 
                          <span>{k.receiver_name}</span>
                        </div>
                        <div className="muted" style={{ fontSize: "10.5px" }}>
                          {new Date(k.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(k.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    {/* CORE EMOJI CROWN */}
                    <div style={{
                      fontSize: "24px",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: "50%",
                      width: "44px",
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.06)"
                    }}>
                      {k.parsedEmoji}
                    </div>
                  </div>

                  {/* BODY TEXT */}
                  <div style={{ padding: "0 4px", marginBottom: "16px" }}>
                    <p style={{ 
                      fontSize: "14.5px", 
                      lineHeight: "1.5", 
                      margin: 0, 
                      fontStyle: k.theme === "cyberpunk" ? "normal" : "italic",
                      fontWeight: "500",
                      letterSpacing: "0.2px"
                    }}>
                      "{k.message}"
                    </p>
                  </div>

                  {/* REACTION & BANTER ACTIONS DECK */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    borderTop: "1px solid rgba(255,255,255,0.08)", 
                    paddingTop: "12px",
                    gap: "10px",
                    flexWrap: "wrap"
                  }}>
                    
                    {/* EMOJI REACTIONS BAR */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      {Object.entries(k.reactions).map(([emojiChar, count]) => {
                        const hasReacted = false; // Simple local toggle or counter
                        return (
                          <button
                            key={emojiChar}
                            onClick={() => handleCelebrate(k.id, emojiChar)}
                            style={{
                              background: count > 0 ? "rgba(245, 200, 66, 0.15)" : "rgba(255, 255, 255, 0.03)",
                              border: count > 0 ? "1px solid rgba(245, 200, 66, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                              color: count > 0 ? "var(--accent)" : "var(--muted)",
                              padding: "4px 9px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: count > 0 ? "700" : "400",
                              transition: "all 0.1s ease"
                            }}
                            className="reaction-bubble-btn"
                          >
                            <span>{emojiChar}</span>
                            <span style={{ fontSize: "11px", opacity: 0.9 }}>{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* BANTER BUTTONS */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      
                      <button 
                        onClick={() => toggleComments(k.id)}
                        className="btn btn-sm btn-ghost"
                        style={{ 
                          fontSize: "11.5px", 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "4px", 
                          padding: "4px 8px"
                        }}
                      >
                        <MessageSquare size={13} />
                        Banter Threads ({k.comments.length})
                      </button>

                      {isMyPost && (
                        <button
                          onClick={() => {
                            if (confirm("Delete this Kudos card?")) {
                              db.removeKudos(k.id);
                            }
                          }}
                          className="btn btn-sm"
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            border: "none",
                            padding: "4px 8px"
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* EXPANDED COMMENTS SECTION */}
                  {expandedComments[k.id] && (
                    <div style={{
                      marginTop: "12px",
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "10px",
                      padding: "12px",
                      border: "1px solid rgba(255,255,255,0.05)"
                    }}>
                      
                      {/* PREVIOUS COMMENTS */}
                      {k.comments.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px", maxHeight: "160px", overflowY: "auto", paddingRight: "4px" }}>
                          {k.comments.map((comm) => {
                            const cAgent = db.agents.find(a => a.id === comm.agent_id);
                            return (
                              <div key={comm.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "11.5px" }}>
                                <Avatar agent={cAgent} size={20} />
                                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "6px 10px", flex: 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                    <strong style={{ color: "var(--accent)" }}>{comm.sender_name}</strong>
                                    <span className="muted" style={{ fontSize: "9px" }}>
                                      {comm.created_at ? new Date(comm.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                    </span>
                                  </div>
                                  <div style={{ color: "var(--text)" }}>{comm.text}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="muted" style={{ fontSize: "11px", margin: "0 0 10px", textAlign: "center" }}>
                          No banter yet. Be the first to start the celebration thread!
                        </p>
                      )}

                      {/* QUICK BANTER CHIPS */}
                      {agent && (
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "10px" }}>
                          {quickComments.map(qText => (
                            <button
                              key={qText}
                              onClick={() => handleAddComment(k.id, qText)}
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "var(--text)",
                                borderRadius: "12px",
                                padding: "3px 8px",
                                fontSize: "10.5px",
                                cursor: "pointer",
                                transition: "background 0.15s"
                              }}
                              className="hover-bright"
                            >
                              {qText}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* BANTER INPUT */}
                      {agent ? (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input 
                            type="text"
                            className="input"
                            placeholder="Add your celebrate banter or joke..."
                            value={commentInput[k.id] || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCommentInput(prev => ({ ...prev, [k.id]: v }));
                            }}
                            onKeyDown={(e) => handleKeyPressComment(e, k.id)}
                            style={{ height: "32px", fontSize: "11.5px", padding: "4px 10px" }}
                          />
                          <button 
                            onClick={() => handleAddComment(k.id)}
                            className="btn btn-primary"
                            style={{ height: "32px", width: "32px", minWidth: "32px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px" }}
                            disabled={!(commentInput[k.id] || "").trim()}
                          >
                            <Send size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="muted" style={{ fontSize: "10px", textAlign: "center" }}>
                          Link an Agent account to comment.
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}

            {filteredKudos.length === 0 && (
              <div className="muted" style={{ textAlign: "center", padding: "60px 0" }}>
                ☕ The vibe stream is quiet. Be the legendary hero who ignites the kudos wall today!
              </div>
            )}

          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: Hall of Fame & Vibe Leaderboard */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* VIBE CHAMPIONS WALL */}
        <div className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
            <Trophy style={{ color: "#f5c842" }} size={16} />
            Kudos Hall of Fame 🏆
          </h3>

          {/* SECTION 1: TOP RECEIVERS (VIBE MAGNETS) */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--accent)", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Award size={13} />
              Vibe Magnets (Most Appreciated)
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {champions.topReceivers.length > 0 ? (
                champions.topReceivers.map((item, idx) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", width: "16px" }} className="muted">#{idx + 1}</span>
                      <Avatar agent={item.agent} size={22} />
                      <span style={{ fontSize: "12.5px", fontWeight: "600" }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: "11.5px", fontWeight: "700", background: "rgba(245, 200, 66, 0.1)", color: "var(--accent)", padding: "2px 8px", borderRadius: "10px" }}>
                      {item.count} Kudos Received
                    </span>
                  </div>
                ))
              ) : (
                <div className="muted" style={{ fontSize: "11.5px", padding: "4px" }}>No kudos data yet</div>
              )}
            </div>
          </div>

          {/* SECTION 2: TOP GIVERS (POSITIVITY ENGINE) */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--teal, #00c9a7)", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Flame size={13} />
              Appreciators (Spreading Joy)
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {champions.topGivers.length > 0 ? (
                champions.topGivers.map((item, idx) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", width: "16px" }} className="muted">#{idx + 1}</span>
                      <Avatar agent={item.agent} size={22} />
                      <span style={{ fontSize: "12.5px", fontWeight: "600" }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: "11.5px", fontWeight: "700", background: "rgba(0, 201, 167, 0.1)", color: "var(--teal, #00c9a7)", padding: "2px 8px", borderRadius: "10px" }}>
                      {item.count} Given
                    </span>
                  </div>
                ))
              ) : (
                <div className="muted" style={{ fontSize: "11.5px", padding: "4px" }}>No kudos data yet</div>
              )}
            </div>
          </div>

          {/* SECTION 3: MOST CELEBRATED */}
          <div>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#ec4899", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={13} />
              Celebrated Icons (Most Claps)
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {champions.mostCelebrated.length > 0 ? (
                champions.mostCelebrated.map((item, idx) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", width: "16px" }} className="muted">#{idx + 1}</span>
                      <Avatar agent={item.agent} size={22} />
                      <span style={{ fontSize: "12.5px", fontWeight: "600" }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: "11.5px", fontWeight: "700", background: "rgba(236, 72, 153, 0.1)", color: "#ec4899", padding: "2px 8px", borderRadius: "10px" }}>
                      👏 {item.count} Claps
                    </span>
                  </div>
                ))
              ) : (
                <div className="muted" style={{ fontSize: "11.5px", padding: "4px" }}>No claps received yet</div>
              )}
            </div>
          </div>

        </div>

        {/* FUN BANTER MOTIVATION BOARD */}
        <div className="card" style={{ padding: "20px", background: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.25))" }}>
          <div className="card-title" style={{ fontSize: "13.5px" }}>📢 Comms Guidelines</div>
          <p style={{ fontSize: "12px", lineHeight: "1.5", margin: "0 0 10px" }} className="muted">
            1. **Keep it sweet** — peer appreciation boosts office morale by 40%!
          </p>
          <p style={{ fontSize: "12px", lineHeight: "1.5", margin: "0 0 10px" }} className="muted">
            2. **Healthy banter only** — jokes are encouraged, let's keep it clean and positive.
          </p>
          <p style={{ fontSize: "12px", lineHeight: "1.5", margin: 0 }} className="muted">
            3. **Be generous with celebrations** — clapping on your colleagues' posts throws confetti and counts towards their Hall of Fame score!
          </p>
        </div>

      </div>

    </div>
  );
}
