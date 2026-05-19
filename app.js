// ABOUTME: Core application logic for WC 2026 bracket pick'em.
// ABOUTME: Handles self-signup, picks, lock logic, leaderboard, and bracket rendering.

import { lookupAssignment } from './src/wildcards.js';

// Single-phase model: everything (groups + R32 draft + bracket + tiebreaker)
// is editable until the first WC kickoff on June 11.
const LOCK_DATE_ISO = '2026-06-11T13:00:00-06:00'; // Mexico vs South Africa
const STORAGE_KEY_PLAYER = 'wcbracket.player';

const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY,
);

// Two-tier pick state:
//   draft = working copy edited by clicks/auto-pick; never written to DB until Save/Submit.
//   saved = last snapshot persisted to DB.
// isDirty() compares the two; nav guards and Save button rely on the diff.
// Each group pick has { first, second, third, advances } where `advances` flags
// the group's 3rd team as one of the eight R32 wildcards.
function blankPicks() {
  return { groups: {}, bracket: {}, tiebreaker: null };
}

const state = {
  player: null,
  groups: [],
  teams: [],
  matches: [],
  teamsByGroup: {},
  teamsByCode: {},
  picks: {
    draft: blankPicks(),
    saved: blankPicks(),
  },
};

// FIFA 3-letter code → ISO 3166-1 alpha-2 (used by lipis/flag-icons).
// gb-eng/gb-sct are valid library subregion codes.
const FIFA_TO_ISO = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
  CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
  USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
  ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  FRA: 'fr', SEN: 'sn', IRQ: 'iq', NOR: 'no',
  ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co',
  ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa',
};

function flagHTML(teamCode) {
  const iso = FIFA_TO_ISO[teamCode];
  return iso ? `<span class="fi fi-${iso}"></span>` : '';
}

function isLocked() {
  return new Date() >= new Date(LOCK_DATE_ISO);
}

function isSubmitted() {
  return !!state.player?.groups_submitted_at && !!state.player?.bracket_submitted_at;
}

// Edits are disabled when locked OR when the player has submitted (until Edit).
function isEditingDisabled() {
  return isLocked() || isSubmitted();
}

function isDirty() {
  return JSON.stringify(state.picks.draft) !== JSON.stringify(state.picks.saved);
}

function snapshot(obj) {
  return JSON.parse(JSON.stringify(obj));
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

// ---------- Player picker (signup + switch) ----------

async function loadPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('id, name')
    .order('name');
  if (error) {
    console.error('Failed to load players', error);
    return [];
  }
  return data;
}

function showPlayerPicker() {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');

    const renderPickerList = (players) => {
      root.innerHTML = `
        <div class="modal-overlay">
          <div class="modal">
            <h2>Who are you?</h2>
            ${
              players.length
                ? `<p>Pick yourself from the list, or add a new player.</p>
                   <ul class="player-list">
                     ${players
                       .map(
                         (p) => `
                       <li><button type="button" class="player-pick" data-id="${p.id}" data-name="${p.name}">${p.name}</button></li>`,
                       )
                       .join('')}
                   </ul>
                   <hr class="modal-divider" />`
                : `<p>No players yet. Add yourself to get started.</p>`
            }
            <button type="button" class="link-button" id="add-new-player">+ New player</button>
          </div>
        </div>
      `;
      root.querySelectorAll('.player-pick').forEach((btn) => {
        btn.addEventListener('click', () => {
          const player = { id: btn.dataset.id, name: btn.dataset.name };
          setStoredPlayer(player);
          root.innerHTML = '';
          resolve(player);
        });
      });
      document.getElementById('add-new-player').addEventListener('click', renderNewForm);
    };

    const renderNewForm = () => {
      root.innerHTML = `
        <div class="modal-overlay">
          <div class="modal">
            <h2>New player</h2>
            <p>Pick a display name. Names are unique across the site.</p>
            <form id="signup-form">
              <input id="signup-name" type="text" maxlength="30" placeholder="Your name" required autofocus />
              <button type="submit">Enter</button>
              <p id="signup-error" class="error" hidden></p>
            </form>
            <button type="button" class="link-button" id="back-to-list">← back to list</button>
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
          errorEl.textContent =
            error.code === '23505'
              ? `"${name}" is already taken. Try another name.`
              : `Couldn't add you: ${error.message}`;
          errorEl.hidden = false;
          return;
        }
        setStoredPlayer({ id: data.id, name: data.name });
        root.innerHTML = '';
        resolve(data);
      });
      document.getElementById('back-to-list').addEventListener('click', async () => {
        renderPickerList(await loadPlayers());
      });
    };

    loadPlayers().then(renderPickerList);
  });
}

