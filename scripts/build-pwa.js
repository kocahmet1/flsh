// Runs after `expo export`: fills the precache list into dist/sw.js.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dist = path.join(__dirname, '..', 'dist');
const swPath = path.join(dist, 'sw.js');

if (!fs.existsSync(swPath)) {
  console.error('dist/sw.js not found. Is public/sw.js present and did `expo export` copy it?');
  process.exit(1);
}
if (!fs.existsSync(path.join(dist, 'manifest.webmanifest'))) {
  console.error('dist/manifest.webmanifest not found. Check public/manifest.webmanifest.');
  process.exit(1);
}

const SKIP = new Set(['sw.js', '_redirects', '_sitemap.html', '+not-found.html', '.DS_Store']);
const MEDIA_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.mp4', '.webm', '.jpg', '.jpeg']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const core = [];
const media = [];
const hash = crypto.createHash('sha1');
let coreBytes = 0;
let mediaBytes = 0;

for (const file of walk(dist).sort()) {
  const rel = path.relative(dist, file).split(path.sep).join('/');
  const base = path.posix.basename(rel);
  if (SKIP.has(base) || rel.endsWith('.map')) continue;
  const url = '/' + rel.split('/').map(encodeURIComponent).join('/');
  const size = fs.statSync(file).size;
  if (MEDIA_EXT.has(path.extname(rel).toLowerCase())) {
    media.push(url);
    mediaBytes += size;
    hash.update(url + ':' + size);
  } else {
    core.push(url);
    coreBytes += size;
    hash.update(url);
    hash.update(fs.readFileSync(file));
  }
}

const buildId = hash.digest('hex').slice(0, 12);
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw
  .replace('"__BUILD_ID__"', JSON.stringify(buildId))
  .replace('["__CORE_URLS__"]', JSON.stringify(core))
  .replace('["__MEDIA_URLS__"]', JSON.stringify(media));
fs.writeFileSync(swPath, sw);

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
console.log(`PWA: build ${buildId}, ${core.length} core files (${mb(coreBytes)}), ${media.length} media files (${mb(mediaBytes)})`);
