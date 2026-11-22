// Minimal IndexedDB wrapper. Stores: cells (cached OSM data per grid cell), user (fav/review per place),
// mine (user-created spots), zones (downloaded offline areas).
let dbp;
function open() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('wildspot', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('cells', { keyPath: 'key' });
      for (const s of ['user', 'mine', 'zones']) d.createObjectStore(s, { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const done = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function tx(store, mode, fn) {
  const t = (await open()).transaction(store, mode);
  const out = fn(t.objectStore(store));
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  return out;
}
export const get = (s, k) => tx(s, 'readonly', o => done(o.get(k)));
export const all = (s) => tx(s, 'readonly', o => done(o.getAll()));
export const put = (s, v) => tx(s, 'readwrite', o => { o.put(v); });
export const del = (s, k) => tx(s, 'readwrite', o => { o.delete(k); });
export const clear = (s) => tx(s, 'readwrite', o => { o.clear(); });
