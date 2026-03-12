export default async function handler(req, res) {
  const apiKey = process.env.APISPORTS_KEY;
  if (!apiKey) return res.status(500).json({ error: "Clé API manquante" });

  const headers = { "x-apisports-key": apiKey };
  const results = {};

  // Test 1 : statut du compte
  try {
    const r = await fetch("https://v1.rugby.api-sports.io/status", { headers });
    results.status = await r.json();
  } catch (e) { results.status = { error: e.message }; }

  // Test 2 : chercher la ligue Top 14
  try {
    const r = await fetch("https://v1.rugby.api-sports.io/leagues?name=Top 14", { headers });
    results.leagues = await r.json();
  } catch (e) { results.leagues = { error: e.message }; }

  // Test 3 : matchs saison 2025
  try {
    const r = await fetch("https://v1.rugby.api-sports.io/games?league=14&season=2025", { headers });
    results.games2025 = await r.json();
  } catch (e) { results.games2025 = { error: e.message }; }

  // Test 4 : matchs saison 2026
  try {
    const r = await fetch("https://v1.rugby.api-sports.io/games?league=14&season=2026", { headers });
    results.games2026 = await r.json();
  } catch (e) { results.games2026 = { error: e.message }; }

  return res.status(200).json(results);
}
