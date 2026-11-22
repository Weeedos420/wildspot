import * as db from './db.js';
import { CELL, query as cellQuery, parse } from './shared.js';
import { LANG, LOCALE, t, setLang, startTranslation } from './i18n.js';

/* ---------------- config ---------------- */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const TILE_CACHE = 'wildspot-tiles-v1';
const FETCH_ZOOM = 9;             // below this zoom we don't fetch new data
const MAX_CELLS = 12;
const CELL_TTL = 30 * 864e5;      // refresh cached places after 30 days
const MAX_ZONE_TILES = 9000;
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const CATS = {
  camp_free:  { label: 'Campeggio gratuito', emoji: '⛺', color: '#16a34a', group: 'camps' },
  camp:       { label: 'Campeggio', emoji: '🏕️', color: '#2563eb', group: 'camps' },
  caravan:    { label: 'Area camper', emoji: '🚐', color: '#7c3aed', group: 'camps' },
  viewpoint:  { label: 'Punto panoramico', emoji: '🌄', color: '#ea580c', group: 'gems' },
  waterfall:  { label: 'Cascata', emoji: '💦', color: '#0284c7', group: 'gems' },
  hotspring:  { label: 'Sorgente termale', emoji: '♨️', color: '#dc2626', group: 'gems' },
  beach:      { label: 'Spiaggia', emoji: '🏖️', color: '#d97706', group: 'gems' },
  cave:       { label: 'Grotta', emoji: '🦇', color: '#57534e', group: 'gems' },
  attraction: { label: 'Attrazione', emoji: '✨', color: '#db2777', group: 'gems' },
  water:      { label: 'Acqua potabile', emoji: '💧', color: '#0891b2', group: 'services' },
  toilets:    { label: 'Toilette', emoji: '🚻', color: '#64748b', group: 'services' },
  shower:     { label: 'Docce', emoji: '🚿', color: '#0ea5e9', group: 'services' },
  dump:       { label: 'Dump point', emoji: '🚽', color: '#a16207', group: 'services' },
  picnic:     { label: 'Area pic-nic', emoji: '🧺', color: '#65a30d', group: 'services' },
  mine:       { label: 'Il mio spot', emoji: '⭐', color: '#e11d48', group: 'mine' },
};
const RANK = { services: 1, gems: 2, camps: 3, mine: 4 };
const CAMPS = new Set(['camp_free', 'camp', 'caravan']);
const CHIPS = [
  { id: 'camps', label: '⛺ Campeggi', cats: ['camp_free', 'camp', 'caravan'] },
  { id: 'free', label: 'Gratis', mod: true },
  { id: 'gems', label: '💎 Hidden gems', cats: ['viewpoint', 'waterfall', 'hotspring', 'beach', 'cave', 'attraction'] },
  { id: 'water', label: '💧 Acqua', cats: ['water'] },
  { id: 'toilets', label: '🚻 Toilette', cats: ['toilets'] },
  { id: 'shower', label: '🚿 Docce', cats: ['shower'] },
  { id: 'dump', label: '🚽 Dump point', cats: ['dump'] },
  { id: 'picnic', label: '🧺 Pic-nic', cats: ['picnic'] },
  { id: 'dogs', label: '🐕 Cani ok', mod: true },
  { id: 'mine', label: '⭐ I miei', cats: ['mine'] },
];
const AMEN = [
  ['drinking_water', 'Acqua potabile', '💧'], ['toilets', 'Toilette', '🚻'], ['shower', 'Docce', '🚿'],
  ['power_supply', 'Corrente', '🔌'], ['dog', 'Cani', '🐕'], ['tents', 'Tende', '⛺'], ['caravans', 'Caravan', '🚐'],
  ['motorhome', 'Camper', '🚌'], ['bbq', 'Barbecue', '🍖'], ['openfire', 'Fuoco', '🔥'], ['picnic_table', 'Tavoli', '🪑'],
  ['internet_access', 'Wi-Fi', '📶'], ['sanitary_dump_station', 'Dump point', '🚽'], ['swimming_pool', 'Piscina', '🏊'],
  ['shelter', 'Riparo', '🛖'], ['wheelchair', 'Accessibile', '♿'],
];

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.5A3.8 3.8 0 0 1 17.5 18z"/><path d="M12 11v5m0 0-2-2m2 2 2-2"/>',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
  locate: '<path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  nav: '<path d="M3.5 11 20.5 3.5 13 20.5l-2-7.5z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19.5 7"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M5.5 12v6.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V12"/>',
  camera: '<path d="M4 8h3.2l1.8-2.6h6L16.8 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
  edit: '<path d="M4 20h4.2L19 9.2 14.8 5 4 15.8z"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 13h9l1-13M9.5 7V4h5v3"/>',
};
const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
function pref(k, d) { try { const v = localStorage.getItem('ws:' + k); return v ? JSON.parse(v) : d; } catch { return d; } }
function savePref(k, v) { try { localStorage.setItem('ws:' + k, JSON.stringify(v)); } catch { /* private mode */ } }
function distance(a, b) {
  const R = 6371e3, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = m => m < 1000 ? Math.round(m) + ' m' : (m < 100e3 ? nf1 : nf0).format(m / 1000) + ' km';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
function status(msg, spin) {
  const el = $('#status');
  if (!msg) return el.classList.add('hidden');
  el.innerHTML = (spin ? '<span class="spinner"></span>' : '') + esc(msg);
  el.classList.remove('hidden');
}
const starsText = n => '★'.repeat(n) + '☆'.repeat(5 - n);

/* object URLs for photo blobs, grouped so they can be released */
const urlBuckets = { sheet: [], list: [] };
function blobURL(blob, bucket) { const u = URL.createObjectURL(blob); urlBuckets[bucket].push(u); return u; }
function releaseURLs(bucket) { urlBuckets[bucket].forEach(URL.revokeObjectURL); urlBuckets[bucket] = []; }

/* ---------------- state ---------------- */
const S = {
  map: null, templates: {}, glyphs: null, sprite: null, fonts: new Set(),
  spots: new Map(), loaded: new Set(),
  filters: new Set(pref('filters', ['camps', 'gems', 'mine'])),
  user: new Map(), mine: [], pos: null, ctx: null,
  nearSeg: 'camps', savedSeg: 'fav', tab: 'map',
};
const origin = () => S.pos || (S.map ? { lat: S.map.getCenter().lat, lon: S.map.getCenter().lng } : null);

/* ---------------- offline tile cache ---------------- */
let tileCacheP;
const tileCache = () => tileCacheP ||= caches.open(TILE_CACHE);
// Tiles are keyed without the tileset version, so tiles downloaded for a trip keep working after OpenFreeMap updates.
function tileKey(url) {
  const u = new URL(url), seg = u.pathname.split('/').filter(Boolean)[0];
  const m = u.pathname.match(/\/(\d+)\/(\d+)\/(\d+)(?:\.\w+)?$/);
  return `https://wildspot.local/t/${seg}/${m[1]}/${m[2]}/${m[3]}`;
}
async function getTile(url, signal) {
  if (!('caches' in self)) return (await fetch(url, { signal })).arrayBuffer();
  const key = tileKey(url), cache = await tileCache();
  const hit = await cache.match(key);
  if (hit) return hit.arrayBuffer();
  const r = await fetch(url, { signal });
  if (r.status === 204 || r.status === 404) return new ArrayBuffer(0);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = await r.arrayBuffer();
  cache.put(key, new Response(buf.slice(0))).catch(() => {});
  return buf;
}
async function netFirst(url, ms = 6000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (r.ok) { if ('caches' in self) (await tileCache()).put(url, r.clone()).catch(() => {}); return r; }
  } catch { /* offline: fall back to cache */ }
  const c = 'caches' in self && await caches.match(url);
  if (c) return c;
  throw new Error('offline');
}
function tileXY(lon, lat, z) {
  const n = 2 ** z, r = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  const x = Math.floor((lon + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n);
  return [Math.min(n - 1, Math.max(0, x)), Math.min(n - 1, Math.max(0, y))];
}
function zoneTileUrls([w, s, e, n]) {
  const out = [];
  for (const t of Object.values(S.templates)) {
    for (let z = t.minzoom; z <= Math.min(t.maxzoom, 14); z++) {
      const [x0, y0] = tileXY(w, n, z), [x1, y1] = tileXY(e, s, z);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push(t.url.replace('{z}', z).replace('{x}', x).replace('{y}', y));
    }
  }
  return out;
}

/* ---------------- OpenStreetMap data ---------------- */
async function overpass(q) {
  let err;
  const best = pref('overpass', null); // try the last server that answered first
  for (const url of [...new Set([best, ...OVERPASS].filter(Boolean))]) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(50000) });
      if (r.ok) { const j = await r.json(); savePref('overpass', url); return j; }
      err = new Error('HTTP ' + r.status);
    } catch (e) { err = e; }
  }
  throw err;
}
const limit = (() => { // at most 2 Overpass requests at once, to be polite to the free servers
  let active = 0; const wait = [];
  const next = () => { if (active < 2 && wait.length) wait.shift()(); };
  return fn => new Promise((res, rej) => {
    wait.push(() => { active++; fn().then(res, rej).finally(() => { active--; next(); }); });
    next();
  });
})();
function cellsFor([w, s, e, n], c) {
  const out = [];
  for (let i = Math.floor(s / CELL); i <= Math.floor(n / CELL); i++)
    for (let j = Math.floor(w / CELL); j <= Math.floor(e / CELL); j++) out.push({ i, j, key: `${i}_${j}` });
  const d = x => Math.hypot((x.i + .5) * CELL - c.lat, (x.j + .5) * CELL - c.lon);
  return out.sort((a, b) => d(a) - d(b));
}
const inflight = new Map();
// Inside Australia places come from the monthly static files in data/; elsewhere straight from Overpass.
const inIndex = ({ i, j }) => { const b = S.idx?.bbox; return b && j * CELL >= b[0] && i * CELL >= b[1] && j * CELL < b[2] && i * CELL < b[3]; };
async function fetchCell(c) {
  if (inIndex(c)) {
    if (!S.idx.cells[c.key]) return [];
    const r = await fetch(`data/cells/${c.key}.json?v=${S.idx.version}`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const s = c.i * CELL, w = c.j * CELL;
  return parse(await limit(() => overpass(cellQuery(s, w, s + CELL, w + CELL))));
}
function ensureCell(c) {
  const { key } = c;
  if (S.loaded.has(key)) return Promise.resolve();
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    const rec = await db.get('cells', key);
    if (rec) { addSpots(rec.spots); S.loaded.add(key); }
    const v = inIndex(c) ? S.idx.version : null;
    if (rec && (v ? rec.v === v : Date.now() - rec.ts < CELL_TTL)) return;
    if (!navigator.onLine) { if (rec) return; throw new Error('offline'); }
    try {
      const spots = await fetchCell(c);
      await db.put('cells', { key, ts: Date.now(), v, spots });
      addSpots(spots); S.loaded.add(key);
    } catch (e) { if (!rec) throw e; }
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
function addSpots(list) { for (const sp of list) S.spots.set(sp.id, sp); }
const boundsArr = b => [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];

let moveSeq = 0;
async function onMoveEnd() {
  const map = S.map, seq = ++moveSeq;
  if (map.getZoom() < FETCH_ZOOM) return status('Avvicinati per vedere campeggi e spot');
  const cells = cellsFor(boundsArr(map.getBounds()), origin());
  if (cells.length > MAX_CELLS) return status('Avvicinati per vedere campeggi e spot');
  const todo = cells.filter(c => !S.loaded.has(c.key));
  if (!todo.length) return status(null);
  status('Carico i posti…', true);
  let failed = 0;
  await Promise.all(todo.map(c => ensureCell(c).then(render, () => failed++)));
  if (seq !== moveSeq) return;
  status(null);
  if (failed) toast(navigator.onLine ? 'Il server dei dati è occupato, riprova tra poco' : 'Sei offline: vedi solo le zone scaricate');
}

/* ---------------- filters ---------------- */
function visibleCats() {
  const set = new Set();
  for (const c of CHIPS) if (c.cats && S.filters.has(c.id)) c.cats.forEach(x => set.add(x));
  return set;
}
function passesMods(sp) {
  if (!CAMPS.has(sp.cat)) return true;
  if (S.filters.has('free') && sp.tags.fee !== 'no') return false;
  if (S.filters.has('dogs') && !['yes', 'leashed', 'outside'].includes(sp.tags.dog)) return false;
  return true;
}
function renderChips() {
  $('#chips').innerHTML = CHIPS.map(c => `<button class="chip glass ${S.filters.has(c.id) ? 'on' : ''}" data-chip="${c.id}">${esc(c.label)}</button>`).join('');
}

/* ---------------- map ---------------- */
function makeIcon(cat) {
  const c = CATS[cat], r = 2, s = 38, cv = document.createElement('canvas');
  cv.width = cv.height = s * r;
  const x = cv.getContext('2d');
  x.scale(r, r);
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 4; x.shadowOffsetY = 1;
  x.beginPath(); x.arc(s / 2, s / 2, 16, 0, Math.PI * 2); x.fillStyle = c.color; x.fill();
  x.shadowColor = 'transparent';
  x.beginPath(); x.arc(s / 2, s / 2, 12.5, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill();
  x.font = '14px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(c.emoji, s / 2, s / 2 + 1);
  return x.getImageData(0, 0, s * r, s * r);
}
async function buildStyle() {
  const style = await (await netFirst(STYLE_URL)).json();
  for (const [key, src] of Object.entries(style.sources)) {
    if (!src.url || !['vector', 'raster'].includes(src.type)) continue;
    const tj = await (await netFirst(src.url)).json();
    delete src.url;
    src.minzoom = tj.minzoom ?? 0; src.maxzoom = tj.maxzoom ?? 14;
    if (tj.attribution) src.attribution = tj.attribution;
    if (tj.bounds) src.bounds = tj.bounds;
    S.templates[key] = { url: tj.tiles[0], minzoom: src.minzoom, maxzoom: src.maxzoom };
    src.tiles = tj.tiles.map(t => t.replace(/^https:\/\//, 'wtile://'));
  }
  S.glyphs = style.glyphs; S.sprite = style.sprite;
  for (const l of style.layers) { const f = l.layout?.['text-font']; if (Array.isArray(f) && f.every(x => typeof x === 'string')) S.fonts.add(f.join(',')); }
  S.fonts.add('Noto Sans Bold');
  return style;
}
async function initMap() {
  maplibregl.addProtocol('wtile', async (params, ac) => ({ data: await getTile('https://' + params.url.slice(8), ac.signal) }));
  let style;
  try { style = await buildStyle(); }
  catch {
    const el = $('#map-error');
    el.innerHTML = '<h2>Mappa non disponibile</h2><p class="muted">Al primo avvio serve la connessione per scaricare la mappa. Riprova appena hai segnale.</p><button class="btn primary" onclick="location.reload()">Riprova</button>';
    el.classList.remove('hidden');
    return;
  }
  const view = pref('view', { center: [144.96, -37.81], zoom: 9.5 });
  const map = S.map = new maplibregl.Map({
    container: 'map', style, center: view.center, zoom: view.zoom, attributionControl: { compact: true },
    dragRotate: false, pitchWithRotate: false, touchPitch: false, maxPitch: 0,
  });
  map.touchZoomRotate.disableRotation();
  S.geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, fitBoundsOptions: { maxZoom: 12 } });
  map.addControl(S.geo, 'bottom-right');
  S.geo.on('geolocate', e => { S.pos = { lat: e.coords.latitude, lon: e.coords.longitude }; $('#btn-locate').classList.add('on'); });
  S.geo.on('trackuserlocationend', () => $('#btn-locate').classList.remove('on'));
  S.geo.on('error', () => toast('Posizione non disponibile: consenti la posizione in Impostazioni › Safari'));
  map.on('styleimagemissing', e => { const k = e.id.slice(4); if (e.id.startsWith('cat-') && CATS[k]) map.addImage(e.id, makeIcon(k), { pixelRatio: 2 }); });
  map.on('load', () => { addLayers(); render(); onMoveEnd(); });
  map.on('moveend', () => { savePref('view', { center: map.getCenter().toArray(), zoom: map.getZoom() }); onMoveEnd(); });
  map.on('dragstart', () => { hideResults(); $('#search').blur(); });
  map.on('click', onMapClick);
}
function addLayers() {
  const map = S.map, empty = { type: 'FeatureCollection', features: [] };
  map.addSource('sel', { type: 'geojson', data: empty });
  map.addSource('spots', { type: 'geojson', data: empty, cluster: true, clusterMaxZoom: 11, clusterRadius: 48 });
  map.addSource('mine', { type: 'geojson', data: empty });
  map.addLayer({ id: 'sel', type: 'circle', source: 'sel', paint: { 'circle-radius': 26, 'circle-color': '#1f6f54', 'circle-opacity': .22, 'circle-stroke-width': 2, 'circle-stroke-color': '#1f6f54' } });
  map.addLayer({ id: 'clusters', type: 'circle', source: 'spots', filter: ['has', 'point_count'], paint: {
    'circle-color': '#1f6f54', 'circle-opacity': .92, 'circle-stroke-width': 3, 'circle-stroke-color': 'rgba(255,255,255,.9)',
    'circle-radius': ['step', ['get', 'point_count'], 15, 20, 19, 100, 24, 500, 29] } });
  map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'spots', filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true },
    paint: { 'text-color': '#fff' } });
  const icon = { 'icon-image': ['concat', 'cat-', ['get', 'cat']], 'icon-allow-overlap': true,
    'icon-size': ['interpolate', ['linear'], ['zoom'], 9, .7, 14, 1] };
  map.addLayer({ id: 'points', type: 'symbol', source: 'spots', filter: ['!', ['has', 'point_count']], layout: { ...icon, 'symbol-sort-key': ['get', 'rank'] } });
  map.addLayer({ id: 'mine-points', type: 'symbol', source: 'mine', layout: icon });
}
let renderQ = false;
function render() { if (!renderQ) { renderQ = true; requestAnimationFrame(() => { renderQ = false; doRender(); }); } }
function doRender() {
  const map = S.map;
  if (!map?.getSource('spots')) return;
  const cats = visibleCats(), feats = [];
  for (const sp of S.spots.values()) {
    if (!cats.has(sp.cat) || !passesMods(sp)) continue;
    feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [sp.lon, sp.lat] }, properties: { id: sp.id, cat: sp.cat, rank: RANK[CATS[sp.cat].group] } });
  }
  map.getSource('spots').setData({ type: 'FeatureCollection', features: feats });
  map.getSource('mine').setData({ type: 'FeatureCollection', features: S.filters.has('mine')
    ? S.mine.map(m => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [m.lon, m.lat] }, properties: { id: m.id, cat: 'mine' } })) : [] });
}
function onMapClick(e) {
  hideResults();
  const map = S.map, p = e.point, box = [[p.x - 14, p.y - 14], [p.x + 14, p.y + 14]];
  const f = map.queryRenderedFeatures(box, { layers: ['mine-points', 'points', 'clusters'] })[0];
  if (!f) return;
  if (f.layer.id === 'mine-points') return openMine(f.properties.id);
  if (f.layer.id === 'points') return openSpot(f.properties.id);
  map.getSource('spots').getClusterExpansionZoom(f.properties.cluster_id)
    .then(z => map.easeTo({ center: f.geometry.coordinates, zoom: Math.min(z + .3, 16) }));
}
function setSel(p) {
  S.map?.getSource('sel')?.setData({ type: 'FeatureCollection', features: p ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] } }] : [] });
}
function focusOn(p) {
  showTab('map');
  S.map?.flyTo({ center: [p.lon, p.lat], zoom: Math.max(S.map.getZoom(), 14), offset: [0, -window.innerHeight * .22], duration: 900 });
}

