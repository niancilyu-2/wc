// ABOUTME: 8-best-3rds → R32 wildcard slot assignment for the WC 2026 bracket.
// ABOUTME: Pre-computes a lookup table for all 495 8-of-12 group combinations.

// FIFA's eight wildcard R32 slots and the group codes each is eligible for.
// Source: Wikipedia's 2026 FIFA World Cup knockout stage page (R32 pairings).
export const WILDCARD_SLOTS = [
  { matchId: 'M74', eligible: ['A', 'B', 'C', 'D', 'F'] },
  { matchId: 'M77', eligible: ['C', 'D', 'F', 'G', 'H'] },
  { matchId: 'M79', eligible: ['C', 'E', 'F', 'H', 'I'] },
  { matchId: 'M80', eligible: ['E', 'H', 'I', 'J', 'K'] },
  { matchId: 'M81', eligible: ['B', 'E', 'F', 'I', 'J'] },
  { matchId: 'M82', eligible: ['A', 'E', 'H', 'I', 'J'] },
  { matchId: 'M85', eligible: ['E', 'F', 'G', 'I', 'J'] },
  { matchId: 'M87', eligible: ['D', 'E', 'I', 'J', 'L'] },
];

export const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Backtracking matcher: assign each slot to a group from `picked` that's
// in its eligibility list, with each group used at most once. Greedy on
// the slot order; deterministic; returns the first valid full assignment
// it finds or null if none exists.
export function findAssignment(pickedGroups) {
  const remaining = new Set(pickedGroups);
  const result = {};
  function recurse(slotIdx) {
    if (slotIdx === WILDCARD_SLOTS.length) return remaining.size === 0;
    const slot = WILDCARD_SLOTS[slotIdx];
    for (const g of slot.eligible) {
      if (!remaining.has(g)) continue;
      result[slot.matchId] = g;
      remaining.delete(g);
      if (recurse(slotIdx + 1)) return true;
      remaining.add(g);
      delete result[slot.matchId];
    }
    return false;
  }
  return recurse(0) ? { ...result } : null;
}

// All combinations of `k` items from `arr`.
function* combinations(arr, k) {
  if (k === 0) {
    yield [];
    return;
  }
  if (k > arr.length) return;
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

// Builds the full 495-row lookup table once at module load.
// Key = sorted 8-letter string (e.g. "ABCDEFGH"). Value = { matchId: groupCode } map.
function buildTable() {
  const table = {};
  for (const combo of combinations(ALL_GROUPS, 8)) {
    const key = combo.join('');
    const assignment = findAssignment(combo);
    if (assignment) table[key] = assignment;
  }
  return table;
}

export const WILDCARD_TABLE = buildTable();

export function wildcardKey(pickedGroups) {
  return [...pickedGroups].sort().join('');
}

export function lookupAssignment(pickedGroups) {
  return WILDCARD_TABLE[wildcardKey(pickedGroups)] || null;
}
