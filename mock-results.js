// ABOUTME: Synthetic tournament results for previewing the bracket "live" state.
// ABOUTME: Hardcoded outcomes per match; replaced by real results pipeline in Phase 4.

// Snapshot: knockouts have progressed through the semifinals. The 3rd-place
// match is in progress; the Final is the next scheduled match. Group-stage
// results are not detailed individually — the live scores page renders group
// matches from kickoff time only until Phase 4 wires in real scores.

window.MOCK_TOURNAMENT = {
  // 'not_started' hides all overlays; 'in_progress' / 'completed' enables them.
  status: 'in_progress',
  asOfLabel: '3rd-place match underway',

  // The currently in-progress match (one at a time in mock; Phase 4 may have many).
  liveNow: {
    matchId: 'M103',
    minute: 67,
  },

  // Group advancers (top 2 + best-8 third-places).
  groupOutcomes: {
    A: { first: 'MEX', second: 'KOR', third: 'RSA', third_advances: true },
    B: { first: 'SUI', second: 'CAN', third: 'QAT', third_advances: false },
    C: { first: 'BRA', second: 'MAR', third: 'SCO', third_advances: true },
    D: { first: 'USA', second: 'AUS', third: 'PAR', third_advances: true },
    E: { first: 'GER', second: 'ECU', third: 'CIV', third_advances: true },
    F: { first: 'NED', second: 'JPN', third: 'TUN', third_advances: false },
    G: { first: 'BEL', second: 'IRN', third: 'EGY', third_advances: false },
    H: { first: 'ESP', second: 'URU', third: 'KSA', third_advances: true },
    I: { first: 'FRA', second: 'SEN', third: 'NOR', third_advances: true },
    J: { first: 'ARG', second: 'AUT', third: 'ALG', third_advances: false },
    K: { first: 'POR', second: 'COL', third: 'UZB', third_advances: true },
    L: { first: 'ENG', second: 'CRO', third: 'PAN', third_advances: true },
  },

  // Knockout match results keyed by match id.
  // Shape per entry:
  //   team_a, team_b — actual teams in the slot (codes)
  //   played: true   — match is final; winner + score populated
  //   live:   true   — match is in progress; score populated, winner null
  //   (neither)      — match hasn't started yet
  matchResults: {
    // R32 (M73..M88)
    M73: { team_a: 'KOR', team_b: 'CAN', winner: 'KOR', score: '1-0', played: true },
    M74: { team_a: 'GER', team_b: 'SCO', winner: 'GER', score: '3-1', played: true },
    M75: { team_a: 'NED', team_b: 'MAR', winner: 'NED', score: '2-0', played: true },
    M76: { team_a: 'BRA', team_b: 'JPN', winner: 'BRA', score: '4-1', played: true },
    M77: { team_a: 'FRA', team_b: 'PAR', winner: 'FRA', score: '2-1', played: true },
    M78: { team_a: 'ECU', team_b: 'SEN', winner: 'ECU', score: '1-0', played: true },
    M79: { team_a: 'MEX', team_b: 'KSA', winner: 'MEX', score: '2-1', played: true },
    M80: { team_a: 'ENG', team_b: 'UZB', winner: 'ENG', score: '3-0', played: true },
    M81: { team_a: 'USA', team_b: 'CIV', winner: 'USA', score: '2-1', played: true },
    M82: { team_a: 'BEL', team_b: 'RSA', winner: 'BEL', score: '2-0', played: true },
    M83: { team_a: 'COL', team_b: 'CRO', winner: 'CRO', score: '1-0', played: true },
    M84: { team_a: 'ESP', team_b: 'AUT', winner: 'ESP', score: '4-0', played: true },
    M85: { team_a: 'SUI', team_b: 'NOR', winner: 'SUI', score: '1-0', played: true },
    M86: { team_a: 'ARG', team_b: 'URU', winner: 'ARG', score: '3-1', played: true },
    M87: { team_a: 'POR', team_b: 'PAN', winner: 'POR', score: '2-1', played: true },
    M88: { team_a: 'AUS', team_b: 'IRN', winner: 'AUS', score: '2-1', played: true },

    // R16 (M89..M96). Per seed: W74/W77, W73/W75, W76/W78, W79/W80, W83/W84, W81/W82, W86/W88, W85/W87.
    M89: { team_a: 'GER', team_b: 'FRA', winner: 'FRA', score: '2-1', played: true },
    M90: { team_a: 'KOR', team_b: 'NED', winner: 'NED', score: '2-0', played: true },
    M91: { team_a: 'BRA', team_b: 'ECU', winner: 'BRA', score: '3-1', played: true },
    M92: { team_a: 'MEX', team_b: 'ENG', winner: 'MEX', score: '2-1', played: true },
    M93: { team_a: 'CRO', team_b: 'ESP', winner: 'ESP', score: '2-0', played: true },
    M94: { team_a: 'USA', team_b: 'BEL', winner: 'BEL', score: '1-0', played: true },
    M95: { team_a: 'ARG', team_b: 'AUS', winner: 'ARG', score: '2-1', played: true },
    M96: { team_a: 'SUI', team_b: 'POR', winner: 'POR', score: '2-1', played: true },

    // QF (M97..M100). Per seed: W89/W90, W93/W94, W91/W92, W95/W96.
    M97:  { team_a: 'FRA', team_b: 'NED', winner: 'FRA', score: '2-1', played: true },
    M98:  { team_a: 'ESP', team_b: 'BEL', winner: 'ESP', score: '3-2', played: true },
    M99:  { team_a: 'BRA', team_b: 'MEX', winner: 'BRA', score: '2-1', played: true },
    M100: { team_a: 'ARG', team_b: 'POR', winner: 'ARG', score: '2-0', played: true },

    // SF (M101..M102). Per seed: W97/W98, W99/W100.
    M101: { team_a: 'FRA', team_b: 'ESP', winner: 'ESP', score: '1-0', played: true },
    M102: { team_a: 'BRA', team_b: 'ARG', winner: 'BRA', score: '2-1', played: true },

    // 3rd place (M103, live) and Final (M104, upcoming).
    M103: { team_a: 'FRA', team_b: 'ARG', winner: null, score: '1-1', live: true },
    M104: { team_a: 'ESP', team_b: 'BRA' },
  },
};
