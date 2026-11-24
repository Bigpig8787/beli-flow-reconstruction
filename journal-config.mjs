export const vendorFiles = {
  'vendor/supabase.js': 'node_modules/@supabase/supabase-js/dist/umd/supabase.js',
  'vendor/qrcode.mjs': 'node_modules/qrcode-generator/dist/qrcode.mjs',
  'vendor/exif-reader.js': 'node_modules/exifreader/dist/exif-reader.js',
};

export function journalConfig() {
  const { FOMERY_SUPABASE_URL: url, FOMERY_SUPABASE_PUBLISHABLE_KEY: key, FOMERY_GOOGLE_MAPS_BROWSER_KEY: mapsKey } = process.env;
  if ((url || key) && (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url) || !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key)))
    throw new Error('Provide the Supabase project URL and its browser publishable key.');
  if (mapsKey && !/^AIza[A-Za-z0-9_-]{35}$/.test(mapsKey)) throw new Error('Provide a website-restricted Google Maps browser key.');
  return { url, key, mapsKey };
}
