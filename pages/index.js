import { useState, useEffect, useCallback } from "react";

// ─── ÉQUIPES TOP 14 ───────────────────────────────────────────────────────────
const TOP14_TEAMS = [
  "Stade Toulousain", "La Rochelle", "Bordeaux-Bègles", "Toulon",
  "Clermont", "Castres", "Lyon OU", "Racing 92",
  "Stade Français", "Montpellier", "Perpignan", "Pau",
  "Vannes", "Bayonne",
];

const TEAM_LOGOS = {
  "Stade Toulousain": "🔴", "La Rochelle": "🟡", "Bordeaux-Bègles": "⚫",
  "Toulon": "🔴", "Clermont": "🟠", "Castres": "🟤", "Lyon OU": "🔵",
  "Racing 92": "🔵", "Stade Français": "⭐", "Montpellier": "🟣",
  "Perpignan": "🟡", "Pau": "🟢", "Vannes": "⚪", "Bayonne": "🔴",
};

// ─── VALUE BETTING ENGINE ─────────────────────────────────────────────────────
function estimateProbability(teamStats, isHome) {
  if (!teamStats) return isHome ? 0.55 : 0.45;
  const { winRate, homeWinRate, awayWinRate, avgPointsDiff, form } = teamStats;
  let base = isHome ? homeWinRate : awayWinRate;
  base = base * 0.5 + winRate * 0.3 + form * 0.2;
  base += avgPointsDiff * 0.004;
  if (isHome) base += 0.04; // Avantage domicile
  return Math.min(0.92, Math.max(0.08, base));
}

function calcValue(estimatedProb, bookmakerOdds) {
  return estimatedProb * bookmakerOdds - 1;
}

