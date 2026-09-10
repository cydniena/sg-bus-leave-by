# Leave By

Tells you when to stop working and walk out the door, so you don't miss your bus.

Transit apps answer *"when is the next bus?"*. This answers *"when do **I** need to
leave?"* — working backwards from live arrival times through your walk to the stop, and
showing what each option costs you:

```
Leave soon                        ← notification, 5 min before the deadline
Leave by 17:49                    ← when to stop working
   in 4:32
to catch bus 15 at 18:01          ← when the bus actually goes
11 min earlier than planned       ← you'd wanted to leave at 18:00

Or take a later one
18:15   leave by 18:03    +3 min   ← keep working, catch the next one
18:28   leave by 18:16   +16 min
```

## Running it

**No API keys. No registration. Nothing to configure.**

```bash
npm install
npm run fetch-stops     # one-off: snapshot Singapore's ~5,200 bus stops
npm run dev             # http://localhost:3000
```

Then `open http://localhost:3000/api/health` to confirm the upstreams are reachable.

## Where the data comes from

| Need | Source | Key? |
|---|---|---|
| Live bus arrivals | [arrivelah](https://github.com/cheeaun/arrivelah) (`arrivelah2.busrouter.sg`) | none |
| Bus stops | [busrouter.sg](https://data.busrouter.sg/v1/stops.json) | none |
| Address / postal code lookup | OneMap public search | none |
| Walking time | Estimated from distance | n/a |

`arrivelah` is a community-run proxy in front of LTA DataMall, which is what removes the
key requirement — DataMall itself needs a registered, manually-approved `AccountKey`. It's
someone else's free service, so the app polls politely: only while the tab is visible, and
backing off when nothing is imminent. If it ever goes away, `lib/arrivals.ts` is the single
file to repoint at DataMall directly.

**Walking time is an estimate**, not a routed path — straight-line distance × 1.35 detour
allowance at 1.25 m/s. There's no free keyless pedestrian router worth using: OSRM's public
server silently answers `foot` requests with car timings (38 km/h), which is worse than no
estimate. So walk your route once and set the real number in the trip form. Everything
else is calculated from it, so it's the one input worth getting right.

## Deploying

Deploy to Vercel or any Node host. No environment variables, no database — trips live in
`localStorage`.

## Verifying it against reality

```bash
npm test                                                    # 33 tests
node scripts/smoke.mjs --stop 01012 --service 12 --walk 8   # against a running server
```

`smoke.mjs` recomputes the leave-by times independently of `lib/plan.ts`, so agreement
between them is a real cross-check. Compare its arrival times against the LTA or
Citymapper app for the same stop.

To check notifications fire, temporarily set the trip's *"warn me this early"* to 60
minutes — the alert should appear once and **not** repeat as the ETA jitters between polls.

## How it works

| File | Role |
|---|---|
| `lib/plan.ts` | The whole idea, as one pure function. No clock, no network — fully unit tested. |
| `components/CountdownRing.tsx` | The depleting ring. Tracks time to `lastChance` so the sweep stays monotonic. |
| `components/Journey.tsx` | Timeline showing leave → walk → wait → bus, so the deadline isn't a number you just trust. |
| `lib/arrivals.ts` | arrivelah client; normalizes `next`/`next2`/`next3` into sorted arrivals. |
| `lib/geocode.ts` | OneMap search, with caching and 429 retry. |
| `lib/walk.ts` | Distance-based walking estimate. |
| `lib/format.ts` | Every user-facing time formats through here, pinned to `Asia/Singapore`. |
| `hooks/useNotifier.ts` | Alert de-duplication. |
| `hooks/useArrivals.ts` | Visibility-aware polling with back-off. |

Three details that aren't obvious:

**Two deadlines, not one.** `leaveBy` is the comfortable one; `lastChance` is
`arrival − walk`, with no margin. The buffer between them *is* the "leave now" window —
otherwise the target would silently skip to the next bus the instant you passed `leaveBy`.

**Alerts can't key off arrival times.** ETAs jitter every poll and there's no stable bus ID,
so `useNotifier` treats two ETAs within 4 minutes as the same bus. A larger jump means the
target genuinely changed, and a fresh alert is correct.

**OneMap search has a burst limit.** A few calls in the same second get a 429; anything at
human typing speed is fine. Results are cached and a 429 is retried once.

## Limits

- **Buses only.** LTA reconfirmed in July 2026 that real-time train arrivals won't be
  published — only service alerts and crowd density. MRT timing can't be done properly.
- **Three buses ahead.** That's LTA's ceiling per service.
- **Notifications need the tab open**, and on iPhone Safari they don't work in a tab at
  all — so the phone view is a big glance-able countdown with an audible chime instead.
  `public/manifest.json` is the on-ramp if you later want real Web Push.
- **Trips don't sync between devices.** *Copy link for phone* moves one across.

## Deploying

Import the repo at [vercel.com/new](https://vercel.com/new) — Next.js is auto-detected and
there is nothing to configure. No environment variables, no database.

`vercel.json` pins functions to `sin1` (Singapore). Vercel defaults to US East, which would
put a transpacific round trip in front of every arrivals call to an API that lives in
Singapore.
