// Shared by the app (browser) and scripts/build-data.mjs (Node): how OpenStreetMap features become Wildspot places.
export const CELL = 0.5; // data grid cell size in degrees (~55 km)
export const GROUP = {
  camp_free: 'camps', camp: 'camps', caravan: 'camps',
  viewpoint: 'gems', waterfall: 'gems', hotspring: 'gems', beach: 'gems', cave: 'gems', attraction: 'gems',
  water: 'services', toilets: 'services', shower: 'services', dump: 'services', picnic: 'services',
};
// Only the tags the app shows are kept, so the data files stay small.
const KEEP = new Set(['name', 'name:en', 'tourism', 'amenity', 'natural', 'waterway', 'fee', 'charge', 'backcountry', 'reservation',
  '4wd_only', 'drinking_water', 'toilets', 'shower', 'power_supply', 'dog', 'tents', 'caravans', 'motorhome', 'bbq', 'openfire',
  'picnic_table', 'internet_access', 'sanitary_dump_station', 'swimming_pool', 'shelter', 'wheelchair', 'capacity', 'opening_hours',
  'operator', 'ele', 'access', 'website', 'contact:website', 'phone', 'contact:phone', 'description']);

export function classify(t) {
  if (t.tourism === 'camp_site') return t.fee === 'no' ? 'camp_free' : 'camp';
  if (t.tourism === 'caravan_site') return 'caravan';
  if (t.amenity === 'drinking_water' || t.amenity === 'water_point') return 'water';
  if (t.amenity === 'toilets') return 'toilets';
  if (t.amenity === 'shower') return 'shower';
  if (t.amenity === 'sanitary_dump_station') return 'dump';
  if (t.tourism === 'picnic_site') return 'picnic';
  if (t.tourism === 'viewpoint') return 'viewpoint';
  if (t.waterway === 'waterfall' || t.natural === 'waterfall') return 'waterfall';
  if (t.natural === 'hot_spring') return 'hotspring';
  if (t.natural === 'beach') return 'beach';
  if (t.natural === 'cave_entrance') return 'cave';
  if (t.tourism === 'attraction') return 'attraction';
  return null;
}
export function query(s, w, n, e, timeout = 60) {
  const b = `${s},${w},${n},${e}`;
  return `[out:json][timeout:${timeout}];(
nwr["tourism"~"^(camp_site|caravan_site|picnic_site|viewpoint)$"](${b});
nwr["amenity"~"^(drinking_water|water_point|toilets|shower|sanitary_dump_station)$"](${b});
nwr["natural"~"^(hot_spring|cave_entrance|beach|waterfall)$"](${b});
nwr["waterway"="waterfall"](${b});
nwr["tourism"="attraction"]["name"](${b});
);out center tags qt;`;
}
export function parse(json) {
  const out = [];
  for (const el of json.elements || []) {
    const t = el.tags || {}, cat = classify(t);
    if (!cat) continue;
    if (cat === 'attraction' && !t.name) continue; // unnamed attractions are noise
    if (GROUP[cat] === 'services' && ['private', 'no', 'customers'].includes(t.access)) continue;
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    if (lat == null) continue;
    const tags = {};
    for (const k in t) if (KEEP.has(k)) tags[k] = t[k];
    out.push({ id: el.type[0] + el.id, lat: +lat.toFixed(6), lon: +lon.toFixed(6), cat, name: t.name || t['name:en'] || '', tags });
  }
  return out;
}
export const cellKeyOf = (lat, lon) => `${Math.floor(lat / CELL)}_${Math.floor(lon / CELL)}`;
