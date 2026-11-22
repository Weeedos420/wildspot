// Downloads every campsite, service and hidden gem in Australia from OpenStreetMap (Overpass API)
// and writes them as static files the app loads: data/index.json + data/cells/<key>.json (0.5° grid).
// Run: node scripts/build-data.mjs   (takes 20-60 minutes; GitHub Actions runs it monthly)
import { mkdir, writeFile, readFile, rm, rename } from 'node:fs/promises';
import { query, parse, cellKeyOf } from '../shared.js';

const BBOX = [112, -44, 154, -9]; // west, south, east, north: mainland, Tasmania, Torres Strait
const CHUNK = 3; // degrees per Overpass request
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OUT = new URL('../data/', import.meta.url);
const TMP = new URL('../data.tmp/', import.meta.url);
const CHUNKS = new URL('../data.chunks/', import.meta.url); // finished chunks, so an interrupted run can resume
await mkdir(CHUNKS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let best = null; // stick to the server that last answered
async function overpass(q) {
  for (let attempt = 0; attempt < 10; attempt++) {
    for (const url of [...new Set([best, ...SERVERS].filter(Boolean))]) {
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Wildspot-data-builder/1.0' },
          signal: AbortSignal.timeout(240000) });
        if (r.ok) { const j = await r.json(); best = url; return j; }
        console.warn(`  ${url} → HTTP ${r.status}`);
      } catch (e) { console.warn(`  ${url} → ${e.name}`); }
    }
    await sleep(Math.min(30000 * (attempt + 1), 180000));
  }
  throw new Error('All Overpass servers failed');
}

const cells = new Map();
let total = 0;
const [W, S, E, N] = BBOX;
const chunks = [];
for (let s = S; s < N; s += CHUNK) for (let w = W; w < E; w += CHUNK) chunks.push([s, w, Math.min(s + CHUNK, N), Math.min(w + CHUNK, E)]);
let next = 0, done = 0;
async function worker() { // 2 requests at a time, polite to the free servers
  while (next < chunks.length) {
    const [s, w, n, e] = chunks[next++], t = Date.now();
    const file = new URL(`${s}_${w}.json`, CHUNKS);
    let spots;
    try { spots = JSON.parse(await readFile(file, 'utf8')); }
    catch { spots = parse(await overpass(query(s, w, n, e, 180))); await writeFile(file, JSON.stringify(spots)); }
    for (const sp of spots) {
      const k = cellKeyOf(sp.lat, sp.lon);
      if (!cells.has(k)) cells.set(k, new Map());
      cells.get(k).set(sp.id, sp); // Map dedupes features on chunk borders
    }
    total += spots.length;
    console.log(`[${++done}/${chunks.length}] ${s},${w} → ${spots.length} posti (${((Date.now() - t) / 1000).toFixed(0)}s)`);
  }
}
await Promise.all([worker(), worker()]);

await rm(TMP, { recursive: true, force: true });
await mkdir(new URL('cells/', TMP), { recursive: true });
const index = { version: new Date().toISOString().slice(0, 10), bbox: BBOX, total: 0, bytes: 0, cells: {} };
for (const [k, m] of cells) {
  const body = JSON.stringify([...m.values()]);
  await writeFile(new URL(`cells/${k}.json`, TMP), body);
  index.cells[k] = m.size; index.total += m.size; index.bytes += body.length;
}
await writeFile(new URL('index.json', TMP), JSON.stringify(index));
await rm(OUT, { recursive: true, force: true });
await rename(TMP, OUT);
await rm(CHUNKS, { recursive: true, force: true });
console.log(`Fatto: ${index.total} posti in ${cells.size} celle, ${(index.bytes / 1048576).toFixed(1)} MB`);
