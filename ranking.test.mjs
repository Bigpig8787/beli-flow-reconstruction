import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  beginRanking, compare, finishRanking, opponent, progress, score,
} from './ranking.mjs';

const item = (id, mood = 'liked') => ({ id, mood });

test('first restaurant saves without a comparison', () => {
  const draft = beginRanking([], item('a'));
  assert.equal(opponent(draft), null);
  assert.deepEqual(finishRanking(draft), [item('a')]);
});

test('comparisons narrow the insertion point and undo restores the prior question', () => {
  let draft = beginRanking(['a', 'b', 'c', 'd'].map(id => item(id)), item('x'));
  assert.equal(opponent(draft).id, 'c');
  draft = compare(draft, 'new');
  assert.equal(opponent(draft).id, 'b');
  assert.equal(opponent(compare(draft, 'undo')).id, 'c');
  assert.equal(finishRanking(draft), null);
  draft = compare(draft, 'existing');
  assert.deepEqual(finishRanking(draft).map(entry => entry.id), ['a', 'b', 'x', 'c', 'd']);
});

test('another rating band does not add a comparison, and reranking replaces a record', () => {
  const draft = beginRanking([item('a'), item('b')], item('a', 'fine'));
  assert.equal(opponent(draft), null);
  assert.deepEqual(finishRanking(draft), [item('b'), item('a', 'fine')]);
});

test('tie and skip give stable placements without dropping records', () => {
  const draft = beginRanking([item('a'), item('b'), item('c')], item('x'));
  assert.deepEqual(finishRanking(compare(draft, 'tie')).map(entry => entry.id), ['a', 'b', 'x', 'c']);
  assert.deepEqual(finishRanking(compare(draft, 'skip')).map(entry => entry.id), ['a', 'b', 'c', 'x']);
});

test('progress counts unique restaurants, with separate score and discovery thresholds', () => {
  assert.deepEqual(progress([item('a'), item('a'), item('b')]), { count: 2, target: 15, unlocked: false });
  assert.equal(progress(Array.from({ length: 15 }, (_, i) => item(String(i)))).unlocked, true);
  assert.equal(score(1, 9), null);
  assert.equal(score(1, 10), '10.0');
  assert.equal(score(10, 10), '0.0');
});
