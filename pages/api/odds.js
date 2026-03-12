export default async function handler(req, res) {
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Clé API manquante" });
  }

  try {
    // Top 14 sur The Odds API
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/rugbyunion_top_14/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.message || "Erreur API" });
    }

    const data = await response.json();

    // Formatter les matchs pour notre interface
    const matches = data.map((match) => {
      const homeTeam = match.home_team;
      const awayTeam = match.away_team;

      // Récupérer les meilleures cotes disponibles parmi les bookmakers
      let bestHomeOdds = null;
      let bestAwayOdds = null;

      match.bookmakers.forEach((bookmaker) => {
        const h2h = bookmaker.markets.find((m) => m.key === "h2h");
        if (h2h) {
          h2h.outcomes.forEach((outcome) => {
            if (outcome.name === homeTeam) {
              if (!bestHomeOdds || outcome.price > bestHomeOdds) {
                bestHomeOdds = outcome.price;
              }
            }
            if (outcome.name === awayTeam) {
              if (!bestAwayOdds || outcome.price > bestAwayOdds) {
                bestAwayOdds = outcome.price;
              }
            }
          });
        }
      });

      // Date et heure du match
      const matchDate = new Date(match.commence_time);
      const dateStr = matchDate.toISOString().split("T")[0];
      const timeStr = matchDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      });

      return {
        id: match.id,
        date: dateStr,
        time: timeStr,
        home: { name: homeTeam, short: homeTeam.slice(0, 3).toUpperCase(), logo: "🏉" },
        away: { name: awayTeam, short: awayTeam.slice(0, 3).toUpperCase(), logo: "🏉" },
        odds: {
          home: bestHomeOdds || 2.0,
          away: bestAwayOdds || 2.0,
        },
        venue: "",
        bookmakerCount: match.bookmakers.length,
      };
    });

    // Quota restant
    const remaining = response.headers.get("x-requests-remaining");
    const used = response.headers.get("x-requests-used");

    return res.status(200).json({
      matches,
      meta: { remaining, used, total: matches.length },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
