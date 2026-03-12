export default async function handler(req, res) {
  const apiKey = process.env.APISPORTS_KEY;
  if (!apiKey) return res.status(500).json({ error: "Clé API manquante" });

  const headers = { "x-apisports-key": apiKey };

  // Top 14 = league 16, saison 2024 (accessible en gratuit)
  const LEAGUE = 16;
  const SEASON = 2024;

  try {
    // Récupérer tous les matchs joués de la saison 2024
    const r = await fetch(
      `https://v1.rugby.api-sports.io/games?league=${LEAGUE}&season=${SEASON}`,
      { headers }
    );
    const data = await r.json();

    if (!data.response || data.response.length === 0) {
      return res.status(200).json({ teams: {}, error: "Aucune donnée disponible" });
    }

    // Calculer les stats par équipe à partir des matchs joués
    const teamStats = {};

    data.response.forEach((game) => {
      if (game.status.short !== "FT") return; // Seulement les matchs terminés

      const home = game.teams.home.name;
      const away = game.teams.away.name;
      const homeScore = game.scores.home;
      const awayScore = game.scores.away;

      if (homeScore === null || awayScore === null) return;

      const homeWon = homeScore > awayScore;
      const awayWon = awayScore > homeScore;

      // Initialiser les équipes
      [home, away].forEach((team) => {
        if (!teamStats[team]) {
          teamStats[team] = {
            name: team,
            played: 0,
            wins: 0,
            losses: 0,
            homeGames: 0,
            homeWins: 0,
            awayGames: 0,
            awayWins: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            last5: [], // 1 = victoire, 0 = défaite
          };
        }
      });

      // Mise à jour stats domicile
      teamStats[home].played++;
      teamStats[home].homeGames++;
      teamStats[home].pointsFor += homeScore;
      teamStats[home].pointsAgainst += awayScore;
      if (homeWon) {
        teamStats[home].wins++;
        teamStats[home].homeWins++;
        teamStats[home].last5.push(1);
      } else {
        teamStats[home].losses++;
        teamStats[home].last5.push(0);
      }

      // Mise à jour stats extérieur
      teamStats[away].played++;
      teamStats[away].awayGames++;
      teamStats[away].pointsFor += awayScore;
      teamStats[away].pointsAgainst += homeScore;
      if (awayWon) {
        teamStats[away].wins++;
        teamStats[away].awayWins++;
        teamStats[away].last5.push(1);
      } else {
        teamStats[away].losses++;
        teamStats[away].last5.push(0);
      }
    });

    // Calculer les ratios finaux
    Object.values(teamStats).forEach((t) => {
      t.winRate = t.played > 0 ? t.wins / t.played : 0.5;
      t.homeWinRate = t.homeGames > 0 ? t.homeWins / t.homeGames : 0.5;
      t.awayWinRate = t.awayGames > 0 ? t.awayWins / t.awayGames : 0.3;
      t.avgPointsDiff = t.played > 0 ? (t.pointsFor - t.pointsAgainst) / t.played : 0;
      // Forme sur les 5 derniers matchs
      const last5 = t.last5.slice(-5);
      t.form = last5.length > 0 ? last5.reduce((a, b) => a + b, 0) / last5.length : 0.5;
    });

    const remaining = r.headers.get("x-ratelimit-requests-remaining") || "?";

    return res.status(200).json({
      teams: teamStats,
      season: SEASON,
      totalGames: data.response.length,
      meta: { remaining },
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
