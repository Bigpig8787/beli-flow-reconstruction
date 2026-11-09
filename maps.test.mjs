import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as maps from './maps.mjs';
test('maps safely encodes search and directions with official URL parameters', () => {
  const search = new URL(maps.mapsUrl('台南 A&B 咖啡'));
  assert.equal(search.origin, 'https://www.google.com');
  assert.equal(search.pathname, '/maps/search/');
  assert.equal(search.searchParams.get('api'), '1');
  assert.equal(search.searchParams.get('query'), '台南 A&B 咖啡');
  const route = new URL(maps.mapsUrl('台南車站', 'directions'));
  assert.equal(route.pathname, '/maps/dir/');
  assert.equal(route.searchParams.get('destination'), '台南車站');
  assert.throws(() => maps.mapsUrl('  '));
});
