import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupMeals, mealDateFromPhotos, monthDates, sampleMeals, shiftDay } from './journal-data.mjs';

test('calendar starts on a Monday column and handles leap days and year boundaries', () => {
  assert.deepEqual(monthDates('2024-02'), { first: '2024-02-01', next: '2024-03-01', days: 29, blanks: 3 });
  assert.deepEqual(monthDates('2026-12'), { first: '2026-12-01', next: '2027-01-01', days: 31, blanks: 1 });
  assert.equal(shiftDay('2026-01-03', -6), '2025-12-28');
});

test('the calendar can preview two meals and the friend feed retains earlier meals in the same row', () => {
  const meals = sampleMeals('2026-11-24');
  assert.equal(new Set(meals.map(meal => meal.photo)).size, 10);
  const mine = groupMeals(meals.filter(meal => meal.owner === '你'), 'eaten_on');
  assert.equal(mine.get('2026-11-24').length, 2);
  const feed = groupMeals([...meals.filter(meal => meal.owner !== '你'),
    { ...meals[0], id: 'older', eaten_on: '2026-11-22' }].reverse(), 'owner');
  assert.deepEqual([...feed.keys()], ['Jamie', 'Alex', 'Mika', '小禾']);
  assert.deepEqual(feed.get('Jamie').map(meal => meal.id), ['sample-1', 'sample-2', 'sample-11', 'older']);
});

test('an earlier meal published later stays in its place and old records keep their existing ordering', () => {
  const [meal] = sampleMeals('2026-11-24');
  const feed = groupMeals([
    { ...meal, id: 'dinner', eaten_time: '19:00:00', created_at: '19:30' },
    { ...meal, id: 'breakfast', eaten_time: '08:00:00', created_at: '23:00' },
    { ...meal, id: 'legacy-new', created_at: '21:00' },
    { ...meal, id: 'legacy-old', created_at: '17:00' },
    { ...meal, id: 'yesterday', eaten_time: '22:00:00', eaten_on: '2026-11-23' },
  ], 'owner');
  assert.deepEqual(feed.get(meal.owner).map(item => item.id), ['dinner', 'breakfast', 'legacy-new', 'legacy-old', 'yesterday']);
});

test('same-day photos prefill meal date and time; missing or conflicting dates require a selection', () => {
  const infer = (...values) => mealDateFromPhotos(values.map(takenAt => ({ takenAt })), '2026-11-24');
  assert.deepEqual(infer('2026-11-22T18:05', undefined, '2026-11-22T18:02'), { day: '2026-11-22', time: '18:02', reason: '' });
  assert.deepEqual(infer('2026-11-22T23:00', '2026-11-23T00:15'), { day: '', time: '', reason: 'mixed' });
  assert.deepEqual(infer(undefined, '2026-02-30T20:13'), { day: '', time: '', reason: 'missing' });
  assert.equal(infer('2026-11-25T07:00').reason, 'missing');
});