/* ---------------- bottom sheet ---------------- */
function openSheet(html, ctx) {
  releaseURLs('sheet');
  S.ctx = ctx;
  $('#sheet-body').innerHTML = html;
  $('#sheet-body').scrollTop = 0;
  document.body.classList.add('sheet-open');
}
function closeSheet() {
  document.body.classList.remove('sheet-open');
  if (S.ctx?.type === 'download') S.ctx.ctrl?.abort();
  S.ctx = null;
  setSel(null);
  setTimeout(() => { if (!S.ctx) releaseURLs('sheet'); }, 400);
}
function initSheetDrag() {
  const sheet = $('#sheet'); let y0 = null, dy = 0;
  const start = y => { y0 = y; dy = 0; sheet.style.transition = 'none'; };
  const move = y => { if (y0 == null) return; dy = Math.max(0, y - y0); sheet.style.transform = `translateY(${dy}px)`; };
  const end = () => { if (y0 == null) return; sheet.style.transition = ''; sheet.style.transform = ''; y0 = null; if (dy > 90) closeSheet(); };
  const g = $('.grabber');
  g.addEventListener('touchstart', e => start(e.touches[0].clientY), { passive: true });
  g.addEventListener('touchmove', e => move(e.touches[0].clientY), { passive: true });
  g.addEventListener('touchend', end);
  const body = $('#sheet-body');
  body.addEventListener('touchstart', e => { if (body.scrollTop <= 0) start(e.touches[0].clientY); }, { passive: true });
  body.addEventListener('touchmove', e => { if (y0 != null && e.touches[0].clientY - y0 > 8 && body.scrollTop <= 0) move(e.touches[0].clientY); }, { passive: true });
  body.addEventListener('touchend', end);
}

