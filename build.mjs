import { mkdir, copyFile, writeFile } from 'node:fs/promises';
const root = new URL('./', import.meta.url);
await mkdir(new URL('dist/', root), { recursive: true });
for (const name of ['index.html','styles.css','app.mjs','catalog.mjs','ranking.mjs','social.mjs','social-ui.mjs','maps.mjs']) {
  await copyFile(new URL(name,root), new URL('dist/'+name,root));
}
await writeFile(new URL('dist/.nojekyll',root), '');
console.log('GitHub Pages files ready in dist/');