// ---------- Data loading ----------

async function loadReferenceData() {
  const [{ data: groups }, { data: teams }, { data: matches }] = await Promise.all([
    supabase.from('groups').select('*').order('code'),
    supabase.from('teams').select('*').order('code'),
    supabase.from('matches').select('*').order('id'),
  ]);
  state.groups = groups;
  state.teams = teams;
  state.matches = matches;
  state.teamsByGroup = teams.reduce((acc, t) => {
    (acc[t.group_code] ||= []).push(t);
    return acc;
  }, {});
  state.teamsByCode = Object.fromEntries(teams.map((t) => [t.code, t]));
}

async function loadCurrentPlayer() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', state.player.id)
    .single();
  if (error) {
    console.error('Failed to refresh player', error);
    return;
  }
  state.player = { ...state.player, ...data };
}

async function loadMyPicks() {
  const [groupRes, brktRes, tbRes] = await Promise.all([
    supabase.from('group_picks').select('*').eq('player_id', state.player.id),
    supabase.from('bracket_picks').select('*').eq('player_id', state.player.id),
    supabase.from('tiebreaker_picks').select('*').eq('player_id', state.player.id).maybeSingle(),
  ]);
  const saved = blankPicks();
  if (!groupRes.error) {
    for (const row of groupRes.data) {
      saved.groups[row.group_code] = {
        first: row.first_code,
        second: row.second_code,
        third: row.third_code,
        advances: !!row.third_advances,
      };
    }
  }
  if (!brktRes.error) {
    for (const row of brktRes.data) {
      saved.bracket[row.match_id] = row.winner_code;
    }
  }
  if (!tbRes.error && tbRes.data) {
    saved.tiebreaker = tbRes.data.champion_total_goals;
  }
  state.picks.saved = saved;
  state.picks.draft = snapshot(saved); // start clean
}

// ---------- Bracket helpers ----------

// FIFA's R32 pairing rules: 1A means "winner of group A", 2A means "runner-up
// of group A", '3wc' means "wildcard 3rd-place team for this slot" (resolved
// via the lookup table once the user has picked their 8 advancing thirds).
// Source: Wikipedia 2026 FIFA World Cup knockout stage.
const R32_SLOT_RULES = {
  M73: { a: '2A', b: '2B' },
  M74: { a: '1E', b: '3wc' },
  M75: { a: '1F', b: '2C' },
  M76: { a: '1C', b: '2F' },
  M77: { a: '1I', b: '3wc' },
  M78: { a: '2E', b: '2I' },
  M79: { a: '1A', b: '3wc' },
  M80: { a: '1L', b: '3wc' },
  M81: { a: '1D', b: '3wc' },
  M82: { a: '1G', b: '3wc' },
  M83: { a: '2K', b: '2L' },
  M84: { a: '1H', b: '2J' },
  M85: { a: '1B', b: '3wc' },
  M86: { a: '1J', b: '2H' },
  M87: { a: '1K', b: '3wc' },
  M88: { a: '2D', b: '2G' },
};

function advancingGroups() {
  return state.groups
    .map((g) => g.code)
    .filter((code) => state.picks.draft.groups[code]?.advances);
}

function currentWildcardAssignment() {
  const groups = advancingGroups();
  if (groups.length !== 8) return null;
  return lookupAssignment(groups);
}

function resolveR32Slot(matchId, position) {
  const rule = R32_SLOT_RULES[matchId];
  if (!rule) return null;
  const slot = position === 'a' ? rule.a : rule.b;
  if (slot === '3wc') {
    const wc = currentWildcardAssignment();
    if (!wc) return null;
    const sourceGroup = wc[matchId];
    return state.picks.draft.groups[sourceGroup]?.third || null;
  }
  // slot is like '1A' or '2B'
  const rank = slot[0];
  const group = slot[1];
  const pick = state.picks.draft.groups[group];
  if (!pick) return null;
  return rank === '1' ? pick.first : pick.second;
}

