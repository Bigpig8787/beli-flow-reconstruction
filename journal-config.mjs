export const vendorFiles = {
  'vendor/supabase.js': 'node_modules/@supabase/supabase-js/dist/umd/supabase.js',
  'vendor/qrcode.mjs': 'node_modules/qrcode-generator/dist/qrcode.mjs',
};

export function journalConfig() {
  const { FOMERY_SUPABASE_URL: url, FOMERY_SUPABASE_PUBLISHABLE_KEY: key } = process.env;
  if (!url && !key) return {};
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url) || !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key))
    throw new Error('Provide the Supabase project URL and its browser publishable key.');
  return { url, key };
}
