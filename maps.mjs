// Google Maps links for real user-entered places, separate from demo coordinates.
export function mapsUrl(query, mode = 'search') {
  const text = String(query ?? '').trim();
  if (!text || text.length > 180) throw new Error('請輸入 1–180 字的地點或地址');
  const directions = mode === 'directions';
  const url = new URL(directions ? 'https://www.google.com/maps/dir/' : 'https://www.google.com/maps/search/');
  url.searchParams.set('api','1');
  url.searchParams.set(directions ? 'destination' : 'query', text);
  return url.href;
}
