// English translation. The app is written in Italian; when the language is English every Italian text that
// appears on screen (text nodes, placeholders, aria-labels) is swapped for its English version as it is rendered.
let saved = null;
try { saved = localStorage.getItem('ws:lang'); } catch { /* private mode */ }
export const LANG = saved || ((navigator.language || '').toLowerCase().startsWith('it') ? 'it' : 'en');
export const LOCALE = LANG === 'it' ? 'it-IT' : 'en-AU';
export function setLang(l) { try { localStorage.setItem('ws:lang', l); } catch { /* private mode */ } location.reload(); }

const EN = {
  // categories, filters, amenities
  'Campeggio gratuito': 'Free campsite', 'Campeggio': 'Campsite', 'Area camper': 'Caravan park', 'Punto panoramico': 'Lookout',
  'Cascata': 'Waterfall', 'Sorgente termale': 'Hot spring', 'Spiaggia': 'Beach', 'Grotta': 'Cave', 'Attrazione': 'Attraction',
  'Acqua potabile': 'Drinking water', 'Toilette': 'Toilets', 'Docce': 'Showers', 'Area pic-nic': 'Picnic area', 'Il mio spot': 'My spot',
  'Campeggi': 'Campsites', 'Gratis': 'Free', 'Acqua': 'Water', 'Pic-nic': 'Picnic', 'Cani ok': 'Dog friendly', 'I miei': 'Mine',
  'Corrente': 'Power', 'Cani': 'Dogs', 'Tende': 'Tents', 'Camper': 'Motorhomes', 'Fuoco': 'Campfires', 'Tavoli': 'Tables',
  'Piscina': 'Pool', 'Riparo': 'Shelter', 'Accessibile': 'Wheelchair access', 'Servizi': 'Services', 'Mio': 'Mine', 'gratis': 'free',
  // static page
  'Cerca un posto o una località': 'Search a place or town', 'Cancella': 'Clear', 'La mia posizione': 'My location',
  'Scarica zona offline': 'Download area offline', 'Aggiungi spot': 'Add spot', 'Sposta la mappa sul punto esatto': 'Move the map to the exact spot',
  'Annulla': 'Cancel', 'Usa questo punto': 'Use this spot', 'Vicino a te': 'Nearby', 'Salvati': 'Saved', 'Preferiti': 'Favourites',
  'Visitati': 'Visited', 'Recensiti': 'Reviewed', 'I miei spot': 'My spots', '+ Nuovo': '+ New',
  'Posti segreti che trovi tu, con foto e note. Restano solo sul tuo iPhone.': 'Secret places you find, with photos and notes. They stay only on your iPhone.',
  '🇦🇺 Posti di tutta l\'Australia': '🇦🇺 Places across Australia', 'Scarica i posti di tutta l\'Australia': 'Download places for all of Australia',
  'Mappe offline': 'Offline maps',
  'La mappa dettagliata di tutto il continente pesa troppo per il telefono: prima di partire inquadra la zona del viaggio e tocca':
    'A detailed map of the whole continent is too big for a phone: before you leave, frame your trip area and tap',
  ', così strade e sentieri si vedono anche senza segnale.': ', so roads and tracks still show with no signal.',
  'Nessuna zona scaricata.': 'No areas downloaded.', 'Scarica la zona visibile sulla mappa': 'Download the area shown on the map',
  'Spazio usato': 'Storage used', 'Svuota mappe e dati scaricati': 'Clear downloaded maps and data',
  'Preferiti, recensioni, foto e i tuoi spot in un unico file.': 'Favourites, reviews, photos and your spots in one file.',
  'Esporta': 'Export', 'Importa': 'Import', 'Lingua': 'Language',
  'Dati dei luoghi © OpenStreetMap contributors · Mappe OpenFreeMap / OpenMapTiles': 'Place data © OpenStreetMap contributors · Maps by OpenFreeMap / OpenMapTiles',
  'Mappa': 'Map', 'Vicino': 'Nearby', 'Miei': 'Mine',
  // place sheet
  'Gratuito': 'Free', 'A pagamento': 'Paid', 'Prenotazione obbligatoria': 'Booking required', 'Senza prenotazione': 'No booking needed',
  'Solo 4x4': '4WD only', 'Piazzole': 'Sites', 'Orari': 'Hours', 'Gestore': 'Operator', 'Altitudine': 'Elevation', 'Accesso': 'Access',
  'Sito': 'Website', 'Telefono': 'Phone', 'Privato': 'Private', 'Consentito': 'Permitted', 'Solo clienti': 'Customers only',
  'Serve un permesso': 'Permit required', 'Solo soci': 'Members only', 'Vietato': 'No access',
  'Salva': 'Save', 'Salvato': 'Saved', 'Indicazioni': 'Directions', 'Visitato': 'Visited', 'Ci sono stato': 'Been here', 'Condividi': 'Share',
  'La tua recensione': 'Your review', 'Com\'era? Strada, ombra, insetti, segnale, posto per il camper…': 'How was it? Road, shade, bugs, phone signal, room for a van…',
  'Salva recensione': 'Save review', 'Copia': 'Copy', 'Vedi su OpenStreetMap': 'View on OpenStreetMap', 'Chiudi': 'Close',
  'Rimuovi': 'Remove', 'Aggiungi foto': 'Add photo', 'Elimina': 'Delete',
  // my spots
  'Spot senza nome': 'Unnamed spot', 'Modifica': 'Edit', 'Modifica spot': 'Edit spot', 'Nuovo spot': 'New spot', 'Solo tu lo vedrai': 'Only you will see it',
  'Nome': 'Name', 'Es. Radura sul fiume': 'E.g. River clearing', 'Tipo': 'Type', 'Posizione': 'Location', 'Non impostata': 'Not set',
  'Sulla mappa': 'On the map', 'Note': 'Notes', 'Come arrivarci, quando andare, cosa portare…': 'How to get there, when to go, what to bring…',
  'Voto': 'Rating', 'Foto': 'Photos', 'Salva spot': 'Save spot',
  // messages
  'Avvicinati per vedere campeggi e spot': 'Zoom in to see campsites and spots', 'Carico i posti…': 'Loading places…',
  'Il server dei dati è occupato, riprova tra poco': 'The data server is busy, try again shortly',
  'Sei offline: vedi solo le zone scaricate': 'You\'re offline: only downloaded areas are shown',
  'Posizione non disponibile: consenti la posizione in Impostazioni › Safari': 'Location unavailable: allow location in Settings › Safari',
  'Mappa non disponibile': 'Map unavailable', 'Riprova': 'Retry',
  'Al primo avvio serve la connessione per scaricare la mappa. Riprova appena hai segnale.': 'The first launch needs a connection to load the map. Try again when you have signal.',
  'Aggiunto ai preferiti': 'Added to favourites', 'Rimosso dai preferiti': 'Removed from favourites', 'Recensione salvata': 'Review saved',
  'Link copiato': 'Link copied', 'Coordinate copiate': 'Coordinates copied', 'Impossibile copiare': 'Couldn\'t copy',
  'Spot eliminato': 'Spot deleted', 'Posizione non disponibile': 'Location unavailable', 'Imposta la posizione': 'Set the location',
  'Spot salvato': 'Spot saved', 'Distanze dalla tua posizione': 'Distances from your location',
  'Distanze dal centro della mappa': 'Distances from the map centre', 'tocca ◎ sulla mappa per usare il GPS': 'tap ◎ on the map to use GPS',
  'Nessun posto caricato qui.': 'No places loaded here.', 'Apri la mappa e avvicinati alla zona che ti interessa.': 'Open the map and zoom in on the area you want.',
  'Tocca': 'Tap', 'su un posto per ritrovarlo qui.': 'on a place to find it here.', 'Segna i posti dove sei stato con': 'Mark places you\'ve been with',
  'Le tue recensioni compariranno qui.': 'Your reviews will appear here.', 'Hai trovato un posto speciale?': 'Found a special place?',
  'per salvarlo con foto e note.': 'to save it with photos and notes.',
  '📲 Installa sull\'iPhone': '📲 Install on iPhone', 'In Safari tocca': 'In Safari tap', 'Aggiungi alla schermata Home': 'Add to Home Screen',
  '. Poi apri Wildspot dall\'icona e scarica le zone da lì: l\'app installata ha una memoria sua.': '. Then open Wildspot from the icon and download areas there: the installed app has its own storage.',
  '✓ Scaricati su questo dispositivo': '✓ Downloaded on this device', 'Aggiorna i dati': 'Update data',
  'Dati non disponibili: apri l\'app con la connessione.': 'Data unavailable: open the app while online.', 'Vai': 'Go',
  'Scarica per l\'offline': 'Save for offline', 'La zona visibile sulla mappa': 'The area shown on the map', 'Nome della zona': 'Area name',
  'Scarica': 'Download', 'Download in corso…': 'Downloading…', 'Download annullato': 'Download cancelled',
  'Zona pronta: funziona anche senza segnale.': 'Area ready: works without signal too.',
  'Serve la connessione per scaricare una zona': 'You need a connection to download an area',
  'Zona troppo grande: avvicinati un po\' e riprova': 'Area too large: zoom in a bit and try again',
  'Eliminare questo spot? Non si può annullare.': 'Delete this spot? This cannot be undone.', 'Eliminare questa zona offline?': 'Delete this offline area?',
  'Eliminare tutte le mappe e i dati scaricati? Preferiti, recensioni e i tuoi spot restano.': 'Delete all downloaded maps and data? Favourites, reviews and your spots are kept.',
  'File di backup non valido': 'Invalid backup file', 'Dati dell\'Australia non disponibili': 'Australia data unavailable',
  'Serve la connessione': 'You need a connection', 'Tutta l\'Australia è disponibile offline': 'All of Australia is available offline',
  'Posti': 'Places', 'Località': 'Towns & areas', 'Nessun risultato': 'No results', 'Cerco…': 'Searching…',
  'Ricerca non disponibile': 'Search unavailable', 'Cache svuotata': 'Cache cleared', 'Di nuovo online': 'Back online',
  'Sei offline: usi le zone scaricate': 'You\'re offline: using downloaded areas',
};
const PATTERNS = [
  [/^A pagamento · (.+)$/, 'Paid · $1'],
  [/^Aggiunto il (.+)$/, 'Added $1'],
  [/^(\d) stelle$/, '$1 stars'],
  [/^([\d.,]+) campeggi, servizi e spot · circa ([\d.,]+) MB · aggiornati al (.+)$/, '$1 campsites, services and spots · about $2 MB · updated $3'],
  [/^([\d.,]+) riquadri$/, '$1 tiles'],
  [/^([\d.,]+) MB usati su questo dispositivo$/, '$1 MB used on this device'],
  [/^Zona del (.+)$/, 'Area of $1'],
  [/^([\d.,]+) riquadri di mappa \(circa ([\d.,]+) MB\) e tutti i campeggi, servizi e spot della zona\.$/, '$1 map tiles (about $2 MB) plus every campsite, service and spot in the area.'],
  [/^([\d.,]+) di ([\d.,]+)$/, '$1 of $2'],
  [/^Fatto, ma (\d+) elementi non sono stati scaricati\. Puoi riprovare\.$/, 'Done, but $1 items failed. You can try again.'],
  [/^Zona offline pronta: (.+)$/, 'Offline area ready: $1'],
  [/^Importati (\d+) elementi$/, 'Imported $1 items'],
  [/^Scarico… (\d+)%$/, 'Downloading… $1%'],
  [/^(\d+) aree non scaricate, riprova$/, '$1 areas failed, try again'],
];