/* ---------------- place details ---------------- */
function lookupSpot(id) { return S.spots.get(id) || S.user.get(id)?.spot; }
function yes(v) { return v && v !== 'no' && v !== 'none'; }
function spotHTML(sp) {
  const c = CATS[sp.cat], t = sp.tags || {}, u = S.user.get(sp.id) || {};
  const d = S.pos ? ' · ' + fmtDist(distance(S.pos, sp)) : '';
  const badges = [];
  if (t.fee === 'no') badges.push('<span class="badge good">Gratuito</span>');
  else if (t.fee) badges.push(`<span class="badge">${t.fee === 'yes' ? 'A pagamento' : esc(t.fee)}${t.charge ? ' · ' + esc(t.charge) : ''}</span>`);
  if (t.backcountry === 'yes') badges.push('<span class="badge">Bush camping</span>');
  if (t.reservation === 'required') badges.push('<span class="badge">Prenotazione obbligatoria</span>');
  if (t.reservation === 'no') badges.push('<span class="badge good">Senza prenotazione</span>');
  if (t['4wd_only'] === 'yes') badges.push('<span class="badge">Solo 4x4</span>');
  if (u.rating) badges.push(`<span class="badge" style="color:var(--gold)">${starsText(u.rating)}</span>`);
  const amen = AMEN.filter(([k]) => t[k]).map(([k, label, em]) => `<div class="${yes(t[k]) ? '' : 'no'}">${em} ${label}</div>`).join('');
  const site = t.website || t['contact:website'], phone = t.phone || t['contact:phone'];
  const facts = [
    ['Piazzole', t.capacity], ['Orari', t.opening_hours], ['Gestore', t.operator], ['Altitudine', t.ele && t.ele + ' m'],
    ['Accesso', t.access && t.access !== 'yes' ? ({ private: 'Privato', permissive: 'Consentito', customers: 'Solo clienti', permit: 'Serve un permesso', members: 'Solo soci', no: 'Vietato' }[t.access] || t.access) : null],
    ['Sito', site && `<a href="${esc(site)}" target="_blank" rel="noopener">${esc(site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`],
    ['Telefono', phone && `<a href="tel:${esc(phone.replace(/\s/g, ''))}">${esc(phone)}</a>`],
  ].filter(f => f[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${['Sito', 'Telefono'].includes(k) ? v : esc(v)}</dd></div>`).join('');
  const osm = { n: 'node', w: 'way', r: 'relation' }[sp.id[0]];
  return `
  <div class="sp-head">
    <div class="sp-icon" style="--c:${c.color}">${c.emoji}</div>
    <div class="sp-title"><h2>${esc(sp.name || c.label)}</h2><p>${esc(c.label)}${d}</p></div>
    <button class="icon-btn" data-act="close" aria-label="Chiudi">${svg('x')}</button>
  </div>
  ${badges.length ? `<div class="badges">${badges.join('')}</div>` : ''}
  <div class="actions">
    <button data-act="fav" class="${u.fav ? 'on' : ''}">${svg('heart')}<span>${u.fav ? 'Salvato' : 'Salva'}</span></button>
    <button data-act="nav">${svg('nav')}<span>Indicazioni</span></button>
    <button data-act="visited" class="${u.visited ? 'on' : ''}">${svg('check')}<span>${u.visited ? 'Visitato' : 'Ci sono stato'}</span></button>
    <button data-act="share">${svg('share')}<span>Condividi</span></button>
  </div>
  ${amen ? `<div class="amen">${amen}</div>` : ''}
  ${facts ? `<dl class="facts">${facts}</dl>` : ''}
  ${t.description ? `<p class="desc" translate="no">${esc(t.description)}</p>` : ''}
  <div class="section">
    <h3>La tua recensione</h3>
    ${starsHTML(u.rating || 0)}
    <textarea id="review" placeholder="Com'era? Strada, ombra, insetti, segnale, posto per il camper…">${esc(u.review || '')}</textarea>
    <div class="photos" id="photos"></div>
    <button class="btn primary block" data-act="save-review">Salva recensione</button>
  </div>
  <div class="coords"><span>${sp.lat.toFixed(5)}, ${sp.lon.toFixed(5)}</span><button data-act="copy">Copia</button>
    ${osm ? `<a href="https://www.openstreetmap.org/${osm}/${sp.id.slice(1)}" target="_blank" rel="noopener">Vedi su OpenStreetMap</a>` : ''}</div>`;
}
const starsHTML = n => `<div class="stars" id="stars">${[1, 2, 3, 4, 5].map(i => `<button data-act="star" data-n="${i}" class="${i <= n ? 'on' : ''}" aria-label="${i} stelle">★</button>`).join('')}</div>`;
function renderPhotos() {
  const el = $('#photos');
  if (!el || !S.ctx) return;
  el.innerHTML = S.ctx.photos.map((b, i) => `<div class="ph"><img src="${blobURL(b, 'sheet')}" data-act="view" alt=""><button class="del" data-act="del-photo" data-i="${i}" aria-label="Rimuovi">${svg('x')}</button></div>`).join('')
    + `<label class="add-photo" aria-label="Aggiungi foto">${svg('camera')}<input type="file" accept="image/*" multiple hidden></label>`;
}
function openSpot(id) {
  const sp = lookupSpot(id);
  if (!sp) return;
  const u = S.user.get(id) || {};
  openSheet(spotHTML(sp), { type: 'spot', sp, rating: u.rating || 0, photos: [...(u.photos || [])] });
  renderPhotos();
  setSel(sp);
}
async function saveUser(sp, patch) {
  const u = { ...(S.user.get(sp.id) || {}), ...patch, id: sp.id, spot: { id: sp.id, lat: sp.lat, lon: sp.lon, cat: sp.cat, name: sp.name, tags: sp.tags }, ts: Date.now() };
  if (!u.fav && !u.visited && !u.rating && !u.review && !u.photos?.length) { S.user.delete(sp.id); await db.del('user', sp.id); }
  else { S.user.set(sp.id, u); await db.put('user', u); }
  return u;
}

/* ---------------- my spots ---------------- */
function mineHTML(m) {
  const c = CATS[m.kind] || CATS.mine, d = S.pos ? ' · ' + fmtDist(distance(S.pos, m)) : '';
  return `
  <div class="sp-head">
    <div class="sp-icon" style="--c:${CATS.mine.color}">${c.emoji}</div>
    <div class="sp-title"><h2>${esc(m.name || 'Spot senza nome')}</h2><p>⭐ Mio · ${esc(c.label)}${d}</p></div>
    <button class="icon-btn" data-act="close" aria-label="Chiudi">${svg('x')}</button>
  </div>
  ${m.photos?.length ? `<div class="gallery">${m.photos.map(b => `<img src="${blobURL(b, 'sheet')}" data-act="view" alt="">`).join('')}</div>` : ''}
  ${m.rating ? `<div class="badges"><span class="badge" style="color:var(--gold)">${starsText(m.rating)}</span></div>` : ''}
  ${m.note ? `<p class="desc" translate="no">${esc(m.note).replace(/\n/g, '<br>')}</p>` : ''}
  <div class="actions">
    <button data-act="nav">${svg('nav')}<span>Indicazioni</span></button>
    <button data-act="share">${svg('share')}<span>Condividi</span></button>
    <button data-act="edit-mine">${svg('edit')}<span>Modifica</span></button>
    <button data-act="delete-mine" class="danger">${svg('trash')}<span>Elimina</span></button>
  </div>
  <div class="coords"><span>${m.lat.toFixed(5)}, ${m.lon.toFixed(5)}</span><button data-act="copy">Copia</button>
    <span>Aggiunto il ${new Date(m.ts).toLocaleDateString(LOCALE)}</span></div>`;
}
function openMine(id) {
  const m = S.mine.find(x => x.id === id);
  if (!m) return;
  openSheet(mineHTML(m), { type: 'mine', sp: m });
  setSel(m);
}
function formHTML(dr) {
  const kinds = Object.entries(CATS).filter(([k]) => k !== 'mine')
    .map(([k, c]) => `<option value="${k}" ${dr.kind === k ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('');
  return `
  <div class="sp-head"><div class="sp-title"><h2>${dr.id ? 'Modifica spot' : 'Nuovo spot'}</h2><p>Solo tu lo vedrai</p></div>
    <button class="icon-btn" data-act="close" aria-label="Chiudi">${svg('x')}</button></div>
  <label class="field"><span>Nome</span><input id="f-name" value="${esc(dr.name)}" placeholder="Es. Radura sul fiume"></label>
  <label class="field"><span>Tipo</span><select id="f-kind">${kinds}</select></label>
  <div class="loc"><div class="tx"><b>Posizione</b><small>${dr.lat != null ? `${dr.lat.toFixed(5)}, ${dr.lon.toFixed(5)}` : 'Non impostata'}</small></div>
    <button class="btn small" data-act="use-gps">GPS</button><button class="btn small" data-act="pick-map">Sulla mappa</button></div>
  <label class="field"><span>Note</span><textarea id="f-note" placeholder="Come arrivarci, quando andare, cosa portare…">${esc(dr.note)}</textarea></label>
  <div class="field"><span>Voto</span>${starsHTML(dr.rating)}</div>
  <div class="field"><span>Foto</span><div class="photos" id="photos"></div></div>
  <button class="btn primary block" data-act="save-mine">Salva spot</button>`;
}
function openForm(dr) {
  openSheet(formHTML(dr), { type: 'form', dr, rating: dr.rating, photos: dr.photos });
  renderPhotos();
  if (dr.lat != null) setSel(dr);
}
function newSpot() {
  const c = S.map?.getCenter();
  const p = S.pos || (c && { lat: c.lat, lon: c.lng }) || {};
  openForm({ id: null, name: '', kind: 'camp_free', note: '', rating: 0, photos: [], lat: p.lat, lon: p.lon });
}
function readForm() {
  const dr = S.ctx.dr;
  dr.name = $('#f-name').value.trim(); dr.kind = $('#f-kind').value; dr.note = $('#f-note').value.trim();
  dr.rating = S.ctx.rating; dr.photos = S.ctx.photos;
  return dr;
}
async function loadMine() { S.mine = (await db.all('mine')).sort((a, b) => b.ts - a.ts); }

async function resizePhoto(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise(res => cv.toBlob(b => res(b || file), 'image/jpeg', .82));
  } catch { return file; }
}

/* ---------------- sheet actions ---------------- */
const mapsLink = p => `https://maps.apple.com/?daddr=${p.lat},${p.lon}&dirflg=d`;
const ACT = {
  close: closeSheet,
  view: el => { const v = $('#viewer'); $('img', v).src = el.src; v.classList.remove('hidden'); },
  star: el => {
    S.ctx.rating = S.ctx.rating === +el.dataset.n ? 0 : +el.dataset.n;
    $$('#stars button').forEach((b, i) => b.classList.toggle('on', i < S.ctx.rating));
  },
  'del-photo': el => { S.ctx.photos.splice(+el.dataset.i, 1); renderPhotos(); },
  async fav(el) {
    const u = await saveUser(S.ctx.sp, { fav: !S.user.get(S.ctx.sp.id)?.fav });
    el.classList.toggle('on', !!u.fav); $('span', el).textContent = u.fav ? 'Salvato' : 'Salva';
    toast(u.fav ? 'Aggiunto ai preferiti' : 'Rimosso dai preferiti');
  },
  async visited(el) {
    const u = await saveUser(S.ctx.sp, { visited: !S.user.get(S.ctx.sp.id)?.visited });
    el.classList.toggle('on', !!u.visited); $('span', el).textContent = u.visited ? 'Visitato' : 'Ci sono stato';
  },
  async 'save-review'() {
    await saveUser(S.ctx.sp, { rating: S.ctx.rating, review: $('#review').value.trim(), photos: S.ctx.photos });
    toast('Recensione salvata');
  },
  nav: () => { window.location.href = mapsLink(S.ctx.sp); },
  async share() {
    const p = S.ctx.sp, name = p.name || CATS[p.cat || p.kind]?.label || 'Spot';
    const url = `https://maps.apple.com/?ll=${p.lat},${p.lon}&q=${encodeURIComponent(name)}`;
    try { if (navigator.share) await navigator.share({ title: name, text: name, url }); else { await navigator.clipboard.writeText(url); toast('Link copiato'); } } catch { /* cancelled */ }
  },
  async copy() {
    const p = S.ctx.sp;
    try { await navigator.clipboard.writeText(`${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`); toast('Coordinate copiate'); } catch { toast('Impossibile copiare'); }
  },
  'edit-mine': () => { const m = S.ctx.sp; openForm({ ...m, photos: [...(m.photos || [])] }); },
  async 'delete-mine'() {
    if (!confirm(t('Eliminare questo spot? Non si può annullare.'))) return;
    await db.del('mine', S.ctx.sp.id); await loadMine(); render(); closeSheet(); renderCurrentTab(); toast('Spot eliminato');
  },
  'use-gps'() {
    readForm();
    navigator.geolocation.getCurrentPosition(p => {
      if (S.ctx?.type !== 'form') return;
      Object.assign(S.ctx.dr, { lat: p.coords.latitude, lon: p.coords.longitude });
      openForm(S.ctx.dr);
    }, () => toast('Posizione non disponibile'), { enableHighAccuracy: true, timeout: 15000 });
  },
  'pick-map'() {
    S.pickDraft = readForm();
    closeSheet();
    showTab('map');
    if (S.pickDraft.lat != null) S.map?.jumpTo({ center: [S.pickDraft.lon, S.pickDraft.lat], zoom: Math.max(S.map.getZoom(), 14) });
    document.body.classList.add('picking');
  },
  async 'save-mine'() {
    const dr = readForm();
    if (dr.lat == null) return toast('Imposta la posizione');
    const rec = { id: dr.id || 'm' + Date.now(), name: dr.name, kind: dr.kind, note: dr.note, rating: dr.rating,
      photos: dr.photos, lat: +dr.lat.toFixed(6), lon: +dr.lon.toFixed(6), ts: dr.ts || Date.now() };
    await db.put('mine', rec); await loadMine();
    if (!S.filters.has('mine')) { S.filters.add('mine'); savePref('filters', [...S.filters]); renderChips(); }
    render(); renderCurrentTab();
    openMine(rec.id);
    toast('Spot salvato');
  },
  'dl-start': () => runDownload(),
  'dl-close': closeSheet,
};

/* ---------------- lists ---------------- */
function itemHTML({ id, icon, color, title, sub, right, thumb }) {
  return `<button class="item" data-open="${esc(id)}"><span class="ic" style="--c:${color}">${thumb ? `<img src="${thumb}" alt="">` : icon}</span>
    <span class="tx"><b>${esc(title)}</b><small>${sub}</small></span>${right ? `<span class="dist">${right}</span>` : ''}</button>`;
}
const emptyHTML = (big, msg) => `<div class="empty"><div class="big">${big}</div>${msg}</div>`;
function spotSub(sp) {
  const t = sp.tags || {}, bits = [esc(CATS[sp.cat].label)];
  if (t.fee === 'no') bits.push('gratis');
  if (yes(t.drinking_water)) bits.push('💧');
  if (yes(t.toilets)) bits.push('🚻');
  if (yes(t.shower)) bits.push('🚿');
  if (['yes', 'leashed'].includes(t.dog)) bits.push('🐕');
  return bits.join(' · ');
}
function renderNear() {
  const o = origin();
  $$('#near-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === S.nearSeg));
  $('#near-sub').textContent = S.pos ? 'Distanze dalla tua posizione' : 'Distanze dal centro della mappa · tocca ◎ sulla mappa per usare il GPS';
  if (!o) return;
  const rows = [];
  for (const sp of S.spots.values()) {
    if (CATS[sp.cat].group !== S.nearSeg || !passesMods(sp)) continue;
    rows.push([distance(o, sp), sp]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  $('#near-list').innerHTML = rows.length
    ? rows.slice(0, 100).map(([d, sp]) => itemHTML({ id: sp.id, icon: CATS[sp.cat].emoji, color: CATS[sp.cat].color,
      title: sp.name || CATS[sp.cat].label, sub: spotSub(sp), right: fmtDist(d) })).join('')
    : emptyHTML('🧭', 'Nessun posto caricato qui.<br>Apri la mappa e avvicinati alla zona che ti interessa.');
}
function renderSaved() {
  $$('#saved-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === S.savedSeg));
  const f = { fav: u => u.fav, visited: u => u.visited, reviewed: u => u.rating || u.review }[S.savedSeg];
  const list = [...S.user.values()].filter(f).sort((a, b) => b.ts - a.ts);
  releaseURLs('list');
  const o = S.pos;
  $('#saved-list').innerHTML = list.length
    ? list.map(u => { const sp = u.spot, c = CATS[sp.cat];
      return itemHTML({ id: sp.id, icon: c.emoji, color: c.color, title: sp.name || c.label,
        sub: u.rating ? `<span class="stars-s">${starsText(u.rating)}</span> ${esc(u.review || c.label)}` : spotSub(sp),
        right: o ? fmtDist(distance(o, sp)) : '', thumb: u.photos?.[0] && blobURL(u.photos[0], 'list') }); }).join('')
    : emptyHTML({ fav: '❤️', visited: '✅', reviewed: '⭐' }[S.savedSeg],
      { fav: 'Tocca <b>Salva</b> su un posto per ritrovarlo qui.', visited: 'Segna i posti dove sei stato con <b>Ci sono stato</b>.', reviewed: 'Le tue recensioni compariranno qui.' }[S.savedSeg]);
}
function renderMineList() {
  releaseURLs('list');
  const o = S.pos;
  $('#mine-list').innerHTML = S.mine.length
    ? S.mine.map(m => { const c = CATS[m.kind] || CATS.mine;
      return itemHTML({ id: 'mine:' + m.id, icon: c.emoji, color: CATS.mine.color, title: m.name || 'Spot senza nome',
        sub: (m.rating ? `<span class="stars-s">${starsText(m.rating)}</span> ` : '') + esc(m.note || c.label),
        right: o ? fmtDist(distance(o, m)) : '', thumb: m.photos?.[0] && blobURL(m.photos[0], 'list') }); }).join('')
    : emptyHTML('💎', 'Hai trovato un posto speciale?<br>Tocca <b>+ Nuovo</b> per salvarlo con foto e note.');
}
async function renderOffline() {
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const tip = $('#install-tip');
  tip.classList.toggle('hidden', standalone);
  tip.innerHTML = '<h3>📲 Installa sull\'iPhone</h3><p class="small" style="margin:0">In Safari tocca <b>Condividi</b> › <b>Aggiungi alla schermata Home</b>. Poi apri Wildspot dall\'icona e scarica le zone da lì: l\'app installata ha una memoria sua.</p>';
  const au = $('#au-info'), btn = $('#au-download');
  if (S.idx) {
    const has = pref('auVersion', null) === S.idx.version;
    au.innerHTML = `${nf0.format(S.idx.total)} campeggi, servizi e spot · circa ${nf0.format(S.idx.bytes / 1048576)} MB · aggiornati al ${new Date(S.idx.version).toLocaleDateString(LOCALE)}`
      + (has ? '<br><b style="color:var(--primary)">✓ Scaricati su questo dispositivo</b>' : '');
    btn.disabled = false; btn.textContent = has ? 'Aggiorna i dati' : 'Scarica i posti di tutta l\'Australia';
  } else { au.textContent = 'Dati non disponibili: apri l\'app con la connessione.'; btn.disabled = true; }
  const zones = (await db.all('zones')).sort((a, b) => b.ts - a.ts);
  $('#zone-list').innerHTML = zones.map(z => `<div class="item"><span class="ic" style="--c:#1f6f54">🗺️</span>
    <span class="tx"><b>${esc(z.name)}</b><small>${nf0.format(z.tiles)} riquadri · ${new Date(z.ts).toLocaleDateString(LOCALE)}</small></span>
    <button class="btn small" data-zone-go="${z.id}">Vai</button><button class="icon-btn" data-zone-del="${z.id}" aria-label="Elimina">${svg('trash')}</button></div>`).join('')
    || '<p class="muted small">Nessuna zona scaricata.</p>';
  try {
    const e = await navigator.storage.estimate();
    $('#storage').textContent = `${nf1.format((e.usage || 0) / 1048576)} MB usati su questo dispositivo`;
  } catch { $('#storage').textContent = ''; }
}
function renderCurrentTab() { ({ near: renderNear, saved: renderSaved, mine: renderMineList, offline: renderOffline })[S.tab]?.(); }
function showTab(name) {
  S.tab = name;
  $$('.page').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if (name !== 'map') { closeSheet(); hideResults(); }
  renderCurrentTab();
}

/* ---------------- offline zones ---------------- */
async function placeName(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=${LANG}&lat=${lat}&lon=${lon}`, { signal: AbortSignal.timeout(5000) });
    const a = (await r.json()).address || {};
    return a.town || a.city || a.village || a.municipality || a.county || a.state || null;
  } catch { return null; }
}
async function askDownload() {
  if (!S.map) return;
  if (!navigator.onLine) return toast('Serve la connessione per scaricare una zona');
  showTab('map');
  const b = boundsArr(S.map.getBounds()), urls = zoneTileUrls(b), cells = cellsFor(b, origin());
  if (urls.length > MAX_ZONE_TILES || cells.length > 40) return toast('Zona troppo grande: avvicinati un po\' e riprova');
  openSheet(`
    <div class="sp-head"><div class="sp-icon" style="--c:#1f6f54">🗺️</div><div class="sp-title"><h2>Scarica per l'offline</h2>
      <p>La zona visibile sulla mappa</p></div><button class="icon-btn" data-act="close" aria-label="Chiudi">${svg('x')}</button></div>
    <label class="field"><span>Nome della zona</span><input id="dl-name" value="Zona del ${new Date().toLocaleDateString(LOCALE)}"></label>
    <p class="muted small">${nf0.format(urls.length)} riquadri di mappa (circa ${nf0.format(Math.max(1, urls.length * .03))} MB) e tutti i campeggi, servizi e spot della zona.</p>
    <div class="progress"><div id="dl-bar"></div></div><p id="dl-text" class="muted small"></p>
    <button class="btn primary block" id="dl-btn" data-act="dl-start">Scarica</button>`, { type: 'download', b, urls, cells });
  const c = S.map.getCenter(), name = await placeName(c.lat, c.lng);
  if (name && S.ctx?.type === 'download' && !S.ctx.started) $('#dl-name').value = name;
}
async function runDownload() {
  const ctx = S.ctx;
  if (!ctx || ctx.started) return;
  ctx.started = true;
  const ctrl = ctx.ctrl = new AbortController(), { urls, cells, b } = ctx, name = $('#dl-name').value.trim() || 'Zona';
  $('#dl-btn').disabled = true; $('#dl-btn').textContent = 'Download in corso…';
  const total = urls.length + cells.length;
  let done = 0, failed = 0, idx = 0;
  const upd = () => { const bar = $('#dl-bar'), tx = $('#dl-text'); if (bar) bar.style.width = (done / total * 100) + '%'; if (tx) tx.textContent = `${nf0.format(done)} di ${nf0.format(total)}`; };
  const worker = async () => {
    while (idx < urls.length && !ctrl.signal.aborted) {
      try { await getTile(urls[idx++], ctrl.signal); } catch { failed++; }
      if (++done % 15 === 0) upd();
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (ctrl.signal.aborted) return toast('Download annullato');
  for (const c of cells) { try { await ensureCell(c); } catch { failed++; } done++; upd(); }
  render();
  // fonts and map icons, so labels render offline too
  const extra = [];
  if (S.glyphs) for (const f of S.fonts) for (const r of ['0-255', '256-511', '8192-8447']) extra.push(S.glyphs.replace('{fontstack}', encodeURIComponent(f)).replace('{range}', r));
  if (S.sprite) for (const s of ['', '@2x']) for (const x of ['.json', '.png']) extra.push(S.sprite + s + x);
  await Promise.all(extra.map(u => netFirst(u).catch(() => {})));
  await db.put('zones', { id: 'z' + Date.now(), name, bounds: b, tiles: urls.length, ts: Date.now() });
  try { await navigator.storage?.persist?.(); } catch { /* not supported */ }
  upd();
  if (S.ctx === ctx) {
    $('#dl-text').textContent = failed ? `Fatto, ma ${failed} elementi non sono stati scaricati. Puoi riprovare.` : 'Zona pronta: funziona anche senza segnale.';
    const btn = $('#dl-btn'); btn.disabled = false; btn.textContent = 'Chiudi'; btn.dataset.act = 'dl-close';
  }
  toast('Zona offline pronta: ' + name);
  renderCurrentTab();
}
async function deleteZone(id) {
  if (!confirm(t('Eliminare questa zona offline?'))) return;
  const zones = await db.all('zones'), z = zones.find(x => x.id === id);
  if (!z) return;
  if (Object.keys(S.templates).length) {
    const keep = new Set(zones.filter(o => o.id !== id).flatMap(o => zoneTileUrls(o.bounds).map(tileKey)));
    const cache = await tileCache();
    await Promise.all(zoneTileUrls(z.bounds).map(tileKey).filter(k => !keep.has(k)).map(k => cache.delete(k)));
  }
  await db.del('zones', id);
  renderOffline();
}

/* ---------------- backup ---------------- */
const toDataURL = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const fromDataURL = async u => (await fetch(u)).blob();
async function exportBackup() {
  const enc = async r => ({ ...r, photos: await Promise.all((r.photos || []).map(toDataURL)) });
  const data = { app: 'wildspot', v: 1, at: new Date().toISOString(),
    user: await Promise.all((await db.all('user')).map(enc)), mine: await Promise.all((await db.all('mine')).map(enc)) };
  const name = `wildspot-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
  try { if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: name }); } catch { return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'wildspot') throw new Error();
    const dec = async r => ({ ...r, photos: await Promise.all((r.photos || []).map(fromDataURL)) });
    for (const r of data.user || []) await db.put('user', await dec(r));
    for (const r of data.mine || []) await db.put('mine', await dec(r));
    await loadUser(); await loadMine(); render(); renderCurrentTab();
    toast(`Importati ${(data.user || []).length + (data.mine || []).length} elementi`);
  } catch { toast('File di backup non valido'); }
}
async function loadIndex() {
  try { const r = await fetch('data/index.json'); if (r.ok) S.idx = await r.json(); } catch { /* offline and never cached */ }
}
async function downloadAustralia() {
  if (!S.idx) return toast('Dati dell\'Australia non disponibili');
  if (!navigator.onLine) return toast('Serve la connessione');
  const btn = $('#au-download'), keys = Object.keys(S.idx.cells);
  btn.disabled = true;
  let done = 0, failed = 0, idx = 0;
  const worker = async () => {
    while (idx < keys.length) {
      const key = keys[idx++], [i, j] = key.split('_').map(Number);
      try { await ensureCell({ i, j, key }); } catch { failed++; }
      if (++done % 10 === 0 || done === keys.length) btn.textContent = `Scarico… ${Math.round(done / keys.length * 100)}%`;
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  try { await navigator.storage?.persist?.(); } catch { /* not supported */ }
  savePref('auVersion', failed ? null : S.idx.version);
  render(); renderOffline();
  toast(failed ? `${failed} aree non scaricate, riprova` : 'Tutta l\'Australia è disponibile offline');
}
async function loadUser() { S.user = new Map((await db.all('user')).map(u => [u.id, u])); }

/* ---------------- search ---------------- */
function hideResults() { $('#search-results').classList.add('hidden'); }
function localMatches(q) {
  q = q.toLowerCase();
  const out = [];
  for (const m of S.mine) if (m.name?.toLowerCase().includes(q)) out.push({ em: '⭐', title: m.name, sub: 'Il mio spot', go: () => { focusOn(m); openMine(m.id); } });
  for (const sp of S.spots.values()) {
    if (out.length >= 6) break;
    if (sp.name && sp.name.toLowerCase().includes(q) && CATS[sp.cat].group !== 'services')
      out.push({ em: CATS[sp.cat].emoji, title: sp.name, sub: CATS[sp.cat].label, go: () => { focusOn(sp); openSpot(sp.id); } });
  }
  return out;
}
let searchItems = [];
function showResults(local, places) {
  searchItems = [...local, ...(places || [])];
  const row = (r, i) => `<button data-res="${i}"><span class="em">${r.em}</span><span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span></button>`;
  let html = '';
  if (local.length) html += '<div class="label">Posti</div>' + local.map(row).join('');
  if (places?.length) html += '<div class="label">Località</div>' + places.map((r, i) => row(r, i + local.length)).join('');
  if (places && !places.length && !local.length) html = '<div class="label">Nessun risultato</div>';
  $('#search-results').innerHTML = html;
  $('#search-results').classList.toggle('hidden', !html);
}
async function searchPlaces(q) {
  if (!navigator.onLine) return showResults(localMatches(q), []);
  status('Cerco…', true);
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=${LANG}&q=${encodeURIComponent(q)}`);
    const res = await r.json();
    showResults(localMatches(q), res.map(p => ({ em: '📍', title: p.name || p.display_name.split(',')[0], sub: p.display_name, go: () => {
      const [s, n, w, e] = p.boundingbox.map(Number);
      showTab('map');
      S.map.fitBounds([[w, s], [e, n]], { maxZoom: 12.5, padding: 40, duration: 900 });
    } })));
  } catch { toast('Ricerca non disponibile'); }
  status(null);
}

/* ---------------- wiring ---------------- */
function wire() {
  $$('[data-icon]').forEach(el => { el.innerHTML = svg(el.dataset.icon); });
  renderChips();
  $('#chips').addEventListener('click', e => {
    const b = e.target.closest('[data-chip]');
    if (!b) return;
    const id = b.dataset.chip;
    S.filters.has(id) ? S.filters.delete(id) : S.filters.add(id);
    b.classList.toggle('on', S.filters.has(id));
    savePref('filters', [...S.filters]);
    render();
  });
  $('.tabbar').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
  $('#btn-locate').addEventListener('click', () => S.geo?.trigger());
  $('#btn-download').addEventListener('click', askDownload);
  $('#off-download').addEventListener('click', askDownload);
  $('#au-download').addEventListener('click', downloadAustralia);
  $('#btn-add').addEventListener('click', newSpot);
  $('#mine-add').addEventListener('click', () => { showTab('map'); newSpot(); });
  $('#backdrop').addEventListener('click', closeSheet);
  $('#viewer').addEventListener('click', e => e.currentTarget.classList.add('hidden'));
  $('#sheet-body').addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a && ACT[a.dataset.act]) { e.preventDefault(); ACT[a.dataset.act](a, e); }
  });
  $('#sheet-body').addEventListener('change', async e => {
    if (e.target.type !== 'file' || !S.ctx?.photos) return;
    const files = [...e.target.files];
    for (const f of files) S.ctx.photos.push(await resizePhoto(f));
    renderPhotos();
  });
  $('#pick-cancel').addEventListener('click', () => { document.body.classList.remove('picking'); openForm(S.pickDraft); });
  $('#pick-ok').addEventListener('click', () => {
    const c = S.map.getCenter();
    document.body.classList.remove('picking');
    openForm({ ...S.pickDraft, lat: c.lat, lon: c.lng });
  });
  for (const [seg, key, fn] of [['#near-seg', 'nearSeg', renderNear], ['#saved-seg', 'savedSeg', renderSaved]])
    $(seg).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { S[key] = b.dataset.v; fn(); } });
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]');
    if (o) {
      const id = o.dataset.open;
      if (id.startsWith('mine:')) { const m = S.mine.find(x => x.id === id.slice(5)); if (m) { focusOn(m); openMine(m.id); } }
      else { const sp = lookupSpot(id); if (sp) { focusOn(sp); openSpot(id); } }
    }
    const zg = e.target.closest('[data-zone-go]');
    if (zg) db.get('zones', zg.dataset.zoneGo).then(z => { if (z) { showTab('map'); S.map?.fitBounds([[z.bounds[0], z.bounds[1]], [z.bounds[2], z.bounds[3]]], { duration: 0 }); } });
    const zd = e.target.closest('[data-zone-del]');
    if (zd) deleteZone(zd.dataset.zoneDel);
    const r = e.target.closest('[data-res]');
    if (r) { hideResults(); $('#search').blur(); searchItems[+r.dataset.res]?.go(); }
  });
  const input = $('#search');
  input.addEventListener('input', debounce(() => {
    const q = input.value.trim();
    $('#search-clear').classList.toggle('hidden', !q);
    if (q.length < 2) return hideResults();
    showResults(localMatches(q));
  }, 150));
  $('#search-form').addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (q.length >= 2) searchPlaces(q); input.blur(); });
  $('#search-clear').addEventListener('click', () => { input.value = ''; $('#search-clear').classList.add('hidden'); hideResults(); });
  $$('#lang-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === LANG));
  $('#lang-seg').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b && b.dataset.v !== LANG) setLang(b.dataset.v); });
  $('#off-export').addEventListener('click', exportBackup);
  $('#off-import').addEventListener('change', e => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; });
  $('#off-clear').addEventListener('click', async () => {
    if (!confirm(t('Eliminare tutte le mappe e i dati scaricati? Preferiti, recensioni e i tuoi spot restano.'))) return;
    await caches.delete(TILE_CACHE); tileCacheP = null;
    await db.clear('zones'); await db.clear('cells');
    S.spots.clear(); S.loaded.clear(); render(); renderOffline();
    toast('Cache svuotata');
  });
  addEventListener('online', () => { toast('Di nuovo online'); S.map && onMoveEnd(); });
  addEventListener('offline', () => toast('Sei offline: usi le zone scaricate'));
  initSheetDrag();
}

async function main() {
  startTranslation();
  wire();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  await Promise.all([loadUser(), loadMine(), loadIndex()]);
  await initMap();
  // monthly data refresh: if Australia was downloaded and a newer month is published, update it in the background
  const had = pref('auVersion', null);
  if (S.idx && had && had !== S.idx.version && navigator.onLine) downloadAustralia();
}
main();
