/**
 * End-to-end check against the live upstream, no server needed.
 *
 *   node scripts/smoke.mjs --stop 83139 --service 15 --walk 10 [--buffer 2]
 *
 * Deliberately recomputes leave-by times itself instead of importing lib/plan,
 * so agreement between this and the UI is real corroboration. Compare the
 * arrival times it prints against the LTA / Citymapper app for the same stop.
 */
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const stop = arg('stop');
const service = arg('service');
const walkMin = Number(arg('walk', '10'));
const bufferMin = Number(arg('buffer', '2'));

if (!stop) {
  console.error('usage: node scripts/smoke.mjs --stop <code> [--service <no>] --walk <min> [--buffer <min>]');
  process.exit(1);
}

const res = await fetch(`https://arrivelah2.busrouter.sg/?id=${stop}`);
if (!res.ok) {
  console.error(`arrivals service returned ${res.status}`);
  process.exit(1);
}

const { services = [] } = await res.json();
if (services.length === 0) {
  console.log(`No buses running at stop ${stop} right now.`);
  process.exit(0);
}

const svc = service ? services.find((s) => s.no === service) : services[0];
if (!svc) {
  console.error(`Bus ${service} is not running at stop ${stop}. Running: ${services.map((s) => s.no).join(', ')}`);
  process.exit(1);
}

const sgt = (d) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);

const now = new Date();
console.log(`\nBus ${svc.no} at stop ${stop} — now ${sgt(now)} SGT`);
console.log(`walk ${walkMin} min, buffer ${bufferMin} min\n`);
console.log('  arrives   leave by   last chance   status');
console.log('  ────────────────────────────────────────────');

for (const bus of [svc.next, svc.next2, svc.next3]) {
  if (!bus?.time) continue;
  const arrival = new Date(bus.time);
  const lastChance = new Date(arrival.getTime() - walkMin * 60_000);
  const leaveBy = new Date(lastChance.getTime() - bufferMin * 60_000);
  const mins = Math.round((leaveBy - now) / 60_000);

  const status =
    now >= lastChance ? 'out of reach'
    : now >= leaveBy ? 'GO NOW'
    : `in ${mins} min`;

  console.log(
    `  ${sgt(arrival)}     ${sgt(leaveBy)}      ${sgt(lastChance)}         ${status}` +
      (bus.monitored === 1 ? '' : '  (timetable estimate)'),
  );
}
console.log();
