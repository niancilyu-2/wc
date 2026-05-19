// ABOUTME: Core application logic for WC 2026 bracket pick'em.
// ABOUTME: Handles self-signup, picks, lock logic, leaderboard, and bracket rendering.

const LOCK_DATE_ISO = '2026-06-11T13:00:00-06:00'; // Mexico vs South Africa kickoff
const STORAGE_KEY_PLAYER = 'wcbracket.player';

const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY,
);

function isLocked() {
  return new Date() >= new Date(LOCK_DATE_ISO);
}

function getStoredPlayer() {
  const raw = localStorage.getItem(STORAGE_KEY_PLAYER);
  return raw ? JSON.parse(raw) : null;
}

function setStoredPlayer(player) {
  localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(player));
}

function clearStoredPlayer() {
  localStorage.removeItem(STORAGE_KEY_PLAYER);
}

// ---------- Signup ----------

function showSignupModal() {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <h2>Welcome to WC 2026 Bracket</h2>
          <p>Pick a display name. Once you've made picks, you'll come back as the same player on this device.</p>
          <form id="signup-form">
            <input id="signup-name" type="text" maxlength="30" placeholder="Your name" required autofocus />
            <button type="submit">Enter</button>
            <p id="signup-error" class="error" hidden></p>
          </form>
        </div>
      </div>
    `;
    const form = document.getElementById('signup-form');
    const errorEl = document.getElementById('signup-error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      const name = document.getElementById('signup-name').value.trim();
      if (!name) return;
      const { data, error } = await supabase
        .from('players')
        .insert({ name })
        .select()
        .single();
      if (error) {
        errorEl.textContent = error.code === '23505'
          ? `"${name}" is already taken. Try another name.`
          : `Couldn't sign you up: ${error.message}`;
        errorEl.hidden = false;
        return;
      }
      setStoredPlayer({ id: data.id, name: data.name });
      root.innerHTML = '';
      resolve(data);
    });
  });
}

// ---------- Data loading ----------

async function loadReferenceData() {
  const [{ data: groups }, { data: teams }, { data: matches }] = await Promise.all([
    supabase.from('groups').select('*').order('code'),
    supabase.from('teams').select('*').order('code'),
    supabase.from('matches').select('*').order('kickoff_at'),
  ]);
  return { groups, teams, matches };
}

// ---------- Rendering ----------

function renderUserBar(player) {
  const bar = document.getElementById('user-bar');
  bar.innerHTML = `
    <span class="user-name">${player.name}</span>
    <button id="switch-user" class="link-button">switch</button>
  `;
  document.getElementById('switch-user').addEventListener('click', () => {
    clearStoredPlayer();
    location.reload();
  });
}

function renderStatus({ groups, teams, matches }) {
  const lb = document.getElementById('leaderboard');
  const locked = isLocked();
  const groupCount = matches.filter((m) => m.stage === 'group').length;
  const koCount = matches.length - groupCount;
  lb.innerHTML = `
    <p>Loaded ${groups.length} groups, ${teams.length} teams, ${matches.length} matches
      (${groupCount} group + ${koCount} knockout).</p>
    <p>Picks ${locked ? 'are <strong>locked</strong>' : 'lock at first kickoff: <strong>' + new Date(LOCK_DATE_ISO).toLocaleString() + '</strong>'}.</p>
  `;
}

// ---------- Init ----------

async function init() {
  let player = getStoredPlayer();
  if (!player) {
    player = await showSignupModal();
  }
  renderUserBar(player);
  const data = await loadReferenceData();
  renderStatus(data);
}

document.addEventListener('DOMContentLoaded', init);
