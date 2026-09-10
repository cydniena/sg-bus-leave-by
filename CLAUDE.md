# Leave By — working notes

A Next.js app that back-computes when to stop working and leave for a bus.
See README.md for setup. **It runs with no API keys** — keep it that way if you can.

## Ground rules

- **`lib/plan.ts` stays pure.** No `Date.now()`, no fetch, no React. `now` is always
  injected. It's the piece that must not be wrong, and that purity is what makes it
  exhaustively testable.
- **Never format a time without `lib/format.ts`.** Production runs in UTC; anything using
  the ambient timezone is 8 hours off in deployment while looking fine locally. Tests run
  with `TZ=UTC` to catch exactly that.
- **No environment variables.** Every upstream is public. If a future change needs a key,
  that's a real cost — weigh it against dropping the feature.

## Upstream quirks worth remembering

- **arrivelah** (`arrivelah2.busrouter.sg`) is a community-run proxy in front of LTA
  DataMall. It's free and unauthenticated, so poll politely — visible-tab only, with
  back-off. `lib/arrivals.ts` is the single file to repoint at DataMall if it disappears
  (that path needs a manually-approved `AccountKey`, and DataMall reports auth failures as
  **404 on every path**, which is deeply confusing if you hit it).
- **OneMap search** works without a token despite the nag field in its response, but has a
  short-window burst limit. `lib/geocode.ts` caches and retries a 429 once.
- **Walk time is estimated, never routed.** Don't reach for OSRM's public server — it
  silently returns car timings for `foot` requests. Users are expected to override the
  estimate with their real pace.
- `monitored: 0` means the ETA came from the timetable, not a tracked bus — surfaced as an
  "estimated" badge rather than hidden.

## Testing

`npm test` runs both suites under happy-dom. `scripts/smoke.mjs` checks a live server and
deliberately reimplements the leave-by arithmetic, so it corroborates `lib/plan.ts` rather
than echoing it.