// Resolve which team is in a given match's a/b slot, reading from the draft.
function teamForSlot(matchId, position) {
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) return null;
  if (match.stage === 'group') {
    return position === 'a' ? match.team_a_code : match.team_b_code;
  }
  if (match.stage === 'r32') {
    return resolveR32Slot(matchId, position);
  }
  const label = position === 'a' ? match.slot_a : match.slot_b;
  if (!label) return null;
  if (label.startsWith('W')) {
    return state.picks.draft.bracket[`M${label.slice(1)}`] || null;
  }
  if (label.startsWith('L')) {
    const priorId = `M${label.slice(1)}`;
    const winner = state.picks.draft.bracket[priorId];
    if (!winner) return null;
    const a = teamForSlot(priorId, 'a');
    const b = teamForSlot(priorId, 'b');
    if (winner === a) return b;
    if (winner === b) return a;
    return null;
  }
  return null;
}

const KNOCKOUT_ROUNDS = [
  { id: 'r32',   label: 'Round of 32' },
  { id: 'r16',   label: 'Round of 16' },
  { id: 'qf',    label: 'Quarterfinals' },
  { id: 'sf',    label: 'Semifinals' },
  { id: 'final', label: 'Final' },
];

// ---------- Group picks ----------

const RANK_SLOTS = ['first', 'second', 'third'];

function emptyGroupPick() {
  return { first: null, second: null, third: null, advances: false };
}

function toggleGroupPick(groupCode, slot, teamCode) {
  const current = state.picks.draft.groups[groupCode] || emptyGroupPick();
  // Toggling off the same team in the same slot clears it.
  if (current[slot] === teamCode) {
    current[slot] = null;
  } else {
    // Picking the team for this slot vacates whichever other slot held it
    // (a team can only occupy one rank per group).
    for (const other of RANK_SLOTS) {
      if (other !== slot && current[other] === teamCode) current[other] = null;
    }
    current[slot] = teamCode;
  }
  state.picks.draft.groups[groupCode] = current;
  // Changing the 3rd-place team or clearing it can invalidate wildcard selection;
  // if the group is no longer fully ranked, drop its `advances` flag.
  if (!current.third) current.advances = false;
  renderGroupCard(groupCode);
  renderGroupsActions();
  renderWildcardsSection();
  renderBracket();
  renderStatusBar();
  renderGlobalActions();
}

function toggleWildcardAdvance(groupCode) {
  const current = state.picks.draft.groups[groupCode];
  if (!current?.third) return; // can't advance without a 3rd picked
  const wildcardCount = advancingGroups().length;
  if (current.advances) {
    current.advances = false;
  } else {
    if (wildcardCount >= 8) return; // already at 8
    current.advances = true;
  }
  state.picks.draft.groups[groupCode] = current;
  renderWildcardsSection();
  renderBracket();
  renderStatusBar();
  renderGlobalActions();
}

function groupCardHTML(groupCode) {
  const teams = state.teamsByGroup[groupCode] || [];
  const pick = state.picks.draft.groups[groupCode] || emptyGroupPick();
  const disabled = isEditingDisabled();
  const rows = teams
    .map((t) => {
      const ranks = {
        first: pick.first === t.code,
        second: pick.second === t.code,
        third: pick.third === t.code,
      };
      const isFourth = !ranks.first && !ranks.second && !ranks.third && (pick.first && pick.second && pick.third);
      const btn = (slot, label) => `
        <button type="button" class="rank-btn rank-btn--${slot} ${ranks[slot] ? 'is-active' : ''}"
                data-group="${groupCode}" data-slot="${slot}" data-team="${t.code}" ${disabled ? 'disabled' : ''}>${label}</button>`;
      return `
        <li class="team-row team-row--rank3 ${isFourth ? 'is-fourth' : ''}">
          ${flagHTML(t.code)}
          <span class="team-name" title="${t.name}">${t.name}</span>
          ${btn('first', '1st')}
          ${btn('second', '2nd')}
          ${btn('third', '3rd')}
        </li>`;
    })
    .join('');

  const rankCount = (pick.first ? 1 : 0) + (pick.second ? 1 : 0) + (pick.third ? 1 : 0);
  let statusText;
  if (rankCount === 3) statusText = `<span class="pick-status saved">Complete</span>`;
  else if (rankCount > 0) statusText = `<span class="pick-status partial">${rankCount} / 3 ranked</span>`;
  else statusText = `<span class="pick-status empty">No picks yet</span>`;

  return `
    <div class="group-card" data-group-card="${groupCode}">
      <header class="group-card-header">Group ${groupCode}</header>
      <ul class="team-list">${rows}</ul>
      <footer class="group-card-footer">${statusText}</footer>
    </div>`;
}