function processMatch(match, teamStats) {
  const homeStats = Object.values(teamStats).find(
    (t) => t.name?.toLowerCase().includes(match.home.toLowerCase()) ||
           match.home.toLowerCase().includes(t.name?.toLowerCase())
  );
  const awayStats = Object.values(teamStats).find(
    (t) => t.name?.toLowerCase().includes(match.away.toLowerCase()) ||
           match.away.toLowerCase().includes(t.name?.toLowerCase())
  );

  const rawHome = estimateProbability(homeStats, true);
  const rawAway = estimateProbability(awayStats, false);
  const total = rawHome + rawAway;
  const probHome = rawHome / total;
  const probAway = rawAway / total;

  const valueHome = calcValue(probHome, parseFloat(match.oddsHome));
  const valueAway = calcValue(probAway, parseFloat(match.oddsAway));
  const bestValue = Math.max(valueHome, valueAway);
  const bestSide = valueHome >= valueAway ? "home" : "away";

  return {
    ...match,
    probHome,
    probAway,
    valueHome,
    valueAway,
    bestValue,
    bestSide,
    recommendation: bestValue > 0.06 ? "PARIER" : bestValue > 0.02 ? "LIMITE" : "PASSER",
    impliedHome: 1 / parseFloat(match.oddsHome),
    impliedAway: 1 / parseFloat(match.oddsAway),
    homeStats,
    awayStats,
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
const fmtProb = (n) => `${(n * 100).toFixed(0)}%`;
const fmtPct = (n) => `${(n * 100).toFixed(0)}%`;

function ValueBadge({ value }) {
  if (value > 0.06) return <span style={{ background: "#00C853", color: "#fff", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>VALUE ✓</span>;
  if (value > 0.02) return <span style={{ background: "#FF9800", color: "#fff", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>LIMITE</span>;
  return <span style={{ background: "#E0E0E0", color: "#666", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>PASSER</span>;
}

function ProgressBar({ value, color }) {
  const pct = Math.min(100, Math.max(0, Math.abs(value) * 400));
  return <div style={{ height: 4, background: "#F0F0F0", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} /></div>;
}

// ─── FORMULAIRE D'AJOUT DE MATCH ──────────────────────────────────────────────
function AddMatchForm({ onAdd, existingTeams }) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [oddsHome, setOddsHome] = useState("");
  const [oddsAway, setOddsAway] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("15h00");
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!home || !away) return setError("Sélectionne les deux équipes");
    if (home === away) return setError("Les équipes doivent être différentes");
    if (!oddsHome || !oddsAway) return setError("Saisis les deux cotes");
    const oh = parseFloat(oddsHome);
    const oa = parseFloat(oddsAway);
    if (oh < 1 || oa < 1) return setError("Les cotes doivent être supérieures à 1");
    setError("");
    onAdd({ id: Date.now(), home, away, oddsHome: oh, oddsAway: oa, date, time });
    setHome(""); setAway(""); setOddsHome(""); setOddsAway("");
  };

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E5EA", fontSize: 14, fontFamily: "inherit", outline: "none", background: "#fff", color: "#1D1D1F", boxSizing: "border-box" };
  const selectStyle = { ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2386868B' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "20px", marginBottom: 24, border: "1px solid #E5E5EA" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span>➕</span> Ajouter un match
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "#86868B", marginBottom: 6, fontWeight: 600 }}>ÉQUIPE DOMICILE</div>
          <select value={home} onChange={(e) => setHome(e.target.value)} style={selectStyle}>
            <option value="">Choisir...</option>
            {TOP14_TEAMS.filter(t => t !== away).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#86868B", marginBottom: 6, fontWeight: 600 }}>ÉQUIPE EXTÉRIEUR</div>
          <select value={away} onChange={(e) => setAway(e.target.value)} style={selectStyle}>
            <option value="">Choisir...</option>
            {TOP14_TEAMS.filter(t => t !== home).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "#86868B", marginBottom: 6, fontWeight: 600 }}>COTE DOMICILE</div>
          <input type="number" step="0.01" min="1" placeholder="ex: 1.65" value={oddsHome} onChange={(e) => setOddsHome(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#86868B", marginBottom: 6, fontWeight: 600 }}>COTE EXTÉRIEUR</div>
          <input type="number" step="0.01" min="1" placeholder="ex: 2.30" value={oddsAway} onChange={(e) => setOddsAway(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "#86868B", marginBottom: 6, fontWeight: 600 }}>DATE</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#86868B", marginBottom: 6, fontWeight: 600 }}>HEURE</div>
          <input type="text" placeholder="ex: 15h00" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: "#FF3B30", marginBottom: 10 }}>⚠️ {error}</div>}

      <button onClick={handleAdd} style={{ width: "100%", background: "#1D1D1F", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s" }}>
        Analyser ce match →
      </button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [teamStats, setTeamStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [processedMatches, setProcessedMatches] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [meta, setMeta] = useState(null);

  // Charger les stats historiques au démarrage
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/odds");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTeamStats(data.teams || {});
      setMeta(data.meta);
      setLastUpdate(new Date());
    } catch (err) {
      setStatsError(err.message);
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Recalculer les matchs quand stats ou matchs changent
  useEffect(() => {
    if (Object.keys(teamStats).length === 0) return;
    const processed = matches
      .map((m) => processMatch(m, teamStats))
      .sort((a, b) => b.bestValue - a.bestValue);
    setProcessedMatches(processed);
  }, [matches, teamStats]);

  const handleAddMatch = (match) => {
    setMatches((prev) => [...prev, match]);
    setExpandedId(match.id);
  };

  const handleRemoveMatch = (id) => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
    setProcessedMatches((prev) => prev.filter((m) => m.id !== id));
  };

  const visible = filter === "ALL" ? processedMatches : processedMatches.filter((m) => m.recommendation === filter);
  const best = processedMatches[0];
  const nbTeams = Object.keys(teamStats).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7", fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif", color: "#1D1D1F", WebkitFontSmoothing: "antialiased" }}>

      {/* HEADER */}
      <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100, padding: "0 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 24 }}>🏉</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5 }}>Rugby Value</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: loadingStats ? "#FF9800" : statsError ? "#FF3B30" : "#00C853", animation: loadingStats ? "pulse 1s infinite" : "none" }} />
                <div style={{ fontSize: 11, color: "#86868B", fontWeight: 500 }}>
                  {loadingStats ? "Chargement des stats…" : statsError ? "Stats indisponibles" : `Top 14 · ${nbTeams} équipes · Saison 2024`}
                </div>
              </div>
            </div>
          </div>
          <button onClick={loadStats} disabled={loadingStats} style={{ display: "flex", alignItems: "center", gap: 6, background: loadingStats ? "#E5E5EA" : "#1D1D1F", color: loadingStats ? "#999" : "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: loadingStats ? "default" : "pointer", transition: "all 0.2s" }}>
            <span style={{ display: "inline-block", animation: loadingStats ? "spin 1s linear infinite" : "none" }}>↻</span>
            {loadingStats ? "Chargement…" : "Actualiser"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 48px" }}>

        {/* BANDEAU STATS CHARGÉES */}
        {!loadingStats && !statsError && (
          <div style={{ background: "#F0F8FF", border: "1px solid #BCDEFA", borderRadius: 12, padding: "10px 16px", marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#0066CC" }}>📊 Stats historiques chargées</span>
            <span style={{ fontSize: 12, color: "#0066CC" }}>{nbTeams} équipes analysées</span>
            {meta?.remaining && <span style={{ fontSize: 12, color: "#0066CC" }}>Quota API restant : <strong>{meta.remaining}/100</strong></span>}
          </div>
        )}

        {statsError && (
          <div style={{ background: "#FFF0F0", border: "1px solid #FFD0D0", borderRadius: 12, padding: "10px 16px", marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: "#CC0000" }}>❌ {statsError}</span>
          </div>
        )}

        {/* HERO CARD */}
        {best && (
          <div style={{ background: "linear-gradient(135deg, #1D1D1F 0%, #2D2D2F 100%)", borderRadius: 20, padding: "24px 24px 20px", marginBottom: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, fontSize: 120, opacity: 0.04 }}>🏉</div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: "#86868B", textTransform: "uppercase", marginBottom: 12 }}>🏆 Meilleure opportunité</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>
                  {TEAM_LOGOS[best.home] || "🏉"} {best.home} <span style={{ color: "#86868B", fontWeight: 400 }}>vs</span> {TEAM_LOGOS[best.away] || "🏉"} {best.away}
                </div>
                <div style={{ fontSize: 13, color: "#86868B" }}>{best.date?.split("-").reverse().join("/")} · {best.time}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: "#00C853", lineHeight: 1 }}>{fmt(best.bestValue)}</div>
                <div style={{ fontSize: 12, color: "#86868B", marginTop: 2 }}>value betting</div>
              </div>
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div><div style={{ fontSize: 11, color: "#86868B", marginBottom: 4 }}>Pari recommandé</div><div style={{ fontSize: 15, fontWeight: 700, color: "#00C853" }}>{best.bestSide === "home" ? `✓ ${best.home}` : `✓ ${best.away}`}</div></div>
              <div><div style={{ fontSize: 11, color: "#86868B", marginBottom: 4 }}>Notre probabilité</div><div style={{ fontSize: 15, fontWeight: 700 }}>{fmtProb(best.bestSide === "home" ? best.probHome : best.probAway)}</div></div>
              <div><div style={{ fontSize: 11, color: "#86868B", marginBottom: 4 }}>Cote saisie</div><div style={{ fontSize: 15, fontWeight: 700 }}>{best.bestSide === "home" ? best.oddsHome : best.oddsAway}</div></div>
            </div>
          </div>
        )}

        {/* STATS RÉSUMÉ */}
        {processedMatches.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Matchs analysés", value: processedMatches.length, icon: "📊" },
              { label: "À jouer", value: processedMatches.filter(m => m.recommendation === "PARIER").length, icon: "✅" },
              { label: "À passer", value: processedMatches.filter(m => m.recommendation === "PASSER").length, icon: "❌" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#86868B", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* FORMULAIRE */}
        <AddMatchForm onAdd={handleAddMatch} />

        {/* FILTRES */}
        {processedMatches.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["ALL", "PARIER", "LIMITE", "PASSER"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: 20, background: filter === f ? "#1D1D1F" : "#fff", color: filter === f ? "#fff" : "#1D1D1F", border: "1px solid", borderColor: filter === f ? "#1D1D1F" : "#E5E5EA", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                  {f === "ALL" ? "Tous" : f === "PARIER" ? "✅ À jouer" : f === "LIMITE" ? "⚠️ Limite" : "❌ À passer"}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: "#86868B", textTransform: "uppercase", marginBottom: 12 }}>
              Classement par value — {visible.length} match{visible.length !== 1 ? "s" : ""}
            </div>
          </>
        )}

        {/* MATCH CARDS */}
        {processedMatches.length === 0 && !loadingStats && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#86868B" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏉</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Aucun match ajouté</div>
            <div style={{ fontSize: 13 }}>Saisis les cotes d'un match ci-dessus pour lancer l'analyse</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((m, idx) => {
            const isExpanded = expandedId === m.id;
            const recColor = m.recommendation === "PARIER" ? "#00C853" : m.recommendation === "LIMITE" ? "#FF9800" : "#E0E0E0";
            const rankColor = idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : idx === 2 ? "#CD7F32" : "#E5E5EA";

            return (
              <div key={m.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: `1px solid ${isExpanded ? recColor + "40" : "transparent"}`, boxShadow: isExpanded ? `0 4px 20px ${recColor}20` : "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.25s cubic-bezier(.4,0,.2,1)" }}>
                <div style={{ height: 3, background: recColor, opacity: m.recommendation === "PASSER" ? 0.3 : 1 }} />
                <div style={{ padding: "16px 18px", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : m.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ minWidth: 28, height: 28, borderRadius: 8, background: rankColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: idx < 3 ? "#fff" : "#999" }}>{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {TEAM_LOGOS[m.home] || "🏉"} {m.home} <span style={{ color: "#C7C7CC", fontWeight: 400 }}>·</span> {TEAM_LOGOS[m.away] || "🏉"} {m.away}
                      </div>
                      <div style={{ fontSize: 12, color: "#86868B", marginTop: 2 }}>{m.date?.split("-").reverse().join("/")} · {m.time}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1, color: recColor, lineHeight: 1 }}>{fmt(m.bestValue)}</div>
                        <div style={{ fontSize: 10, color: "#86868B", marginTop: 1 }}>value</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveMatch(m.id); }} style={{ background: "none", border: "1px solid #E5E5EA", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#86868B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <ValueBadge value={m.bestValue} />
                    {m.recommendation !== "PASSER" && <span style={{ fontSize: 12, color: "#1D1D1F", fontWeight: 600 }}>→ {m.bestSide === "home" ? m.home : m.away}</span>}
                    <div style={{ flex: 1 }}><ProgressBar value={m.bestValue} color={recColor} /></div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #F0F0F0", padding: "16px 18px", background: "#FAFAFA" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "#86868B", textTransform: "uppercase", marginBottom: 14 }}>Analyse détaillée</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                      {[
                        { label: m.home, logo: TEAM_LOGOS[m.home] || "🏉", prob: m.probHome, odds: m.oddsHome, value: m.valueHome, implied: m.impliedHome, stats: m.homeStats, isHome: true },
                        { label: m.away, logo: TEAM_LOGOS[m.away] || "🏉", prob: m.probAway, odds: m.oddsAway, value: m.valueAway, implied: m.impliedAway, stats: m.awayStats, isHome: false },
                      ].map((side, si) => {
                        const isRecom = (si === 0 && m.bestSide === "home") || (si === 1 && m.bestSide === "away");
                        return (
                          <div key={si} style={{ background: isRecom ? "#F0FFF4" : "#fff", border: `1px solid ${isRecom ? "#00C85330" : "#F0F0F0"}`, borderRadius: 12, padding: "14px" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{side.logo} {side.label}</div>
                            {[
                              ["Notre prob.", fmtProb(side.prob)],
                              ["Prob. implicite", fmtProb(side.implied)],
                              ["Cote saisie", `×${side.odds}`],
                              ["Value", fmt(side.value)],
                            ].map(([k, v]) => (
                              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 12, color: "#86868B" }}>{k}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: k === "Value" ? (side.value > 0.05 ? "#00C853" : side.value > 0 ? "#FF9800" : "#FF3B30") : "#1D1D1F" }}>{v}</span>
                              </div>
                            ))}
                            {side.stats && (
                              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F0F0F0" }}>
                                <div style={{ fontSize: 10, color: "#86868B", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Stats 2024</div>
                                {[
                                  ["Victoires", fmtPct(side.stats.winRate)],
                                  [side.isHome ? "% Dom." : "% Ext.", fmtPct(side.isHome ? side.stats.homeWinRate : side.stats.awayWinRate)],
                                  ["Forme (5j)", fmtPct(side.stats.form)],
                                  ["Diff. pts", side.stats.avgPointsDiff > 0 ? `+${side.stats.avgPointsDiff.toFixed(1)}` : side.stats.avgPointsDiff.toFixed(1)],
                                ].map(([k, v]) => (
                                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: "#86868B" }}>{k}</span>
                                    <span style={{ fontSize: 11, fontWeight: 600 }}>{v}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ padding: "12px 14px", background: m.recommendation === "PARIER" ? "#F0FFF4" : m.recommendation === "LIMITE" ? "#FFF8EC" : "#F5F5F7", borderRadius: 12, borderLeft: `3px solid ${recColor}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 4 }}>
                        {m.recommendation === "PARIER" ? `✅ Parier sur ${m.bestSide === "home" ? m.home : m.away}` : m.recommendation === "LIMITE" ? "⚠️ Value faible — à éviter sauf cote en hausse" : "❌ Pas de value — passer ce match"}
                      </div>
                      <div style={{ fontSize: 12, color: "#86868B" }}>
                        {m.recommendation === "PARIER"
                          ? `Notre modèle estime ${fmtProb(m.bestSide === "home" ? m.probHome : m.probAway)} de chances de victoire pour une cote de ${m.bestSide === "home" ? m.oddsHome : m.oddsAway} (prob. implicite ${fmtProb(m.bestSide === "home" ? m.impliedHome : m.impliedAway)}).`
                          : "La cote reflète fidèlement le risque. Aucune value significative détectée."}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#C7C7CC" }}>{lastUpdate ? `Stats chargées le ${lastUpdate.toLocaleDateString("fr-FR")} à ${lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}</div>
          <div style={{ fontSize: 11, color: "#D1D1D6", marginTop: 6 }}>📊 Stats historiques · API-Sports · Top 14 Saison 2024</div>
          <div style={{ fontSize: 11, color: "#D1D1D6", marginTop: 4 }}>⚠️ Pariez de manière responsable</div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
        input:focus, select:focus { border-color: #1D1D1F !important; }
      `}</style>
    </div>
  );
}
