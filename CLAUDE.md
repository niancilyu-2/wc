# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Project Overview

**WC 2026 Bracket** — a pick'em bracket for ~10 friends to predict the 2026 FIFA World Cup.

- Plain HTML/CSS/JS, no build step
- Supabase (Postgres) backend, accessed via the public anon key
- GitHub Pages hosting
- Self-signup (no auth); admin actions gated by a shared admin code in `config.js`
- ESPN's undocumented WC scoreboard endpoint pulled every 30 min by a Supabase Edge Function; manual admin entry is the fallback

## Tournament format (2026 only)

- 48 teams in 12 groups of 4
- Top 2 of each group + 8 best 3rd-place teams advance to the Round of 32
- Knockouts: R32 → R16 → QF → SF → Final (+ 3rd place)
- 104 matches total; tournament runs June 11 – July 19, 2026

## Pick model (single phase)

All sections open from day 1 and lock at the first WC kickoff on June 11.

- **Group standings**: predict 1st and 2nd of each of the 12 groups.
- **R32 free-draft**: place any 32 of the 48 teams into the 32 R32 slots (implicitly chooses your 8 best-3rd wildcards). Each team may only occupy one R32 slot.
- **Bracket winners**: click a team in each match to advance through R32 → R16 → QF → SF → Final, plus the 3rd-place match.
- **Tiebreaker**: predicted total goals scored by the eventual champion (single integer).
- Optional exact-score bonus predictions for knockout matches (R32+) land in 2d.

## Two-tier save model

- Clicks edit a **draft** state held in memory; never written to DB on click.
- **Save my picks**: flushes the draft to DB. Picks remain editable.
- **Submit**: flushes the draft to DB AND sets `players.groups_submitted_at` / `bracket_submitted_at`. Editing is disabled until **Edit picks** clears those timestamps.
- **Auto-pick (groups only)**: shuffles teams in any empty group and assigns the top two as 1st/2nd. Updates draft only — Save to persist.
- Navigation guards (browser `beforeunload` + custom modal on internal links) fire whenever the draft differs from the saved snapshot OR the player hasn't submitted.

## Lock & visibility

- `LOCK_DATE_ISO` (June 11 13:00 -06:00) freezes all picks. After lock, everyone's picks are revealed and the leaderboard goes live.

## Scoring (final)

- Group standings: 1 point per correctly placed team (1st or 2nd slot of any group)
- R32 winner: 2 / R16: 4 / QF: 5 / SF: 8 / Final: 10
- Exact-score bonus: +2 per knockout match (R32+) where the predicted score matches the actual. **Does NOT apply to group-stage matches.**
- Tiebreaker: closest guess to the actual champion's total tournament goals (a single integer per player). Compared against reality regardless of which team the player picked to win.

Perfect bracket = 134 points before bonuses. Max with all 32 exact-score bonuses = 198.

## Files

- `index.html` — static shell
- `app.js` — core logic (picks, lock, leaderboard, bracket)
- `style.css` — FIFA-inspired dark broadcast palette
- `schema.sql` — Supabase tables and seed data
- `config.example.js` — credentials template (copy to `config.js`)
- `config.js` — real credentials (gitignored)

## Conventions

- Every code file starts with two `ABOUTME:` comment lines
- No build step; no npm; no frameworks
- Match the surrounding code style; don't manually tweak whitespace
- Dates are stored in UTC; UI displays in US Eastern time
