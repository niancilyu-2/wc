-- ABOUTME: Tiebreaker changes from "champion total goals (int)" to "champion avg goals per game (decimal)".
-- ABOUTME: The champion team itself is derived from the Final winner pick, so no team column is added.

ALTER TABLE tiebreaker_picks
  DROP CONSTRAINT IF EXISTS tiebreaker_picks_champion_total_goals_check;

ALTER TABLE tiebreaker_picks
  RENAME COLUMN champion_total_goals TO champion_avg_goals;

ALTER TABLE tiebreaker_picks
  ALTER COLUMN champion_avg_goals TYPE NUMERIC(4,2) USING champion_avg_goals::NUMERIC;

ALTER TABLE tiebreaker_picks
  ADD CONSTRAINT champion_avg_goals_nonneg CHECK (champion_avg_goals >= 0);
