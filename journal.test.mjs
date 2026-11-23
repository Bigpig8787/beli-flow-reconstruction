import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupMeals, monthDates, sampleMeals, shiftDay } from './journal-data.mjs';

test('calendar starts on a Monday column and handles leap days and year boundaries', () => {
  assert.deepEqual(monthDates('2024-02'), { first: '2024-02-01', next: '2024-03-01', days: 29, blanks: 3 });
  assert.deepEqual(monthDates('2026-12'), { first: '2026-12-01', next: '2027-01-01', days: 31, blanks: 1 });
  assert.equal(shiftDay('2026-01-03', -6), '2025-12-28');
});

test('all ten demo photos are reachable and the friend feed keeps only two newest meals per person', () => {
  const meals = sampleMeals('2026-11-24');
  assert.equal(new Set(meals.map(meal => meal.photo)).size, 10);
  const mine = groupMeals(meals.filter(meal => meal.owner === '你'), 'eaten_on');
  assert.equal(mine.get('2026-11-24').length, 2);
  const feed = groupMeals([...meals.filter(meal => meal.owner !== '你'),
    { ...meals[0], id: 'older', eaten_on: '2026-11-22' }].reverse(), 'owner', 2);
  assert.deepEqual([...feed.keys()], ['Jamie', 'Alex', 'Mika', '小禾']);
  assert.deepEqual(feed.get('Jamie').map(meal => meal.id), ['sample-1', 'sample-2']);
});
