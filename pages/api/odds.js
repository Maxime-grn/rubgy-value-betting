export default async function handler(req, res) {
  const apiKey = process.env.APISPORTS_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Clé API manquante" });
  }

  const headers = { "x-apisports-key": apiKey };

  try {
    // Étape 1 : matchs Top 14 à venir (league 14 = Top 14)
    const fixturesRes = await fetch(
      "https://v1.rugby.api-sports.io/games?league=14&season=2025",
      { headers }
    );

    if (!fixturesRes.ok) {
      const err = await fixturesRes.text();
      return res.status(fixturesRes.status).json({ error: `Erreur fixtures: ${err}` });
    }

    const fixturesData = await fixturesRes.json();

    if (!fixturesData.response || fixturesData.response.length === 0) {
      return res.status(200).json({ matches: [], meta: { used: 1, remaining: 99 } });
    }

    // Filtrer les matchs dans les 14 prochains jours
    const now = Date.now();
    const in14days = now + 14 * 24 * 60 * 60 * 1000;

    const upcomingGames = fixturesData.response.filter((game) => {
      const gameTime = new Date(game.date).getTime();
      return gameTime >= now && gameTime <= in14days && game.status.short === "NS";
    });

    if (upcomingGames.length === 0) {
      return res.status(200).json({ matches: [], meta: { used: 1, remaining: 99 } });
    }

    // Étape 2 : cotes pour chaque match
    const matchesWithOdds = await Promise.all(
      upcomingGames.slice(0, 8).map(async (game) => {
        let homeOdds = null;
        let awayOdds = null;
        let bookmakerCount = 0;

        try {
          const oddsRes = await fetch(
            `https://v1.rugby.api-sports.io/odds?game=${game.id}`,
            { headers }
          );
          const oddsData = await oddsRes.json();

          if (oddsData.response && oddsData.response.length > 0) {
            let sumHome = 0, sumAway = 0, count = 0;
            oddsData.response.forEach((bookmaker) => {
              bookmaker.bets?.forEach((bet) => {
                if (bet.name === "Match Winner" || bet.name === "Home/Away") {
                  bet.values?.forEach((v) => {
                    if (v.value === "Home" && parseFloat(v.odd) > 1) {
                      sumHome += parseFloat(v.odd);
                      count++;
                    }
                    if (v.value === "Away" && parseFloat(v.odd) > 1) {
                      sumAway += parseFloat(v.odd);
                    }
                  });
                }
              });
              bookmakerCount++;
            });
            if (count > 0) {
              homeOdds = parseFloat((sumHome / count).toFixed(2));
              awayOdds = parseFloat((sumAway / count).toFixed(2));
            }
          }
        } catch (e) {}

        if (!homeOdds || !awayOdds) return null;

        const matchDate = new Date(game.date);
        const dateStr = matchDate.toISOString().split("T")[0];
        const timeStr = matchDate.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        });

        return {
          id: game.id,
          date: dateStr,
          time: timeStr,
          home: {
            name: game.teams.home.name,
            short: game.teams.home.name.slice(0, 3).toUpperCase(),
            logo: "🏉",
          },
          away: {
            name: game.teams.away.name,
            short: game.teams.away.name.slice(0, 3).toUpperCase(),
            logo: "🏉",
          },
          odds: { home: homeOdds, away: awayOdds },
          venue: game.venue?.name || "",
          bookmakerCount,
        };
      })
    );

    const validMatches = matchesWithOdds.filter(Boolean);
    const remaining = fixturesRes.headers.get("x-ratelimit-requests-remaining") || "?";
    const used = fixturesRes.headers.get("x-ratelimit-requests-limit") || "?";

    return res.status(200).json({
      matches: validMatches,
      meta: { remaining, used, total: validMatches.length },
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
