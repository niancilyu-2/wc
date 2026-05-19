-- ABOUTME: Postgres schema for WC 2026 bracket pick'em on Supabase.
-- ABOUTME: Phase 1 will flesh out tables for players, teams, groups, matches, picks, scores.

-- Tables (skeleton — full definitions land in Phase 1)
-- players      : self-signup identity (name, created_at)
-- teams        : 48 qualified teams (iso code, name, flag emoji, group)
-- groups       : 12 groups A-L
-- matches      : 104 match slots (group + knockout) with slot identifiers and results
-- picks        : per-player predictions (group standings, R32 draft, bracket, exact scores, tiebreaker)
-- scores       : computed points per player per match (or materialized view)
