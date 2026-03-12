import { useState, useEffect, useCallback } from "react";

// ─── VALUE BETTING ENGINE ─────────────────────────────────────────────────────
function computeImpliedProb(odds) {
  return 1 / odds;
}

function estimateWinProbability(isHome, stats) {
  const { form, homeRecord, awayRecord, pointsDiff, rankScore } = stats;
  let base = 0.5;
  base += form * 0.15;
  base += (isHome ? homeRecord : awayRecord) * 0.12;
  base += pointsDiff * 0.008;
  base += rankScore * 0.05;
  return Math.min(0.92, Math.max(0.08, base));
}

function calcValue(estimatedProb, bookmakerOdds) {
  return estimatedProb * bookmakerOdds - 1;
}

// ─── TOP 14 MATCHES DATA ──────────────────────────────────────────────────────
const RAW_MATCHES = [
  {
    id: 1,
    date: "2026-03-14",
    time: "20h45",
    home: { name: "Stade Toulousain", short: "TOU", logo: "🔴", stats: { form: 0.7, homeRecord: 0.78, awayRecord: 0.55, pointsDiff: 8.2, rankScore: 0.8 } },
    away: { name: "Racing 92", short: "R92", logo: "🔵", stats: { form: 0.35, homeRecord: 0.52, awayRecord: 0.28, pointsDiff: -2.1, rankScore: 0.3 } },
    odds: { home: 1.38, away: 3.20 },
    venue: "Stade Ernest-Wallon",
  },
  {
    id: 2,
    date: "2026-03-14",
    time: "15h00",
    home: { name: "La Rochelle", short: "LRO", logo: "🟡", stats: { form: 0.5, homeRecord: 0.72, awayRecord: 0.58, pointsDiff: 5.8, rankScore: 0.65 } },
    away: { name: "Clermont", short: "CLR", logo: "🟠", stats: { form: 0.55, homeRecord: 0.60, awayRecord: 0.42, pointsDiff: 3.1, rankScore: 0.5 } },
    odds: { home: 1.72, away: 2.10 },
    venue: "Stade Marcel-Deflandre",
  },
  {
    id: 3,
    date: "2026-03-15",
    time: "17h15",
    home: { name: "Montpellier", short: "MHR", logo: "🟣", stats: { form: 0.25, homeRecord: 0.48, awayRecord: 0.30, pointsDiff: -4.5, rankScore: 0.2 } },
    away: { name: "Bordeaux-Bègles", short: "UBB", logo: "⚫", stats: { form: 0.65, homeRecord: 0.62, awayRecord: 0.52, pointsDiff: 6.3, rankScore: 0.6 } },
    odds: { home: 2.45, away: 1.62 },
    venue: "GGL Stadium",
  },
  {
    id: 4,
    date: "2026-03-15",
    time: "14h30",
    home: { name: "Stade Français", short: "SFP", logo: "⭐", stats: { form: 0.5, homeRecord: 0.58, awayRecord: 0.40, pointsDiff: 1.2, rankScore: 0.45 } },
    away: { name: "Toulon", short: "RCT", logo: "🔴", stats: { form: 0.60, homeRecord: 0.68, awayRecord: 0.50, pointsDiff: 4.0, rankScore: 0.55 } },
    odds: { home: 2.20, away: 1.75 },
    venue: "Jean-Bouin",
  },
  {
    id: 5,
    date: "2026-03-16",
    time: "15h00",
    home: { name: "Castres", short: "CO", logo: "🟤", stats: { form: 0.40, homeRecord: 0.62, awayRecord: 0.35, pointsDiff: 0.5, rankScore: 0.35 } },
    away: { name: "Pau", short: "PAU", logo: "🟢", stats: { form: 0.30, homeRecord: 0.44, awayRecord: 0.25, pointsDiff: -6.2, rankScore: 0.15 } },
    odds: { home: 1.55, away: 2.60 },
    venue: "Pierre-Fabre",
  },
  {
    id: 6,
    date: "2026-03-16",
    time: "17h00",
    home: { name: "Lyon OU", short: "LOU", logo: "🔵", stats: { form: 0.55, homeRecord: 0.65, awayRecord: 0.45, pointsDiff: 4.8, rankScore: 0.55 } },
    away: { name: "Perpignan", short: "USA", logo: "🟡", stats: { form: 0.45, homeRecord: 0.50, awayRecord: 0.35, pointsDiff: -1.0, rankScore: 0.38 } },
    odds: { home: 1.65, away: 2.30 },
    venue: "Matmut Stadium",
  },
];