function renderGroupCard(groupCode) {
  const existing = document.querySelector(`[data-group-card="${groupCode}"]`);
  if (!existing) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = groupCardHTML(groupCode);
  existing.replaceWith(wrapper.firstElementChild);
}

function renderGroupPicks() {
  const grid = document.getElementById('groups-grid');
  grid.innerHTML = state.groups.map((g) => groupCardHTML(g.code)).join('');
  // Single delegated listener — survives card re-renders without leaking.
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.rank-btn');
    if (!btn || isEditingDisabled()) return;
    toggleGroupPick(btn.dataset.group, btn.dataset.slot, btn.dataset.team);
  });
}

// ---------- Group picks: auto-fill, submit/complete, controls ----------

function shuffled(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function autoFillEmptyGroups() {
  if (isEditingDisabled()) return;
  let changed = 0;
  for (const group of state.groups) {
    const existing = state.picks.draft.groups[group.code];
    if (existing && (existing.first || existing.second || existing.third)) continue;
    const shuffledTeams = shuffled(state.teamsByGroup[group.code] || []);
    if (shuffledTeams.length < 3) continue;
    state.picks.draft.groups[group.code] = {
      first: shuffledTeams[0].code,
      second: shuffledTeams[1].code,
      third: shuffledTeams[2].code,
      advances: false,
    };
    changed++;
  }
  if (!changed) return;
  renderGroupPicks();
  renderGroupsActions();
  renderWildcardsSection();
  renderBracket();
  renderStatusBar();
  renderGlobalActions();
}

function groupsCompletePicks() {
  return Object.values(state.picks.draft.groups).filter((p) => p.first && p.second && p.third).length;
}

function renderGroupsActions() {
  const container = document.getElementById('groups-actions');
  if (!container) return;
  const disabled = isEditingDisabled();
  container.innerHTML = `
    <button type="button" class="btn-secondary" id="auto-pick-btn" ${disabled ? 'disabled' : ''}>🎲 Auto-pick empty groups</button>
    <span class="picks-controls-note">Group picks made in draft: ${groupsCompletePicks()} / 12</span>
  `;
}

function wireGroupsActions() {
  document.getElementById('groups-actions').addEventListener('click', (e) => {
    if (e.target.id === 'auto-pick-btn') autoFillEmptyGroups();
  });
}

// ---------- Wildcards picker (8 of 12 thirds advance to R32) ----------

function renderWildcardsSection() {
  const root = document.getElementById('wildcards-grid');
  if (!root) return;
  const disabled = isEditingDisabled();
  const count = advancingGroups().length;
  const groupsReady = state.groups.every((g) => {
    const p = state.picks.draft.groups[g.code];
    return p && p.first && p.second && p.third;
  });

  if (!groupsReady) {
    root.innerHTML = `
      <p class="wildcards-empty">Rank all 12 groups (1st, 2nd, 3rd) before picking wildcards.</p>
    `;
    document.getElementById('wildcards-status').textContent = '';
    return;
  }

  const cards = state.groups
    .map((g) => {
      const p = state.picks.draft.groups[g.code] || emptyGroupPick();
      const team = state.teamsByCode[p.third];
      const active = !!p.advances;
      const atMax = count >= 8 && !active;
      const teamName = team ? team.name : '—';
      return `
        <button type="button" class="wildcard-card ${active ? 'is-active' : ''}"
                data-group="${g.code}"
                ${disabled || atMax ? 'disabled' : ''}
                ${atMax ? 'title="Already 8 picked — deselect another first"' : ''}>
          <header class="wildcard-card-group">Group ${g.code} · 3rd</header>
          <div class="wildcard-card-team">
            ${team ? flagHTML(team.code) : ''}
            <span>${teamName}</span>
          </div>
          <span class="wildcard-card-state">${active ? '✓ Advances' : 'Tap to advance'}</span>
        </button>`;
    })
    .join('');

  root.innerHTML = cards;
  document.getElementById('wildcards-status').innerHTML = `
    <strong>${count} / 8 picked</strong>
    ${count === 8 ? '<span class="wildcards-ready">✓ Bracket ready</span>' : ''}
  `;
}

function wireWildcards() {
  document.getElementById('wildcards-grid').addEventListener('click', (e) => {
    if (isEditingDisabled()) return;
    const btn = e.target.closest('.wildcard-card');
    if (!btn || btn.disabled) return;
    toggleWildcardAdvance(btn.dataset.group);
  });
}

// ---------- Bracket winner pick ----------

function setBracketWinner(matchId, teamCode) {
  // Toggle off if already the winner; otherwise set.
  if (state.picks.draft.bracket[matchId] === teamCode) {
    delete state.picks.draft.bracket[matchId];
  } else {
    state.picks.draft.bracket[matchId] = teamCode;
  }
}

// ---------- Persistence: flush draft to DB ----------

function diffMap(saved, draft, keyFn) {
  // Returns { upserts: [...], deletes: [keys...] } for shallow {key: value} maps.
  const upserts = [];
  const deletes = [];
  for (const key of Object.keys(draft)) {
    if (keyFn(draft[key], saved[key])) upserts.push(key);
  }
  for (const key of Object.keys(saved)) {
    if (!(key in draft)) deletes.push(key);
  }
  return { upserts, deletes };
}

function groupPickEqual(a, b) {
  return a.first === b.first && a.second === b.second && a.third === b.third && !!a.advances === !!b.advances;
}

async function persistGroupPicks() {
  const saved = state.picks.saved.groups;
  const draft = state.picks.draft.groups;
  const upserts = [];
  const deletes = [];
  for (const code of Object.keys(draft)) {
    const d = draft[code];
    const s = saved[code];
    const empty = !d.first && !d.second && !d.third && !d.advances;
    if (empty) {
      if (s) deletes.push(code);
      continue;
    }
    if (!s || !groupPickEqual(s, d)) {
      upserts.push({
        player_id: state.player.id,
        group_code: code,
        first_code: d.first,
        second_code: d.second,
        third_code: d.third,
        third_advances: !!d.advances,
        updated_at: new Date().toISOString(),
      });
    }
  }
  for (const code of Object.keys(saved)) {
    if (!(code in draft)) deletes.push(code);
  }
  if (upserts.length) {
    const { error } = await supabase
      .from('group_picks')
      .upsert(upserts, { onConflict: 'player_id,group_code' });
    if (error) throw error;
  }
  if (deletes.length) {
    const { error } = await supabase
      .from('group_picks')
      .delete()
      .eq('player_id', state.player.id)
      .in('group_code', deletes);
    if (error) throw error;
  }
}

async function persistBracketPicks() {
  const saved = state.picks.saved.bracket;
  const draft = state.picks.draft.bracket;
  const upserts = [];
  const deletes = [];
  for (const matchId of Object.keys(draft)) {
    if (saved[matchId] !== draft[matchId]) {
      upserts.push({
        player_id: state.player.id,
        match_id: matchId,
        winner_code: draft[matchId],
        updated_at: new Date().toISOString(),
      });
    }
  }
  for (const matchId of Object.keys(saved)) {
    if (!(matchId in draft)) deletes.push(matchId);
  }
  if (upserts.length) {
    const { error } = await supabase
      .from('bracket_picks')
      .upsert(upserts, { onConflict: 'player_id,match_id' });
    if (error) throw error;
  }
  if (deletes.length) {
    const { error } = await supabase
      .from('bracket_picks')
      .delete()
      .eq('player_id', state.player.id)
      .in('match_id', deletes);
    if (error) throw error;
  }
}

async function persistTiebreaker() {
  const draft = state.picks.draft.tiebreaker;
  const saved = state.picks.saved.tiebreaker;
  if (draft === saved) return;
  if (draft === null || draft === undefined) {
    const { error } = await supabase
      .from('tiebreaker_picks')
      .delete()
      .eq('player_id', state.player.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('tiebreaker_picks').upsert(
    {
      player_id: state.player.id,
      champion_total_goals: draft,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' },
  );
  if (error) throw error;
}

async function saveDraft() {
  await persistGroupPicks();
  await persistBracketPicks();
  await persistTiebreaker();
  state.picks.saved = snapshot(state.picks.draft);
}

async function submitPicks() {
  await saveDraft();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('players')
    .update({ groups_submitted_at: now, bracket_submitted_at: now })
    .eq('id', state.player.id);
  if (error) throw error;
  state.player.groups_submitted_at = now;
  state.player.bracket_submitted_at = now;
}

async function unsubmitPicks() {
  const { error } = await supabase
    .from('players')
    .update({ groups_submitted_at: null, bracket_submitted_at: null })
    .eq('id', state.player.id);
  if (error) throw error;
  state.player.groups_submitted_at = null;
  state.player.bracket_submitted_at = null;
}

// ---------- Global actions bar (Save / Submit / Edit) ----------

function renderGlobalActions() {
  const bar = document.getElementById('global-actions');
  if (!bar) return;
  const locked = isLocked();
  const submitted = isSubmitted();
  const dirty = isDirty();

  if (locked) {
    bar.innerHTML = `<span class="completed-badge">Picks are locked.</span>`;
    return;
  }
  if (submitted) {
    bar.innerHTML = `
      <span class="completed-badge">✓ Submitted</span>
      <button type="button" class="btn-secondary" id="edit-picks-btn">Edit picks</button>`;
    return;
  }
  bar.innerHTML = `
    <span class="${dirty ? 'unsaved-indicator' : 'saved-indicator'}">
      ${dirty ? '● Unsaved changes' : 'All changes saved'}
    </span>
    <button type="button" class="btn-secondary" id="save-picks-btn" ${dirty ? '' : 'disabled'}>Save my picks</button>
    <button type="button" class="btn-primary" id="submit-picks-btn">Submit</button>
  `;
}

function wireGlobalActions() {
  document.getElementById('global-actions').addEventListener('click', async (e) => {
    if (e.target.id === 'save-picks-btn') {
      try {
        await saveDraft();
      } catch (err) {
        console.error('Save failed', err);
        alert('Save failed — see console.');
        return;
      }
      renderGlobalActions();
      renderStatusBar();
      updateNavigationGuards();
    } else if (e.target.id === 'submit-picks-btn') {
      try {
        await submitPicks();
      } catch (err) {
        console.error('Submit failed', err);
        alert('Submit failed — see console.');
        return;
      }
      // Re-render everything to reflect the new disabled state.
      renderAll();
    } else if (e.target.id === 'edit-picks-btn') {
      try {
        await unsubmitPicks();
      } catch (err) {
        console.error('Unsubmit failed', err);
        return;
      }
      renderAll();
    }
  });
}

function renderAll() {
  renderUserBar();
  renderStatusBar();
  renderGroupPicks();
  renderGroupsActions();
  renderWildcardsSection();
  renderBracket();
  renderTiebreaker();
  renderGlobalActions();
  renderLeaderboardPlaceholder();
  updateNavigationGuards();
}

// ---------- Tiebreaker (will get full UI in 2d) ----------

function renderTiebreaker() {
  const root = document.getElementById('tiebreaker');
  if (!root) return;
  const disabled = isEditingDisabled();
  const value = state.picks.draft.tiebreaker ?? '';
  root.innerHTML = `
    <label class="tiebreaker-label">
      <span>Champion's total goals across the tournament:</span>
      <input type="number" id="tiebreaker-input" min="0" max="60" value="${value}" ${disabled ? 'disabled' : ''} />
    </label>
  `;
  document.getElementById('tiebreaker-input').addEventListener('input', (e) => {
    const v = e.target.value;
    state.picks.draft.tiebreaker = v === '' ? null : Number(v);
    renderGlobalActions();
  });
}

// ---------- Navigation guards (beforeunload + internal link intercept) ----------

function shouldWarnOnLeave() {
  if (isLocked()) return false;
  return isDirty() || !isSubmitted();
}

function beforeUnloadHandler(e) {
  e.preventDefault();
  e.returnValue = '';
  return '';
}

function updateNavigationGuards() {
  window.removeEventListener('beforeunload', beforeUnloadHandler);
  if (shouldWarnOnLeave()) {
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }
}

function showLeaveSiteModal() {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const dirty = isDirty();
    const submitted = isSubmitted();
    root.innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <h2>You haven't saved your progress</h2>
          <p>${
            dirty
              ? 'You have unsaved picks. Save them now, leave without saving, or stay here.'
              : 'Your picks are saved to the database, but you haven\'t hit <strong>Submit</strong> yet.'
          }</p>
          <div class="modal-actions">
            ${dirty ? `<button type="button" class="btn-primary" id="leave-save">Save &amp; continue</button>` : ''}
            ${!submitted ? `<button type="button" class="btn-primary" id="leave-submit">Submit &amp; continue</button>` : ''}
            <button type="button" class="btn-secondary" id="leave-go">Leave without saving</button>
            <button type="button" class="btn-link" id="leave-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;
    const finish = (decision) => {
      root.innerHTML = '';
      resolve(decision);
    };
    document.getElementById('leave-save')?.addEventListener('click', async () => {
      try { await saveDraft(); } catch (err) { console.error(err); }
      finish('save');
    });
    document.getElementById('leave-submit')?.addEventListener('click', async () => {
      try { await submitPicks(); } catch (err) { console.error(err); }
      finish('submit');
    });
    document.getElementById('leave-go').addEventListener('click', () => finish('go'));
    document.getElementById('leave-cancel').addEventListener('click', () => finish('cancel'));
  });
}

function wireInternalLinkGuards() {
  document.addEventListener('click', async (e) => {
    if (!shouldWarnOnLeave()) return;
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;
    e.preventDefault();
    const decision = await showLeaveSiteModal(href);
    if (decision === 'cancel') return;
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    location.href = href;
  });
}

// ---------- Bracket rendering ----------

function teamPillHTML(teamCode, opts = {}) {
  if (!teamCode) {
    return `<span class="team-pill team-pill--empty">${opts.placeholder || '— pick team —'}</span>`;
  }
  const team = state.teamsByCode[teamCode];
  if (!team) return `<span class="team-pill">${teamCode}</span>`;
  return `<span class="team-pill">${flagHTML(team.code)}<span>${team.name}</span></span>`;
}

// Bracket winner is only meaningful when it matches one of the current teams in
// the match (the underlying R32 draft can change after a winner was saved).
function effectiveWinner(matchId, teamA, teamB) {
  const pick = state.picks.draft.bracket[matchId];
  if (!pick) return null;
  if (pick === teamA || pick === teamB) return pick;
  return null;
}

function matchCellHTML(matchId) {
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) return '';
  const teamA = teamForSlot(matchId, 'a');
  const teamB = teamForSlot(matchId, 'b');
  const disabled = isEditingDisabled();
  const canAdvance = !!(teamA && teamB);
  const winner = effectiveWinner(matchId, teamA, teamB);

  const slotHTML = (position, team) => {
    const isWinner = team && winner === team;
    const pill = teamPillHTML(team, { placeholder: '?' });
    if (!team || !canAdvance || disabled) {
      return `<div class="bracket-slot bracket-slot--readonly ${isWinner ? 'is-winner' : ''}">${pill}</div>`;
    }
    return `
      <button type="button" class="bracket-slot ${isWinner ? 'is-winner' : ''}"
              data-match="${matchId}" data-team="${team}" data-action="advance">
        ${pill}
      </button>`;
  };

  return `
    <div class="bracket-match" data-match-id="${matchId}">
      <div class="bracket-match-label">${matchId.slice(1)}</div>
      ${slotHTML('a', teamA)}
      ${slotHTML('b', teamB)}
    </div>`;
}

function bracketColumnHTML(round) {
  const matches = state.matches
    .filter((m) => m.stage === round.id)
    .sort((a, b) => parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10));
  return `
    <div class="bracket-column bracket-column--${round.id}">
      <header class="bracket-column-header">${round.label}</header>
      <div class="bracket-column-body">
        ${matches.map((m) => matchCellHTML(m.id)).join('')}
      </div>
    </div>`;
}

