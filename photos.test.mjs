import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createSocialState, transition } from './social.mjs';
import {
  readExif, nearbyPlaces, placeCoords, photoTransition, visiblePhotos, seedPhotos, petMemories, nextSaturday,
} from './photos.mjs';

// Builds a minimal little-endian JPEG with an EXIF APP1 segment.
function jpegWithExif({ date, lat, lng }) {
  const entries = [];
  const data = [];
  const tiff = [];
  const u16 = n => [n & 255, n >> 8];
  const u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  // Layout: header(8) | IFD0 | ExifIFD | GPSIFD | data
  const ifd = list => 2 + list.length * 12 + 4;
  const ifd0Tags = [0x8769, ...(lat !== undefined ? [0x8825] : [])];
  const exifTags = [0x9003];
  const gpsTags = lat !== undefined ? [1, 2, 3, 4] : [];
  const ifd0At = 8;
  const exifAt = ifd0At + ifd(ifd0Tags);
  const gpsAt = exifAt + ifd(exifTags);
  let dataAt = gpsAt + (gpsTags.length ? ifd(gpsTags) : 0);
  const put = bytes => { const at = dataAt; data.push(...bytes); dataAt += bytes.length; return at; };
  const entry = (tag, type, count, value) => [...u16(tag), ...u16(type), ...u32(count), ...value];
  const dms = v => { const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.round(((a - d) * 60 - m) * 60 * 100);
    return [...u32(d), ...u32(1), ...u32(m), ...u32(1), ...u32(s), ...u32(100)]; };
  const dateBytes = [...Buffer.from(date + '\0', 'ascii')];
  const dateAt = put(dateBytes);
  const latAt = lat !== undefined ? put(dms(lat)) : 0;
  const lngAt = lat !== undefined ? put(dms(lng)) : 0;
  tiff.push(0x49, 0x49, ...u16(42), ...u32(ifd0At));
  tiff.push(...u16(ifd0Tags.length), ...entry(0x8769, 4, 1, u32(exifAt)));
  if (lat !== undefined) tiff.push(...entry(0x8825, 4, 1, u32(gpsAt)));
  tiff.push(...u32(0));
  tiff.push(...u16(1), ...entry(0x9003, 2, dateBytes.length, u32(dateAt)), ...u32(0));
  if (lat !== undefined) {
    tiff.push(...u16(4),
      ...entry(1, 2, 2, [lat < 0 ? 83 : 78, 0, 0, 0]), ...entry(2, 5, 3, u32(latAt)),
      ...entry(3, 2, 2, [lng < 0 ? 87 : 69, 0, 0, 0]), ...entry(4, 5, 3, u32(lngAt)), ...u32(0));
  }
  tiff.push(...data);
  const app1 = [...Buffer.from('Exif\0\0', 'binary'), ...tiff];
  const bytes = [0xFF, 0xD8, 0xFF, 0xE1, ...[(app1.length + 2) >> 8, (app1.length + 2) & 255], ...app1, 0xFF, 0xD9];
  return new Uint8Array(bytes).buffer;
}

test('reads capture time and GPS position from JPEG EXIF', () => {
  const exif = readExif(jpegWithExif({ date: '2026:11:08 12:34:56', lat: 24.1477, lng: 120.6736 }));
  assert.equal(exif.takenAt, '2026-11-08T12:34');
  assert.ok(Math.abs(exif.lat - 24.1477) < 0.0001);
  assert.ok(Math.abs(exif.lng - 120.6736) < 0.0001);
});

test('EXIF without GPS still yields a date, and non-JPEG or broken data yields nothing', () => {
  const exif = readExif(jpegWithExif({ date: '2025:01:02 08:00:00' }));
  assert.equal(exif.takenAt, '2025-01-02T08:00');
  assert.equal(exif.lat, undefined);
  assert.deepEqual(readExif(new Uint8Array([0x89, 0x50, 0x4E, 0x47]).buffer), {});
  const broken = new Uint8Array(jpegWithExif({ date: '2025:01:02 08:00:00', lat: 1, lng: 1 })).slice(0, 40).buffer;
  assert.doesNotThrow(() => readExif(broken));
});

test('nearby places are suggested by distance only within range', () => {
  const target = placeCoords.get('7');
  const found = nearbyPlaces({ lat: target.lat + 0.0005, lng: target.lng });
  assert.equal(found[0].place.id, '7');
  assert.ok(found[0].km < 0.1);
  assert.ok(found.length <= 3);
  assert.deepEqual(nearbyPlaces({ lat: 25.03, lng: 121.56 }), []);
});

