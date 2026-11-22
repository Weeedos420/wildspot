// Builds the static Australia dataset the app loads: data/index.json + data/cells/<key>.json (0.5° grid).
// Input is the OpenStreetMap extract of Australia from Geofabrik, filtered with osmium-tool (fast, no Overpass).
// Run: node scripts/build-data.mjs australia-latest.osm.pbf   (needs `osmium` on PATH; GitHub Actions runs it monthly)
import { mkdir, writeFile, rm, rename } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { parse, cellKeyOf } from '../shared.js';

const BBOX = [112, -44, 154, -9]; // west, south, east, north: mainland, Tasmania, Torres Strait
const PBF = process.argv[2];
if (!PBF) throw new Error('Usage: node scripts/build-data.mjs <australia.osm.pbf>');
const FILTERED = 'wildspot-filtered.osm.pbf';
const OUT = new URL('../data/', import.meta.url);
const TMP = new URL('../data.tmp/', import.meta.url);

// Same features as the app's Overpass query (shared.js → query)
execFileSync('osmium', ['tags-filter', PBF, '--overwrite', '-o', FILTERED,
  'nwr/tourism=camp_site,caravan_site,picnic_site,viewpoint,attraction',
  'nwr/amenity=drinking_water,water_point,toilets,shower,sanitary_dump_station',
  'nwr/natural=hot_spring,cave_entrance,beach,waterfall',
  'nwr/waterway=waterfall'], { stdio: 'inherit' });

// Every feature as one GeoJSON line; ways/areas get the centre of their bounding box, like Overpass "out center".
function bounds(c, b) {
  if (typeof c[0] === 'number') { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }
  else for (const x of c) bounds(x, b);
  return b;
}
const elements = [];
const osm = spawn('osmium', ['export', FILTERED, '-f', 'geojsonseq', '-x', 'print_record_separator=false', '-a', 'type,id'],
  { stdio: ['ignore', 'pipe', 'inherit'] });
for await (const line of createInterface({ input: osm.stdout })) {
  if (!line.trim()) continue;
  const f = JSON.parse(line), p = f.properties || {};
  const [w, s, e, n] = bounds(f.geometry.coordinates, [Infinity, Infinity, -Infinity, -Infinity]);
  const tags = {};
  for (const k in p) if (k[0] !== '@') tags[k] = p[k];
  elements.push({ type: p['@type'], id: p['@id'], lat: (s + n) / 2, lon: (w + e) / 2, tags });
}
const code = await new Promise(r => osm.on('close', r));
if (code !== 0) throw new Error(`osmium export exited with ${code}`);

const cells = new Map();
for (const sp of parse({ elements })) {
  if (sp.lon < BBOX[0] || sp.lat < BBOX[1] || sp.lon >= BBOX[2] || sp.lat >= BBOX[3]) continue;
  const k = cellKeyOf(sp.lat, sp.lon);
  if (!cells.has(k)) cells.set(k, new Map());
  cells.get(k).set(sp.id, sp);
}

await rm(TMP, { recursive: true, force: true });
await mkdir(new URL('cells/', TMP), { recursive: true });
const index = { version: new Date().toISOString().slice(0, 10), bbox: BBOX, total: 0, bytes: 0, cells: {} };
for (const [k, m] of cells) {
  const body = JSON.stringify([...m.values()]);
  await writeFile(new URL(`cells/${k}.json`, TMP), body);
  index.cells[k] = m.size; index.total += m.size; index.bytes += body.length;
}
if (index.total < 20000) throw new Error(`Only ${index.total} places: something went wrong, not publishing`);
await writeFile(new URL('index.json', TMP), JSON.stringify(index));
await rm(OUT, { recursive: true, force: true });
await rename(TMP, OUT);
await rm(FILTERED, { force: true });
console.log(`Fatto: ${index.total} posti in ${cells.size} celle, ${(index.bytes / 1048576).toFixed(1)} MB`);
