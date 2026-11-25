import { mkdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises';
import { journalConfig, vendorFiles } from './journal-config.mjs';
const root = new URL('./', import.meta.url);
const config = journalConfig();
await mkdir(new URL('dist/', root), { recursive: true });
for (const name of ['index.html','fomery-wordmark.svg','demo.html','styles.css','app.mjs','catalog.mjs','ranking.mjs','social.mjs','social-ui.mjs','maps.mjs','photos.mjs','photo-ui.mjs','ui-options.html','ui-preview.css','ui-preview.mjs','record.css','journal.mjs','journal.css','journal-data.mjs','journal-media.mjs','meal-reader.mjs']) {
  await copyFile(new URL(name,root), new URL('dist/'+name,root));
}
await cp(new URL('preview-photos/', root), new URL('dist/preview-photos/', root), { recursive: true });
await cp(new URL('meal-photos/', root), new URL('dist/meal-photos/', root), { recursive: true });
await mkdir(new URL('dist/vendor/', root), { recursive: true });
for (const [name, source] of Object.entries(vendorFiles)) {
  await copyFile(new URL(source, root), new URL('dist/' + name, root));
}
await copyFile(new URL('node_modules/@supabase/supabase-js/LICENSE', root), new URL('dist/vendor/supabase-LICENSE.txt', root));
const exifLicense = await readFile(new URL('node_modules/exifreader/LICENSE', root), 'utf8');
await writeFile(new URL('dist/vendor/exif-reader-LICENSE.txt', root), 'Source: https://github.com/mattiasw/ExifReader/tree/v4.52.0\n\n' + exifLicense);
await writeFile(new URL('dist/journal-config.json', root), JSON.stringify(config));
await writeFile(new URL('dist/.nojekyll',root), '');
console.log('GitHub Pages files ready in dist/');
