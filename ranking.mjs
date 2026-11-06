export const moods = ['liked', 'fine', 'disliked'];
const scoreTarget = 10;
const discoveryTarget = 15;

export function beginRanking(ranked, entry) {
  if (!moods.includes(entry.mood)) throw new RangeError('Choose a rating first');
  const others = ranked.filter(item => item.id !== entry.id);
  const before = others.filter(item => moods.indexOf(item.mood) < moods.indexOf(entry.mood));
  const peers = others.filter(item => item.mood === entry.mood);
  const after = others.filter(item => moods.indexOf(item.mood) > moods.indexOf(entry.mood));
  return { entry, before, peers, after, low: 0, high: peers.length, history: [] };
}

export function opponent({ peers, low, high }) {
  return low < high ? peers[Math.floor((low + high) / 2)] : null;
}

export function compare(draft, choice) {
  const { low, high, history } = draft;
  if (choice === 'undo') {
    return history.length ? { ...draft, ...history.at(-1), history: history.slice(0, -1) } : draft;
  }
  if (low === high) return draft;
  const middle = Math.floor((low + high) / 2);
  const previous = [...history, { low, high }];
  // shortcut: same-rating insertion and ties are modeled from the recording, update if the shipped rule is recovered.
  switch (choice) {
    case 'new': return { ...draft, high: middle, history: previous };
    case 'existing': return { ...draft, low: middle + 1, history: previous };
    case 'tie': return { ...draft, low: middle + 1, high: middle + 1, history: previous };
    case 'skip': return { ...draft, low: high, history: previous };
    default: throw new RangeError('Unknown comparison choice');
  }
}

export function finishRanking({ entry, before, peers, after, low, high }) {
  if (low < high) return null;
  return [...before, ...peers.slice(0, low), entry, ...peers.slice(low), ...after];
}

export function progress(ranked) {
  const count = new Set(ranked.map(entry => entry.id)).size;
  return { count, target: discoveryTarget, unlocked: count >= discoveryTarget };
}

export function score(rank, count) {
  if (count < scoreTarget || rank < 1 || rank > count) return null;
  // shortcut: the 10-place gate is observed, scores use linear spacing until the original formula is evidenced.
  return (10 * (count - rank) / (count - 1)).toFixed(1);
}
