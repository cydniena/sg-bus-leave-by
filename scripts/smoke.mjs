/**
 * End-to-end check against a running server.
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

const base = arg('base', 'http://localhost:3117');
const stop = arg('stop');
const service = arg('service');
const walkMin = Number(arg('walk', '10'));
const bufferMin = Number(arg('buffer', '2'));

if (!stop || !service) {
  console.error('usage: node scripts/smoke.mjs --stop <code> --service <no> --walk <min> [--buffer <min>]');
  process.exit(1);
}

const res = await fetch(`${base}/api/arrivals?stop=${stop}&service=${service}`);
const body = await res.json();
if (!res.ok) {
  console.error(`error: ${body.error}`);
  process.exit(1);
}

const svc = body.services.find((s) => s.serviceNo === service) ?? body.services[0];
if (!svc || svc.arrivals.length === 0) {
  console.log(`No upcoming bus ${service} at stop ${stop} right now.`);
  process.exit(0);
}

const sgt = (d) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);

const now = new Date();
console.log(`\nBus ${svc.serviceNo} at stop ${stop} — now ${sgt(now)} SGT`);
console.log(`walk ${walkMin} min, buffer ${bufferMin} min\n`);
console.log('  arrives   leave by   last chance   status');
console.log('  ────────────────────────────────────────────');

for (const a of svc.arrivals) {
  const arrival = new Date(a.at);
  const lastChance = new Date(arrival.getTime() - walkMin * 60_000);
  const leaveBy = new Date(lastChance.getTime() - bufferMin * 60_000);
  const mins = Math.round((leaveBy - now) / 60_000);

  const status =
    now >= lastChance ? 'out of reach'
    : now >= leaveBy ? 'GO NOW'
    : `in ${mins} min`;

  console.log(
    `  ${sgt(arrival)}     ${sgt(leaveBy)}      ${sgt(lastChance)}         ${status}` +
      (a.monitored ? '' : '  (timetable estimate)'),
  );
}
console.log();
