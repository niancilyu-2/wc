-- ABOUTME: Migration 002 — track when a player completes each pick stage.
-- ABOUTME: Apply via Supabase SQL editor; idempotent (uses IF NOT EXISTS pattern).

ALTER TABLE players ADD COLUMN IF NOT EXISTS groups_submitted_at TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS bracket_submitted_at TIMESTAMPTZ;

-- Allow anon role to update these columns from the client (trust-based model).
DROP POLICY IF EXISTS "players_update_submission" ON players;
CREATE POLICY "players_update_submission" ON players FOR UPDATE USING (true) WITH CHECK (true);