function processMatches(raw) {
  return raw
    .map((m) => {
      const probHome = estimateWinProbability(true, m.home.stats);
      const probAway = estimateWinProbability(false, m.away.stats);
      const total = probHome + probAway;
      const normHome = probHome / total;
      const normAway = probAway / total;
      const valueHome = calcValue(normHome, m.odds.home);
      const valueAway = calcValue(normAway, m.odds.away);
      const bestValue = Math.max(valueHome, valueAway);
      const bestSide = valueHome >= valueAway ? "home" : "away";
      return {
        ...m,
        probHome: normHome,
        probAway: normAway,
        valueHome,
        valueAway,
        bestValue,
        bestSide,
        recommendation: bestValue > 0.08 ? "PARIER" : bestValue > 0.02 ? "LIMITE" : "PASSER",
        impliedHome: computeImpliedProb(m.odds.home),
        impliedAway: computeImpliedProb(m.odds.away),
      };
    })
    .sort((a, b) => b.bestValue - a.bestValue);
}

const fmt = (n) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
const fmtProb = (n) => `${(n * 100).toFixed(0)}%`;

function ValueBadge({ value }) {
  if (value > 0.08)
    return (
      <span style={{ background: "#00C853", color: "#fff", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>
        VALUE ✓
      </span>
    );
  if (value > 0.02)
    return (
      <span style={{ background: "#FF9800", color: "#fff", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>
        LIMITE
      </span>
    );
  return (
    <span style={{ background: "#E0E0E0", color: "#666", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>
      PASSER
    </span>
  );
}

function ProgressBar({ value, color }) {
  const pct = Math.min(100, Math.max(0, Math.abs(value) * 400));
  return (
    <div style={{ height: 4, background: "#F0F0F0", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setMatches(processMatches(RAW_MATCHES));
      setLastUpdate(new Date());
      setLoading(false);
    }, 900);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = filter === "ALL" ? matches : matches.filter((m) => m.recommendation === filter);
  const best = matches[0];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7", fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif", color: "#1D1D1F", WebkitFontSmoothing: "antialiased" }}>
      {/* HEADER */}
      <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100, padding: "0 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 24 }}>🏉</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5 }}>Rugby Value</div>
              <div style={{ fontSize: 11, color: "#86868B", fontWeight: 500 }}>Top 14 · Analyse en direct</div>
            </div>
          </div>
          <button onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, background: loading ? "#E5E5EA" : "#1D1D1F", color: loading ? "#999" : "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer", transition: "all 0.2s" }}>
            <span style={{ display: "inline-block", animation: loading ? "spin 1s linear infinite" : "none" }}>↻</span>
            {loading ? "Analyse…" : "Actualiser"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 48px" }}>
        {/* HERO CARD */}
        {best && !loading && (
          <div style={{ background: "linear-gradient(135deg, #1D1D1F 0%, #2D2D2F 100%)", borderRadius: 20, padding: "24px 24px 20px", marginBottom: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, fontSize: 120, opacity: 0.04 }}>🏉</div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: "#86868B", textTransform: "uppercase", marginBottom: 12 }}>🏆 Meilleure opportunité</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>{best.home.name} <span style={{ color: "#86868B", fontWeight: 400 }}>vs</span> {best.away.name}</div>
                <div style={{ fontSize: 13, color: "#86868B" }}>{best.date.split("-").reverse().join("/")} · {best.time} · {best.venue}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: "#00C853", lineHeight: 1 }}>{fmt(best.bestValue)}</div>
                <div style={{ fontSize: 12, color: "#86868B", marginTop: 2 }}>value betting</div>
              </div>
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: "#86868B", marginBottom: 4 }}>Pari recommandé</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#00C853" }}>{best.bestSide === "home" ? `✓ ${best.home.name}` : `✓ ${best.away.name}`}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#86868B", marginBottom: 4 }}>Notre probabilité</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtProb(best.bestSide === "home" ? best.probHome : best.probAway)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#86868B", marginBottom: 4 }}>Cote bookmaker</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{best.bestSide === "home" ? best.odds.home : best.odds.away}</div>
              </div>
            </div>
          </div>
        )}

        {/* STATS ROW */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[{ label: "Matchs analysés", value: matches.length, icon: "📊" }, { label: "À jouer", value: matches.filter((m) => m.recommendation === "PARIER").length, icon: "✅" }, { label: "À passer", value: matches.filter((m) => m.recommendation === "PASSER").length, icon: "❌" }].map((s) => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#86868B", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* FILTER PILLS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["ALL", "PARIER", "LIMITE", "PASSER"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: 20, background: filter === f ? "#1D1D1F" : "#fff", color: filter === f ? "#fff" : "#1D1D1F", border: "1px solid", borderColor: filter === f ? "#1D1D1F" : "#E5E5EA", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {f === "ALL" ? "Tous les matchs" : f === "PARIER" ? "✅ À jouer" : f === "LIMITE" ? "⚠️ Limite" : "❌ À passer"}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: "#86868B", textTransform: "uppercase", marginBottom: 12 }}>
          Classement par value — {visible.length} match{visible.length !== 1 ? "s" : ""}
        </div>

        {/* MATCH CARDS */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, height: 140, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, #F5F5F7 25%, #EBEBED 50%, #F5F5F7 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: 16 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visible.map((m, idx) => {
              const isExpanded = expandedId === m.id;
              const recColor = m.recommendation === "PARIER" ? "#00C853" : m.recommendation === "LIMITE" ? "#FF9800" : "#E0E0E0";
              const rankColor = idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : idx === 2 ? "#CD7F32" : "#E5E5EA";

              return (
                <div key={m.id} onClick={() => setExpandedId(isExpanded ? null : m.id)} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", cursor: "pointer", border: `1px solid ${isExpanded ? recColor + "40" : "transparent"}`, boxShadow: isExpanded ? `0 4px 20px ${recColor}20` : "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.25s cubic-bezier(.4,0,.2,1)" }}>
                  <div style={{ height: 3, background: recColor, opacity: m.recommendation === "PASSER" ? 0.3 : 1 }} />
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ minWidth: 28, height: 28, borderRadius: 8, background: rankColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: idx < 3 ? "#fff" : "#999" }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.home.logo} {m.home.name} <span style={{ color: "#C7C7CC", fontWeight: 400 }}>·</span> {m.away.logo} {m.away.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#86868B", marginTop: 2 }}>{m.date.split("-").reverse().join("/")} · {m.time}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1, color: recColor, lineHeight: 1 }}>{fmt(m.bestValue)}</div>
                        <div style={{ fontSize: 10, color: "#86868B", marginTop: 1 }}>value</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <ValueBadge value={m.bestValue} />
                      {m.recommendation !== "PASSER" && (
                        <span style={{ fontSize: 12, color: "#1D1D1F", fontWeight: 600 }}>→ {m.bestSide === "home" ? m.home.name : m.away.name}</span>
                      )}
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={m.bestValue} color={recColor} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #F0F0F0", padding: "16px 18px", background: "#FAFAFA" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "#86868B", textTransform: "uppercase", marginBottom: 14 }}>Analyse détaillée</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                          { label: m.home.name, logo: m.home.logo, prob: m.probHome, odds: m.odds.home, value: m.valueHome, implied: m.impliedHome },
                          { label: m.away.name, logo: m.away.logo, prob: m.probAway, odds: m.odds.away, value: m.valueAway, implied: m.impliedAway },
                        ].map((side, si) => {
                          const isRecom = (si === 0 && m.bestSide === "home") || (si === 1 && m.bestSide === "away");
                          return (
                            <div key={si} style={{ background: isRecom ? "#F0FFF4" : "#fff", border: `1px solid ${isRecom ? "#00C85330" : "#F0F0F0"}`, borderRadius: 12, padding: "14px" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{side.logo} {side.label}</div>
                              {[["Notre prob.", fmtProb(side.prob)], ["Prob. implicite", fmtProb(side.implied)], ["Cote bookmaker", `×${side.odds}`], ["Value", fmt(side.value)]].map(([k, v]) => (
                                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, color: "#86868B" }}>{k}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: k === "Value" ? (side.value > 0.05 ? "#00C853" : side.value > 0 ? "#FF9800" : "#FF3B30") : "#1D1D1F" }}>{v}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 14, padding: "12px 14px", background: m.recommendation === "PARIER" ? "#F0FFF4" : m.recommendation === "LIMITE" ? "#FFF8EC" : "#F5F5F7", borderRadius: 12, borderLeft: `3px solid ${recColor}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 4 }}>
                          {m.recommendation === "PARIER" ? `✅ Parier sur ${m.bestSide === "home" ? m.home.name : m.away.name}` : m.recommendation === "LIMITE" ? "⚠️ Value faible — à éviter sauf cote en hausse" : "❌ Pas de value — passer ce match"}
                        </div>
                        <div style={{ fontSize: 12, color: "#86868B" }}>
                          {m.recommendation === "PARIER" ? `Notre modèle estime ${fmtProb(m.bestSide === "home" ? m.probHome : m.probAway)} de chances de victoire pour une cote de ${m.bestSide === "home" ? m.odds.home : m.odds.away} (prob. implicite ${fmtProb(m.bestSide === "home" ? m.impliedHome : m.impliedAway)}).` : "La cote du bookmaker reflète fidèlement le risque. Aucune value significative détectée."}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#C7C7CC" }}>{lastUpdate ? `Dernière analyse : ${lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}</div>
          <div style={{ fontSize: 11, color: "#D1D1D6", marginTop: 6 }}>Données simulées · Connecter The Odds API + API-Sports pour la production</div>
          <div style={{ fontSize: 11, color: "#D1D1D6", marginTop: 4 }}>⚠️ Pariez de manière responsable</div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
      `}</style>
    </div>
  );
}
