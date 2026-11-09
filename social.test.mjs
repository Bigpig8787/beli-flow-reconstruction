import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as social from './social.mjs';

test('members can chat and another group member sees the same persisted conversation', () => {
  let s = social.createSocialState();
  s = social.transition(s, { type:'message', group:'foodies', text:'今晚吃什麼？' });
  s = social.transition(JSON.parse(JSON.stringify(s)), { type:'actor', id:'jamie' });
  assert.equal(s.messages[0].text, '今晚吃什麼？');
  assert.equal(s.messages[0].actor, 'you');
  assert.equal(s.pets.you.xp, 40);
  assert.throws(() => social.transition(s, { type:'message', group:'foodies', text:' ' }));
  assert.throws(() => social.transition(s, { type:'message', group:'foodies', text:'x'.repeat(201) }));
  s = social.transition(s, { type:'actor', id:'mika' });
  assert.throws(() => social.transition(s, { type:'message', group:'foodies', text:'hello' }));
});

test('pet interaction is limited per pair per day across groups and records a reaction', () => {
  let s = social.createSocialState();
  s = social.transition(s, { type:'petPlay', group:'foodies', target:'jamie' });
  assert.equal(s.pets.you.xp, 45);
  assert.equal(s.pets.jamie.xp, 85);
  assert.equal(s.petInteractions[0].target, 'jamie');
  assert.throws(() => social.transition(s, { type:'petPlay', group:'foodies', target:'you' }));
  assert.throws(() => social.transition(s, { type:'petPlay', group:'foodies', target:'mika' }));
  s = social.transition(s, { type:'actor', id:'jamie' });
  assert.throws(() => social.transition(s, { type:'petPlay', group:'foodies', target:'you' }));
  s = social.transition(s, { type:'nextDay' });
  s = social.transition(s, { type:'petPlay', group:'foodies', target:'you' });
  assert.equal(s.pets.you.xp, 50);
});

test('posts record exact growth and evolution, including no reward on repeat posts', () => {
  const old = social.createSocialState();
  delete old.messages; delete old.petInteractions;
  let s = social.transition(old, { type:'post', group:'foodies', text:'美食紀錄' });
  assert.deepEqual(s.posts[0].growth, { before:40, after:60, xp:20, coins:30, evolved:true });
  s = social.transition(s, { type:'post', group:'foodies', text:'再分享一篇' });
  assert.deepEqual(s.posts[0].growth, { before:60, after:60, xp:0, coins:0, evolved:false });
});

test('friend requests require acceptance and cannot duplicate', () => {
  let s = social.createSocialState();
  s = social.transition(s, { type: 'request', target: 'mika' });
  assert.equal(s.requests.length, 1);
  assert.throws(() => social.transition(s, { type: 'request', target: 'mika' }));
  s = social.transition(s, { type: 'actor', id: 'mika' });
  s = social.transition(s, { type: 'accept', target: 'you' });
  assert.ok(s.friends.some(pair => pair.includes('you') && pair.includes('mika')));
  assert.equal(s.requests.length, 0);
});

test('group membership gates events; invitations do not automatically join friends', () => {
  let s = social.createSocialState();
  s = social.transition(s, { type: 'joinGroup', id: 'coffee' });
  assert.equal(s.groups.find(g => g.id === 'coffee').members.filter(id => id === 'you').length, 1);
  s = social.transition(s, { type: 'createEvent', title: '週末咖啡', group: 'coffee', place: '14', date: '2030-01-01T12:00', capacity: 2 });
  const id = s.events[0].id;
  s = social.transition(s, { type: 'invite', id, target: 'jamie' });
  assert.deepEqual(s.events[0].members, ['you']);
  s = social.transition(s, { type: 'actor', id: 'jamie' });
  s = social.transition(s, { type: 'joinEvent', id });
  assert.equal(s.events[0].members.length, 2);
  s = social.transition(s, { type: 'actor', id: 'alex' });
  assert.throws(() => social.transition(s, { type: 'joinEvent', id }));
});

test('daily posts reward once, evolve across days, and skins charge once', () => {
  let s = social.createSocialState();
  const action = { type: 'post', group: 'foodies', text: '今天的拉麵很好吃' };
  s = social.transition(s, action);
  assert.equal(s.pets.you.xp, 60);
  assert.equal(social.petStage(s.pets.you.xp).name, '美食探險家');
  s = social.transition(s, action);
  assert.equal(s.pets.you.xp, 60);
  s = social.transition(s, { type: 'nextDay' });
  s = social.transition(s, action);
  assert.equal(s.pets.you.xp, 80);
  s = social.transition(s, { type: 'skin', id: 'chef' });
  const coins = s.pets.you.coins;
  s = social.transition(s, { type: 'skin', id: 'chef' });
  assert.equal(s.pets.you.coins, coins);
  assert.equal(s.pets.you.skin, 'chef');
  assert.throws(() => social.transition(s, { type: 'skin', id: 'royal' }));
});

test('invalid posts and unauthorized invitations leave original state intact', () => {
  const s = social.createSocialState();
  assert.throws(() => social.transition(s, { type: 'post', group: 'coffee', text: 'hello' }));
  assert.throws(() => social.transition(s, { type: 'post', group: 'foodies', text: '  ' }));
  assert.throws(() => social.transition(s, { type: 'invite', id: 'dinner', target: 'mika' }));
  assert.equal(s.posts.length, 0);
  assert.equal(s.pets.you.xp, 40);
});
