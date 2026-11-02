import { THEMES } from "./constants.js";

// Injects a full stylesheet for the active theme. Same fonts, variables
// and visual language as the original build, with custom fonts, glassmorphism and animations.
export function makeCSS(theme, font = "DM Sans", glassActive = false, glassTint = "tinted", customAccent = "", customAccent2 = "") {
  let customThemes = [];
  try {
    const stored = localStorage.getItem("db_custom_themes");
    if (stored) customThemes = JSON.parse(stored);
  } catch (e) {
    console.warn("Could not load custom themes in makeCSS:", e);
  }

  const t = THEMES[theme] || customThemes.find(ct => ct.id === theme) || THEMES.navy_gold;
  
  const accentColor = customAccent || t.accent;
  const accentColor2 = customAccent2 || t.accent2 || accentColor;

  // Font-family mapping
  let fontFamily = "'DM Sans', sans-serif";
  if (font === "Space Grotesk") fontFamily = "'Space Grotesk', sans-serif";
  if (font === "Inter") fontFamily = "'Inter', sans-serif";
  if (font === "Playfair Display") fontFamily = "'Playfair Display', serif";
  if (font === "JetBrains Mono") fontFamily = "'JetBrains Mono', monospace";

  // Glassmorphism overrides
  const isDarkTheme = t.isDark !== false;
  let panelGlass = t.panel;
  let navy2Glass = t.navy2;
  let navy3Glass = t.navy3;
  let borderGlass = t.border;
  const glassBlur = glassActive ? "blur(20px) saturate(120%)" : "none";

  if (glassActive) {
    if (glassTint === "clear") {
      panelGlass = isDarkTheme ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.15)";
      navy2Glass = isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.22)";
      navy3Glass = isDarkTheme ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.28)";
      borderGlass = isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
    } else {
      panelGlass = isDarkTheme ? "rgba(22, 32, 54, 0.45)" : "rgba(255, 255, 255, 0.45)";
      navy2Glass = isDarkTheme ? "rgba(17, 28, 48, 0.55)" : "rgba(240, 244, 248, 0.55)";
      navy3Glass = isDarkTheme ? "rgba(28, 40, 64, 0.5)" : "rgba(255, 255, 255, 0.55)";
      borderGlass = isDarkTheme ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)";
    }
  }

  return `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy:   ${t.navy};
    --navy2:  ${navy2Glass};
    --navy3:  ${navy3Glass};
    --navy-solid: ${t.navy2};
    --navy3-solid: ${t.navy3};
    --panel:  ${panelGlass};
    --border: ${borderGlass};
    --accent: ${accentColor};
    --accent2:${accentColor2};
    --teal:   #00C9A7;
    --red:    #FF5C5C;
    --text:   ${t.isDark ? "#EEF2FF" : "#1F2937"};
    --muted:  ${t.isDark ? "#7A8EAA" : "#6B7280"};
    --r:      14px;
    --app-font: ${fontFamily};
    --glass-blur: ${glassBlur};
  }
  html{height:100%;overflow-x:hidden}
  body{background:var(--navy);color:var(--text);font-family:var(--app-font),sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;transition:background 0.3s, color 0.3s;position:relative}
  ${glassActive ? `
  body::before, body::after {
    content: '';
    position: fixed;
    z-index: -1;
    border-radius: 50%;
    filter: blur(90px);
    opacity: ${isDarkTheme ? 0.35 : 0.28};
    pointer-events: none;
  }
  body::before {
    top: -12%; left: -8%;
    width: 55vw; height: 55vw;
    background: radial-gradient(circle, ${accentColor}, transparent 70%);
  }
  body::after {
    bottom: -18%; right: -10%;
    width: 60vw; height: 60vw;
    background: radial-gradient(circle, ${accentColor2}, transparent 70%);
  }
  ` : ""}
  #root{min-height:100vh}
  ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:6px} ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2)}

  .app{display:flex;flex-direction:column;min-height:100vh}
  .topbar{background:var(--navy2);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border-bottom:1px solid var(--border);padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:64px;position:sticky;top:0;z-index:100;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15)}
  .topbar-brand{font-family:'Bebas Neue';font-size:28px;letter-spacing:2.5px;color:var(--accent);flex-shrink:0;background:linear-gradient(135deg, var(--accent) 30%, var(--teal) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .topbar-right{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .role-chip{font-size:10px;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--muted);font-weight:700;letter-spacing:.5px;text-transform:uppercase}
  .sync-dot{width:8px;height:8px;border-radius:50%;background:var(--teal);display:inline-block;box-shadow:0 0 10px var(--teal)}

  .nav{background:var(--navy2);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border-bottom:1px solid var(--border);display:flex;padding:0 20px;overflow-x:auto;scrollbar-width:none}
  .nav::-webkit-scrollbar{display:none}
  .nav-btn{padding:14px 20px;background:none;border:none;color:var(--muted);font-family:var(--app-font),sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;transition:all .25s ease;position:relative}
  .nav-btn:hover{color:var(--text)}
  .nav-btn.active{color:var(--accent);font-weight:700}
  .nav-btn.active::after{content:'';position:absolute;bottom:0;left:15%;right:15%;height:3px;background:var(--accent);border-top-left-radius:3px;border-top-right-radius:3px;box-shadow:0 -1px 8px var(--accent)}

  .main{flex:1;padding:24px;max-width:1200px;width:100%;margin:0 auto}
  .banner{background:linear-gradient(90deg,var(--accent),var(--teal));color:#111;padding:12px 24px;font-size:13px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:12px;box-shadow:0 4px 15px rgba(0,0,0,0.2)}

  .card{background:var(--panel);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--border);border-radius:var(--r);padding:24px;margin-bottom:24px;box-shadow:0 8px 32px rgba(0,0,0,0.12);transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, box-shadow 0.25s, background-color 0.25s}
  .card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,0.15);box-shadow:0 12px 40px rgba(0,0,0,0.22)}
  .card-title{font-size:11.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:8px}
  .grid{display:grid;gap:20px}
  .grid-2{grid-template-columns:repeat(2,1fr)}
  .grid-3{grid-template-columns:repeat(3,1fr)}
  .grid-4{grid-template-columns:repeat(4,1fr)}

  .leaderboard-layout{display:grid;grid-template-columns:1fr;gap:24px}
  @media(min-width:1024px){
    .leaderboard-layout{grid-template-columns:1.25fr 0.75fr}
  }
  .leaderboard-main-col{display:flex;flex-direction:column;gap:24px}
  .leaderboard-side-col{display:flex;flex-direction:column;gap:24px}

  .stat{background:var(--navy3);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border-radius:12px;padding:16px;text-align:center;border:1px solid var(--border);transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, box-shadow 0.25s}
  .stat:hover{transform:translateY(-3px);border-color:var(--accent);box-shadow:0 8px 24px rgba(0,0,0,0.15)}
  .stat-num{font-family:'Bebas Neue';font-size:36px;color:var(--accent);line-height:1;letter-spacing:0.5px}
  .stat-label{font-size:11px;color:var(--muted);margin-top:6px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}

  .btn{background:var(--accent);color:#111;border:none;border-radius:10px;padding:11px 20px;font-family:var(--app-font),sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s cubic-bezier(0.16, 1, 0.3, 1);box-shadow:0 4px 14px rgba(245, 200, 66, 0.15)}
  .btn:hover{background:var(--accent2);transform:translateY(-2px);box-shadow:0 6px 20px rgba(245, 200, 66, 0.25)}
  .btn:active{transform:translateY(1px)}
  .btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
  .btn-ghost{background:transparent;color:var(--text);border:1px solid var(--border);box-shadow:none}
  .btn-ghost:hover{background:var(--navy3);border-color:rgba(255,255,255,0.15)}
  .btn-danger{background:transparent;border:1px solid var(--red);color:var(--red);box-shadow:none}
  .btn-danger:hover{background:var(--red);color:#fff;box-shadow:0 4px 14px rgba(255,92,92,0.2)}
  .btn-sm{padding:7px 12px;font-size:12px;border-radius:8px}

  .input,select.input,textarea.input{background:var(--navy3);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:11px 14px;font-family:var(--app-font),sans-serif;font-size:13.5px;width:100%;transition:all 0.2s}
  select, select.input, select.input option, option { background-color: var(--navy3-solid) !important; color: var(--text) !important; background: var(--navy3-solid) !important; }
  .input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(245, 200, 66, 0.12)}
  label.lbl{display:block;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin:12px 0 6px}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}

  table.tbl{width:100%;border-collapse:collapse;font-size:13px}
  .tbl th{text-align:left;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.8px;padding:12px 8px;border-bottom:1px solid var(--border);font-weight:700}
  .tbl td{padding:14px 8px;border-bottom:1px solid var(--border);vertical-align:middle}
  .tbl tr:last-child td{border-bottom:none}

  .lb-row{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:12px;margin-bottom:2px;background:var(--navy3);border:1px solid transparent;transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1)}
  .lb-row:hover{background:rgba(255,255,255,0.025);border-color:rgba(255,255,255,0.08);transform:translateY(-2px)}
  .lb-row.me{background:rgba(245, 200, 66, 0.04);border-color:rgba(245, 200, 66, 0.3);box-shadow:0 4px 20px rgba(245,200,66,0.06)}
  .lb-rank{font-family:'Bebas Neue';font-size:24px;width:34px;color:var(--muted);text-align:center}
  .lb-rank.top{color:var(--accent);font-size:26px}
  .lb-name{flex:1;font-weight:600;font-size:14px;display:flex;align-items:center;gap:4px}
  .lb-pts{font-family:'JetBrains Mono';font-weight:700;color:var(--accent)}
  .avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:13.5px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.25)}

  .agent-hero{display:flex;align-items:center;gap:20px;margin-bottom:8px}
  .hero-avatar{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue';font-size:32px;color:#fff;box-shadow:0 4px 15px rgba(0,0,0,0.3)}
  .pill{display:inline-flex;align-items:center;gap:6px;background:var(--navy3);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;margin-right:6px;transition:all 0.15s}

  .badge-tile{background:var(--navy3);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--border);transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1)}
  .badge-tile:hover:not(.locked){border-color:var(--accent);transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.15)}
  .badge-tile.locked{opacity:.35;filter:grayscale(1)}
  .badge-icon{font-size:32px}
  .badge-name{font-size:12px;font-weight:700;margin-top:6px}
  .badge-desc{font-size:11px;color:var(--muted);margin-top:4px}

  .prize-tile{background:var(--navy3);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border-radius:12px;padding:18px;border:1px solid var(--border);display:flex;flex-direction:column;gap:8px;transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1)}
  .prize-tile:hover{border-color:var(--accent);transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.15)}
  .prize-icon{font-size:28px}
  .prize-name{font-weight:700;font-size:14.5px}
  .prize-cost{font-family:'JetBrains Mono';color:var(--accent);font-weight:700}

  .prog-bar{height:10px;background:var(--navy2);border-radius:8px;overflow:hidden;margin-top:6px}
  .prog-fill{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--accent),var(--teal));transition:width .8s cubic-bezier(0.16, 1, 0.3, 1)}

  .swatch{width:32px;height:32px;border-radius:50%;cursor:pointer;transition:transform .15s;border:3px solid transparent}
  .swatch:hover{transform:scale(1.15)}
  .swatch.active{border-color:white}

  .req-badge{background:var(--red);color:white;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-left:6px}

  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px;animation:fadeIn 0.2s ease-out}
  .modal{background:var(--navy2);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--border);border-radius:18px;padding:28px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.5);animation:slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)}
  .modal-title{font-family:'Bebas Neue';font-size:24px;letter-spacing:1px;color:var(--accent);margin-bottom:16px}

  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(15px)} to{opacity:1;transform:translateY(0)} }

  /* Premium Animated Login Styles */
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    background: radial-gradient(circle at 50% 50%, var(--navy2) 0%, var(--navy) 100%);
    overflow: hidden;
  }
  .login-bg-glow1 {
    position: absolute;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(245, 200, 66, 0.12) 0%, transparent 70%);
    top: -200px;
    left: -100px;
    filter: blur(80px);
    animation: floatGlow 14s infinite alternate ease-in-out;
    pointer-events: none;
  }
  .login-bg-glow2 {
    position: absolute;
    width: 700px;
    height: 700px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 251, 167, 0.1) 0%, transparent 70%);
    bottom: -300px;
    right: -150px;
    filter: blur(100px);
    animation: floatGlow 18s infinite alternate-reverse ease-in-out;
    pointer-events: none;
  }
  @keyframes floatGlow {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(80px, 50px) scale(1.15); }
  }
  .login-card {
    background: rgba(25, 33, 50, 0.55);
    backdrop-filter: blur(24px) saturate(130%);
    -webkit-backdrop-filter: blur(24px) saturate(130%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 28px;
    padding: 56px 44px;
    width: 100%;
    max-width: 440px;
    text-align: center;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.1);
    animation: cardEntrance 0.85s cubic-bezier(0.16, 1, 0.3, 1) both;
    position: relative;
    z-index: 5;
  }
  @keyframes cardEntrance {
    0% { opacity: 0; transform: translateY(40px) scale(0.95); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .login-brand {
    font-family: 'Bebas Neue';
    font-size: 58px;
    letter-spacing: 5px;
    background: linear-gradient(135deg, var(--accent) 0%, #ffffff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
  }
  .login-sub {
    font-size: 14px;
    color: var(--muted);
    margin-bottom: 36px;
    font-weight: 500;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }

  /* Beautiful Spaced Input Styles */
  .login-input-group {
    margin-bottom: 22px;
    text-align: left;
    position: relative;
  }
  .login-input-label {
    display: block;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
    padding-left: 2px;
  }
  .login-input-group .input {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #ffffff;
    padding: 14px 18px;
    font-family: var(--app-font), sans-serif;
    font-size: 14.5px;
    width: 100%;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .login-input-group .input:focus {
    outline: none;
    border-color: var(--accent);
    background: rgba(0, 0, 0, 0.35);
    box-shadow: 0 0 0 4px rgba(245, 200, 66, 0.15);
  }

  /* Stunning Modern Button Style */
  .login-btn {
    background: linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%);
    color: #111111;
    border: none;
    border-radius: 12px;
    padding: 15px 28px;
    font-family: var(--app-font), sans-serif;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 20px rgba(245, 200, 66, 0.2);
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .login-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(245, 200, 66, 0.35);
    filter: brightness(1.1);
  }
  .login-btn:active:not(:disabled) {
    transform: translateY(1px);
  }
  .login-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .tag{font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:.5px}
  .tag.ok{background:rgba(0,201,167,.12);color:var(--teal)}
  .tag.warn{background:rgba(245,200,66,.12);color:var(--accent)}
  .tag.bad{background:rgba(255,92,92,.12);color:var(--red)}

  .muted{color:var(--muted);font-size:12px}
  .flex{display:flex;align-items:center;gap:10px}
  .spread{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .mt{margin-top:12px}

  /* --- Interactive Gamification & Kudos Feed Styles --- */
  .wheel-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: linear-gradient(135deg, var(--navy2), var(--navy3));
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  .wheel-wrapper {
    position: relative;
    width: 260px;
    height: 260px;
    margin: 20px auto;
  }
  .wheel-outer {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 6px solid var(--accent);
    position: relative;
    overflow: hidden;
    transition: transform 4s cubic-bezier(0.15, 0.85, 0.25, 1);
    box-shadow: 0 0 20px rgba(245, 200, 66, 0.25);
    background: conic-gradient(
      #2ecc71 0deg 60deg,
      #3498db 60deg 120deg,
      #9b59b6 120deg 180deg,
      #e67e22 180deg 240deg,
      #e74c3c 240deg 300deg,
      #f1c40f 300deg 360deg
    );
  }
  .wheel-pointer {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 24px;
    background: var(--red);
    clip-path: polygon(50% 100%, 0 0, 100% 0);
    z-index: 10;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    animation: pointer-wiggle 0.3s ease-in-out infinite alternate;
    animation-play-state: paused;
  }
  .wheel-pointer.wiggling {
    animation-play-state: running;
  }
  @keyframes pointer-wiggle {
    0% { transform: translateX(-50%) rotate(-5deg); }
    100% { transform: translateX(-50%) rotate(5deg); }
  }
  .wheel-center-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--navy2);
    border: 4px solid var(--accent);
    color: var(--accent);
    font-weight: bold;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    transition: transform 0.2s;
  }
  .wheel-center-btn:hover:not(:disabled) {
    transform: translate(-50%, -50%) scale(1.1);
  }
  .wheel-center-btn:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }
  .wheel-slice-text {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    padding-top: 15px;
    font-weight: 800;
    font-size: 11px;
    color: white;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    transform-origin: 50% 50%;
    pointer-events: none;
  }

  /* Collaborative Quest Cards */
  .quest-card {
    background: var(--navy3);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .quest-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .quest-progress-container {
    margin-top: 10px;
  }
  .quest-metrics-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
    margin-top: 4px;
  }

  /* Kudos wall styles */
  .kudos-container {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 20px;
  }
  .kudos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    margin-top: 16px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .kudos-item {
    background: var(--navy3);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 8px;
    transition: transform 0.2s;
  }
  .kudos-item:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
  }
  .kudos-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .kudos-header-names {
    font-size: 12px;
    font-weight: 700;
  }
  .kudos-body {
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--text);
  }
  .kudos-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: var(--muted);
  }
  .kudos-emoji-tag {
    font-size: 20px;
  }
  .kudos-composer {
    background: var(--navy3);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    margin-bottom: 16px;
  }
  .emoji-picker-row {
    display: flex;
    gap: 8px;
    margin: 8px 0;
    flex-wrap: wrap;
  }
  .emoji-option {
    font-size: 20px;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    background: var(--navy2);
    border: 1px solid var(--border);
    transition: all 0.15s;
  }
  .emoji-option:hover, .emoji-option.active {
    background: var(--accent);
    transform: scale(1.1);
    border-color: transparent;
  }

  /* Confetti particle style */
  .confetti-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 100;
  }

  /* Podium Leaderboard Styling */
  .podium-section {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 16px;
    margin: 24px 0 32px 0;
    min-height: 220px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .podium-spot {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100px;
    position: relative;
  }
  .podium-spot.first {
    order: 2;
  }
  .podium-spot.second {
    order: 1;
  }
  .podium-spot.third {
    order: 3;
  }
  .podium-pedestal {
    width: 100%;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bebas Neue';
    font-size: 32px;
    color: rgba(255,255,255,0.15);
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
  }
  .podium-spot.first .podium-pedestal {
    height: 110px;
    background: linear-gradient(180deg, var(--accent), var(--accent2));
    border: 1px solid var(--accent);
    color: var(--navy);
  }
  .podium-spot.second .podium-pedestal {
    height: 80px;
    background: linear-gradient(180deg, var(--navy3), var(--navy2));
    border: 1px solid var(--border);
  }
  .podium-spot.third .podium-pedestal {
    height: 60px;
    background: linear-gradient(180deg, var(--navy3), var(--navy2));
    border: 1px solid var(--border);
  }
  .podium-avatar-container {
    position: relative;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .podium-crown {
    position: absolute;
    top: -16px;
    font-size: 16px;
    z-index: 2;
  }
  .podium-name-tag {
    font-size: 12px;
    font-weight: 700;
    margin-top: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90px;
  }
  .podium-pts-tag {
    font-size: 11px;
    font-family: 'JetBrains Mono';
    color: var(--accent);
    font-weight: 700;
    margin-top: 2px;
  }

  /* --- Infinite Scroll Control Panel Layout --- */
  .admin-scroll-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }
  .admin-toc-bar {
    position: sticky;
    top: 84px;
    width: 200px;
    flex-shrink: 0;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 16px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
  .admin-toc-inner {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .admin-toc-title {
    font-family: 'Bebas Neue';
    font-size: 20px;
    letter-spacing: 1px;
    color: var(--accent);
    border-bottom: 1px solid var(--border);
    padding-bottom: 6px;
  }
  .admin-toc-links {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .admin-toc-btn {
    background: none;
    border: none;
    color: var(--muted);
    font-family: 'DM Sans';
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .admin-toc-btn:hover {
    color: var(--text);
    background: var(--navy3);
  }
  .admin-toc-btn.active {
    color: var(--accent);
    background: var(--navy3);
  }
  .admin-sections-feed {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0; /* avoid flexing overflow */
  }
  .admin-section-wrapper {
    scroll-margin-top: 84px;
  }
  .admin-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    border-bottom: 2px solid var(--border);
    padding-bottom: 8px;
  }
  .admin-section-header h2 {
    font-family: 'Bebas Neue';
    font-size: 24px;
    letter-spacing: 1px;
    color: var(--accent);
  }
  .admin-section-anchor {
    font-family: 'JetBrains Mono';
    font-size: 11px;
    color: var(--muted);
  }

  @media(max-width:900px){
    .admin-scroll-layout {
      flex-direction: column;
    }
    .admin-toc-bar {
      position: relative;
      top: 0;
      width: 100%;
      max-height: none;
    }
    .admin-toc-links {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 6px;
    }
    .admin-toc-btn {
      padding: 4px 8px;
      border: 1px solid var(--border);
    }
  }

  @media(max-width:600px){
    .main{padding:16px}
    .topbar{height:auto;padding:10px 16px}
    .modal{padding:20px}
    .form-row{grid-template-columns:1fr}
    .agent-hero{flex-direction:column;text-align:center}
    .grid-3,.grid-4{grid-template-columns:repeat(2,1fr)}
  }
  `;
}
