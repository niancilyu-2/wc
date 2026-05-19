// ABOUTME: Core application logic for WC 2026 bracket pick'em.
// ABOUTME: Handles self-signup, picks, lock logic, leaderboard, and bracket rendering.

const LOCK_DATE_ISO = '2026-06-11T16:00:00-04:00';
const STORAGE_KEY_PLAYER = 'wcbracket.player';

const supabase = window.supabase && window.SUPABASE_URL
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

function isLocked() {
  return new Date() >= new Date(LOCK_DATE_ISO);
}

function getCurrentPlayer() {
  return localStorage.getItem(STORAGE_KEY_PLAYER);
}

function setCurrentPlayer(name) {
  localStorage.setItem(STORAGE_KEY_PLAYER, name);
}

async function init() {
  // Phase 0 skeleton — real wiring lands in Phase 2.
  console.log('wcbracket init', { locked: isLocked(), player: getCurrentPlayer() });
}

document.addEventListener('DOMContentLoaded', init);
