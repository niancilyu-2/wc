-- ABOUTME: Migration 003 — add third-place ranking and wildcard-advancement flag.
-- ABOUTME: Apply via Supabase SQL editor; idempotent.

ALTER TABLE group_picks ADD COLUMN IF NOT EXISTS third_code TEXT REFERENCES teams(code);
ALTER TABLE group_picks ADD COLUMN IF NOT EXISTS third_advances BOOLEAN NOT NULL DEFAULT FALSE;