const photo = (over = {}) => ({ type: 'photo', place: '7', takenAt: '2026-11-08T12:30', src: 'art:7', caption: '午後咖啡', audience: 'friends', with: [], pet: null, ...over });

test('sharing a photo feeds the pet once per day and private diary photos do not', () => {
  let s = { ...createSocialState(), photos: [] };
  s = photoTransition(s, photo({ audience: 'private' }));
  assert.equal(s.pets.you.xp, 40);
  s = photoTransition(s, photo());
  assert.equal(s.pets.you.xp, 60);
  assert.equal(s.photos[0].growth.xp, 20);
  s = photoTransition(s, photo());
  assert.equal(s.pets.you.xp, 60);
  assert.equal(s.photos.length, 3);
});

test('photo input is validated', () => {
  const s = { ...createSocialState(), photos: [] };
  assert.throws(() => photoTransition(s, photo({ place: '99' })), /店家/);
  assert.throws(() => photoTransition(s, photo({ src: 'javascript:alert(1)' })), /照片/);
  assert.throws(() => photoTransition(s, photo({ caption: 'x'.repeat(141) })), /140/);
  assert.throws(() => photoTransition(s, photo({ with: ['mika'] })), /好友/);
  assert.throws(() => photoTransition(s, photo({ pet: { x: 2, y: .5, scale: .3 } })), /寵物/);
  assert.equal(photoTransition(s, photo({ with: ['jamie'], pet: { x: .5, y: .5, scale: .3 } })).photos[0].with[0], 'jamie');
});

test('friends see shared photos, never private ones or photos of non-friends', () => {
  let s = { ...createSocialState(), photos: [] };
  s = photoTransition(s, photo({ caption: 'shared' }));
  s = photoTransition(s, photo({ caption: 'secret', audience: 'private' }));
  s = transition(s, { type: 'actor', id: 'jamie' });
  assert.deepEqual(visiblePhotos(s, 'friends').map(p => p.caption), ['shared']);
  s = transition(s, { type: 'actor', id: 'mika' });
  assert.deepEqual(visiblePhotos(s, 'friends'), []);
  s = transition(s, { type: 'actor', id: 'you' });
  assert.equal(visiblePhotos(s, 'mine').length, 2);
});

test('"want" toggles, and "together" turns a photo into an invitation in a shared group', () => {
  let s = { ...createSocialState(), photos: [] };
  s = photoTransition(s, photo());
  const id = s.photos[0].id;
  assert.throws(() => photoTransition(s, { type: 'react', id, kind: 'want' }), /自己/);
  s = transition(s, { type: 'actor', id: 'jamie' });
  s = photoTransition(s, { type: 'react', id, kind: 'want' });
  assert.deepEqual(s.photos[0].reactions, [{ actor: 'jamie', kind: 'want' }]);
  s = photoTransition(s, { type: 'react', id, kind: 'want' });
  assert.deepEqual(s.photos[0].reactions, []);
  s = photoTransition(s, { type: 'react', id, kind: 'together' });
  const event = s.events[0];
  assert.equal(event.host, 'jamie');
  assert.deepEqual(event.invited, ['you']);
  assert.equal(event.place, '7');
  assert.equal(event.photo, id);
  assert.throws(() => photoTransition(s, { type: 'react', id, kind: 'together' }), /已/);
  s = transition(s, { type: 'actor', id: 'you' });
  s = transition(s, { type: 'joinEvent', id: event.id });
  assert.ok(s.events[0].members.includes('you'));
});

test('only the owner can delete a photo', () => {
  let s = { ...createSocialState(), photos: [] };
  s = photoTransition(s, photo());
  const id = s.photos[0].id;
  const asJamie = transition(s, { type: 'actor', id: 'jamie' });
  assert.throws(() => photoTransition(asJamie, { type: 'deletePhoto', id }));
  assert.equal(photoTransition(s, { type: 'deletePhoto', id }).photos.length, 0);
});

test('seed photos are valid and pet memories list friends the pet has eaten with', () => {
  const s = { ...createSocialState(), photos: seedPhotos(createSocialState()) };
  assert.ok(visiblePhotos(s, 'friends').length >= 2);
  for (const p of s.photos) assert.doesNotThrow(() => photoTransition({ ...s, actor: p.actor }, { ...p, type: 'photo' }));
  const memories = petMemories(s, 'you');
  assert.ok(memories.photos.length >= 1);
  assert.ok(memories.friends.every(f => f.count >= 1));
});

test('next Saturday is at least two days ahead', () => {
  assert.equal(nextSaturday('2026-11-09'), '2026-11-14T18:30');
  assert.equal(nextSaturday('2026-11-13'), '2026-11-21T18:30');
});
