import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { beginRanking, compare, finishRanking, opponent, progress, score } from './ranking.mjs';

const entry = (id, mood = 'liked', details = {}) => ({ id, mood, ...details });
const ranked = (id, value, mood = 'liked', details = {}) => entry(id, mood, { value, ...details });

test('a new group starts at the midpoint of its rating band', () => {
  const draft = beginRanking([], entry('a'));
  assert.equal(opponent(draft), null);
  assert.deepEqual(finishRanking(draft), [ranked('a', 2.5)]);
});

test('similarity chooses the first opponent and choices narrow the range', () => {
  const a = ranked('a', 2.8, 'liked', { cuisine: '早餐' });
  const b = ranked('b', 2.6);
  const c = ranked('c', 2.4, 'liked', { cuisine: '早餐' });
  let draft = beginRanking([a, b, c], entry('x', 'liked', { cuisine: '早餐' }));
  assert.equal(opponent(draft).id, 'a');
  assert.equal(finishRanking(draft), null);
  draft = compare(draft, 'existing');
  assert.equal(opponent(draft).id, 'c');
  assert.equal(opponent(compare(draft, 'undo')).id, 'a');
  draft = compare(draft, 'new');
  assert.equal(opponent(draft).id, 'b');
  draft = compare(draft, 'existing');
  assert.deepEqual(finishRanking(draft).map(item => item.id), ['a', 'b', 'x', 'c']);
});

test('re-ranking replaces the previous entry and compares within the new group', () => {
  const draft = beginRanking([ranked('a', 2.7), ranked('b', 2.5)], entry('a', 'fine'));
  assert.equal(opponent(draft), null);
  assert.deepEqual(finishRanking(draft), [ranked('b', 2.5), ranked('a', 1.5, 'fine')]);
});

test('skip switches opponent without narrowing placement and tie preserves rank value', () => {
  const draft = beginRanking([ranked('a', 2.8), ranked('b', 2.4)], entry('x'));
  const skipped = compare(draft, 'skip');
  assert.equal(opponent(skipped).id, 'b');
  assert.equal(opponent(compare(skipped, 'undo')).id, 'a');
  assert.equal(finishRanking(skipped), null);
  assert.deepEqual(finishRanking(compare(skipped, 'tie')), [
    ranked('a', 2.8), ranked('b', 2.4), ranked('x', 2.4),
  ]);
});

test('choosing a side after a tie keeps the new entry out of the tied value', () => {
  const draft = beginRanking([ranked('a', 2.5), ranked('b', 2.5)], entry('x'));
  assert.equal(finishRanking(compare(draft, 'new'))[0].value, 2.75);
});

test('local scores use separate rating bands after ten entries', () => {
  const list = Array.from({ length: 8 }, (_, i) => ranked(String(i), 2.9 - i / 10));
  list.push(ranked('fine', 1.6, 'fine'));
  assert.equal(score('0', list), null);
  list.push(ranked('dislike', 0.5, 'disliked'));
  assert.equal(score('0', list), '10.0');
  assert.equal(score('1', list), '9.6');
  assert.equal(score('fine', list), '6.7');
  assert.equal(score('dislike', list), '3.4');
});

test('discovery unlocks after the first rating and counts each restaurant once', () => {
  assert.deepEqual(progress([]), { count: 0, target: 1, unlocked: false });
  assert.deepEqual(progress([entry('a')]), { count: 1, target: 1, unlocked: true });
  assert.deepEqual(progress([entry('a'), entry('a'), entry('b')]), { count: 2, target: 1, unlocked: true });
});
