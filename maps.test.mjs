import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mapSearchLinks } from './maps.mjs';

test('both map providers receive the complete place query with reserved characters encoded', () => {
  const query = '  台中市 A&B 咖啡 #2 + "中區"  ';
  const links = mapSearchLinks(query);
  for (const [provider, href] of Object.entries(links)) {
    const url = new URL(href);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, provider === 'google' ? 'www.google.com' : 'maps.apple.com');
    assert.equal(url.searchParams.get('query'), query.trim());
    assert.equal(url.hash, '');
  }
  assert.equal(new URL(links.google).searchParams.get('api'), '1');
  assert.equal(new URL(links.apple).pathname, '/search');
});

test('empty or oversized searches cannot produce misleading map links', () => {
  for (const invalid of ['', '  ', null, undefined, '店'.repeat(201)]) {
    assert.throws(() => mapSearchLinks(invalid), RangeError);
  }
  assert.ok(mapSearchLinks('店'.repeat(200)).google.length < 2048);
});
