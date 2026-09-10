/**
 * Snapshot every Singapore bus stop into public/bus-stops.json.
 *
 * Source: busrouter.sg's open dataset — no API key, no registration.
 * Shape is a compact map of  code -> [lng, lat, name, road].
 *
 * It lives in public/ so the browser fetches it as a static asset rather than
 * carrying ~480 KB in the JS bundle.
 *
 *   npm run fetch-stops
 */
import { writeFileSync } from 'node:fs';

const SRC = 'https://data.busrouter.sg/v1/stops.json';

const res = await fetch(SRC);
if (!res.ok) {
  console.error(`Failed to fetch ${SRC} — ${res.status}`);
  process.exit(1);
}

const raw = await res.json();
const stops = Object.entries(raw).map(([code, [lng, lat, name, road]]) => ({
  code,
  name,
  road,
  lat,
  lng,
}));

if (stops.length < 1000) {
  console.error(`Only got ${stops.length} stops — that looks wrong, refusing to overwrite.`);
  process.exit(1);
}

writeFileSync(new URL('../public/bus-stops.json', import.meta.url), JSON.stringify(stops));
console.log(`wrote public/bus-stops.json — ${stops.length} stops`);
