import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as catalog from './catalog.mjs';
import { beginRanking, compare, finishRanking, opponent, score } from './ranking.mjs';

test('demo starts with scores and supports ranking a saved restaurant', () => {
  assert.equal(typeof catalog.createDemoState, 'function');
  const state = catalog.createDemoState();
  assert.ok(score(state.ranked[0].id, state.ranked));
  const place = catalog.restaurants.get(state.saved[0]);
  assert.ok(!state.ranked.some(row => row.id === place.id));
  let draft = beginRanking(state.ranked, { ...place, mood: 'liked', tags: [] });
  let steps = 0;
  while (opponent(draft) && steps++ < 20) draft = compare(draft, 'new');
  assert.equal(finishRanking(draft)[0].id, place.id);
  assert.equal(finishRanking(draft).length, state.ranked.length + 1);
});

test('reset produces independent records, including nested tags', () => {
  assert.equal(typeof catalog.createDemoState, 'function');
  const state = catalog.createDemoState();
  state.ranked[0].tags.push('changed');
  state.saved.length = 0;
  const reset = catalog.createDemoState();
  assert.ok(reset.saved.length > 0);
  assert.ok(!reset.ranked[0].tags.includes('changed'));
});