function renderBracket() {
  const root = document.getElementById('bracket');
  const groupsReady = state.groups.every((g) => {
    const p = state.picks.draft.groups[g.code];
    return p && p.first && p.second && p.third;
  });
  const wildcardsReady = advancingGroups().length === 8;

  if (!groupsReady || !wildcardsReady) {
    const missing = [];
    if (!groupsReady) missing.push('rank all 12 groups (1st, 2nd, 3rd)');
    if (!wildcardsReady) missing.push('pick 8 wildcard 3rd-place teams to advance');
    root.innerHTML = `
      <div class="bracket-locked-notice">
        <strong>The bracket auto-fills once your picks are complete.</strong>
        <p>To populate R32, you still need to ${missing.join(' and ')}.</p>
      </div>`;
    return;
  }

  const thirdMatch = state.matches.find((m) => m.stage === 'third');
  root.innerHTML = `
    <div class="bracket-grid">
      ${KNOCKOUT_ROUNDS.map(bracketColumnHTML).join('')}
    </div>
    <div class="bracket-aside">
      <h3>3rd Place</h3>
      ${thirdMatch ? matchCellHTML(thirdMatch.id) : ''}
    </div>
  `;
}

function wireBracketListener() {
  // Attached once to #bracket; survives any number of innerHTML re-renders.
  document.getElementById('bracket').addEventListener('click', (e) => {
    if (isEditingDisabled()) return;
    const advance = e.target.closest('[data-action="advance"]');
    if (!advance) return;
    setBracketWinner(advance.dataset.match, advance.dataset.team);
    renderBracket();
    renderStatusBar();
    renderGlobalActions();
  });
}

