# WC 2026 Bracket

A pick'em bracket for ~10 friends to predict the 2026 FIFA World Cup.

## Stack

- Plain HTML/CSS/JS, no build step
- Supabase (Postgres) for picks, results, and leaderboard
- GitHub Pages for hosting
- ESPN scoreboard endpoint pulled by a Supabase Edge Function every 30 min for auto-results; manual admin entry as fallback

## How it works

- **Self-signup**: pick a name on first visit.
- **Picks**: predict each group's 1st and 2nd, draft the 32-team R32, fill the bracket through the final, and call the champion's total goals as the tiebreaker.
- **Lock**: picks freeze at the first kickoff on June 11, 2026.
- **Scoring**: points per correct pick weighted by round; exact-score predictions earn bonus points.
- **Reveal**: everyone's picks become visible at lock.

## Local development

```bash
cd /home/PS828ET/wcbracket
cp config.example.js config.js   # fill in your Supabase credentials and admin code
python3 -m http.server 8000
# open http://localhost:8000
```