function tr(s) {
  if (EN[s] !== undefined) return EN[s];
  for (const [re, out] of PATTERNS) if (re.test(s)) return s.replace(re, out);
  if (s.includes(' · ')) { const parts = s.split(' · '), out = parts.map(p => tr(p) ?? p); if (out.some((p, i) => p !== parts[i])) return out.join(' · '); }
  const m = s.match(/^(\S+ )(.+)$/u); // leading emoji, e.g. "⛺ Campeggi"
  if (m && /\p{Extended_Pictographic}/u.test(m[1]) && EN[m[2]] !== undefined) return m[1] + EN[m[2]];
  return null;
}
/** Translate a string in code (used for confirm dialogs). */
export const t = s => (LANG === 'en' && tr(s)) || s;

const ATTRS = ['placeholder', 'aria-label', 'value'];
function translateNode(n) {
  if (n.nodeType === 3) {
    const v = n.nodeValue, s = v.trim();
    if (!s || n.parentElement?.closest('textarea,script,style,[translate="no"]')) return;
    const out = tr(s);
    if (out != null && out !== s) n.nodeValue = v.replace(s, out);
    return;
  }
  if (n.nodeType !== 1 || n.closest('[translate="no"]')) return;
  for (const a of ATTRS) { const v = n.getAttribute(a); const out = v && !(a === 'value' && n.tagName === 'OPTION') && tr(v.trim()); if (out) n.setAttribute(a, out); }
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let c;
  while ((c = w.nextNode())) {
    if (c.nodeType === 3) translateNode(c);
    else if (!c.closest('[translate="no"]')) for (const a of ATTRS) { const v = c.getAttribute(a); const out = v && !(a === 'value' && c.tagName === 'OPTION') && tr(v.trim()); if (out) c.setAttribute(a, out); }
  }
}
export function startTranslation() {
  document.documentElement.lang = LANG;
  if (LANG !== 'en') return;
  translateNode(document.body);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