// ---------- Status & leaderboard placeholders ----------

function renderUserBar() {
  const bar = document.getElementById('user-bar');
  bar.innerHTML = `
    <span class="user-name">${state.player.name}</span>
    <button id="switch-user" class="link-button">switch</button>
  `;
  document.getElementById('switch-user').addEventListener('click', () => {
    clearStoredPlayer();
    location.reload();
  });
}

function formatCountdown(ms) {
  if (ms <= 0) return 'now';
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function renderStatusBar() {
  const bar = document.getElementById('status-bar');
  const locked = isLocked();
  const lockMoment = new Date(LOCK_DATE_ISO);
  const now = new Date();

  const groupsPicked = Object.values(state.picks.draft.groups).filter(
    (p) => p.first && p.second && p.third,
  ).length;
  const wildcardCount = advancingGroups().length;
  const winnersPicked = state.matches
    .filter((m) => m.stage !== 'group')
    .filter((m) => effectiveWinner(m.id, teamForSlot(m.id, 'a'), teamForSlot(m.id, 'b'))).length;

  bar.innerHTML = `
    <div class="status-card">
      <div>
        <strong>${locked ? 'Picks locked' : `Picks lock in ${formatCountdown(lockMoment - now)}`}</strong>
        <div class="status-sub">${lockMoment.toLocaleString()}</div>
      </div>
      <div><strong>Groups ranked: ${groupsPicked} / 12</strong></div>
      <div><strong>Wildcard 3rds: ${wildcardCount} / 8</strong></div>
      <div><strong>Winner picks: ${winnersPicked} / 32</strong></div>
    </div>
  `;
}

function renderLeaderboardPlaceholder() {
  const lb = document.getElementById('leaderboard');
  if (isLocked()) {
    lb.innerHTML = '<p>Scores update as matches complete.</p>';
  } else {
    lb.innerHTML = '<p>Leaderboard goes live at first kickoff on June 11.</p>';
  }
}

// ---------- Init ----------

async function init() {
  let player = getStoredPlayer();
  if (!player) player = await showPlayerPicker();
  state.player = player;

  renderUserBar();
  await Promise.all([loadReferenceData(), loadCurrentPlayer()]);
  await loadMyPicks();
  renderAll();
  wireGroupsActions();
  wireWildcards();
  wireBracketListener();
  wireGlobalActions();
  wireInternalLinkGuards();
}

document.addEventListener('DOMContentLoaded', init);
