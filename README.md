# Pulser

A freestanding, client-side weekly communications dashboard. Drop in raw
exports from each channel — CSV, TSV, or Excel — and immediately see growth
trends and a click→sign-up funnel across every channel — reach, engagement,
followers, clicks, and sign-ups, week over week.

**No accounts. No backend. No data leaves your browser.**

This exists because the previous approach (Looker Studio + a shared Google
Drive) tied access to Google accounts and Drive permissions — for a team that
rotates operators every ~10 weeks, that meant recurring account provisioning,
permission sprawl, and data left orphaned when someone's account was
deprovisioned. This tool has nothing to provision and nothing to hand off but
a link to a static file.

## What it is

- A single HTML file (`index.html`) with inline CSS and JS — no build step,
  no server.
- Opens directly from disk (`file://`) or from any static host.
- Renders a fully populated dashboard with **sample data** the first time you
  open it, so there's always something to look at.
- Drag in your own files (CSV, TSV, or Excel) and the sample data is
  replaced immediately.
- Nothing you upload is ever saved, sent anywhere, or written to browser
  storage. Refresh the page and you're back to a clean slate.

## How to run it

**Locally:** double-click `index.html` (or `index.offline.html`, see below).
That's it.

**Hosted (GitHub Pages):**
1. Push this repo to GitHub.
2. Repo Settings → Pages → deploy from the default branch, root folder.
3. Your dashboard is live at the Pages URL. No environment variables, no
   secrets, no config.

Any other static host (Netlify, S3, a plain nginx directory) works the same
way — just serve the file.

## Two build modes

| File | Use when | Network calls |
|---|---|---|
| `index.html` | Default. Hosted or local, internet available. | Loads PapaParse + Chart.js from cdnjs on first load. |
| `index.offline.html` | Air-gapped machine, restricted network, or you want a provably zero-network artifact. | None — both libraries are inlined. |

Both files are otherwise identical and built from the same source. To
regenerate `index.offline.html` (e.g. after editing `index.html`), run:

```
node scripts/build-offline.js
```

This pulls the pinned library versions from the npm registry at build time
only, inlines them, and writes `index.offline.html`. The generated file
itself makes no external requests — verify in your browser's Network tab.

Pinned dependencies:
- [PapaParse](https://www.papaparse.com/) 5.4.1 (MIT) — CSV/TSV parsing, with automatic delimiter detection
- [Chart.js](https://www.chartjs.org/) 4.4.4 (MIT) — the growth line chart
- [SheetJS `xlsx`](https://sheetjs.com/) 0.18.5 (Apache-2.0) — Excel `.xlsx`/`.xls` parsing

If Chart.js fails to load (blocked network, offline without the offline
build), the growth chart shows a text fallback — the KPI tiles, funnel, and
detail table are plain HTML/CSS and keep working regardless. If PapaParse or
SheetJS fail to load, uploading that file type is disabled with a clear
message (the app itself, and any already-loaded data, still works).

## Ingesting data

Drop in **CSV, TSV, or Excel (`.xlsx`/`.xls`)** files — one or more at once,
mixed types and mixed platforms in the same drop are fine. Each file is
routed through one of three paths, tried in order, and everything from the
whole batch is merged into one dataset:

1. **Canonical schema** — the file already has `week` and `channel` columns
   (see below). Used as-is.
2. **A platform adapter** — the file's columns match a known raw export
   (see "Platform adapters" below). Detected automatically by column
   signature (with a filename hint as a tiebreaker) and reshaped to weekly.
3. **Manual mapping** — neither of the above matched. Instead of failing,
   the app shows a one-time mapping step: it lists the file's columns and
   lets you assign each to a canonical field (and type in a fixed
   channel/week if the file doesn't have those as columns). This is
   **session-only** — nothing about the mapping is saved — and it's the
   resilience valve for a platform quietly changing its export format: a
   broken adapter degrades to "map it yourself," never a broken tool.

A row missing both a resolvable date and a channel is skipped silently
rather than failing the whole batch.

### The canonical schema

One row per **channel × ISO week** (week start = Monday).

| Column | Type | Meaning |
|---|---|---|
| `week` | date, `YYYY-MM-DD` | **Required.** Join key. |
| `channel` | string | **Required.** e.g. Instagram, Facebook, LinkedIn, Linktree, Forms, Newsletter. |
| `reach` | number | People who saw content. Falls back to `impressions` if the column is absent. |
| `impressions` | number | Raw views. |
| `engagements` | number | Likes + comments + shares + saves (or entered directly). |
| `followers` | number | Running follower/subscriber total. |
| `clicks` | number | Outbound/link clicks (Linktree taps, post link clicks). |
| `conversions` | number | Sign-ups. Falls back to `form_submissions + new_subscribers` if absent. |

Headers are **case-insensitive and order-independent**, and missing columns
are read as `0`/blank rather than erroring. Recognized aliases per column:

- `week` ← `week`, `week_start`, `date`, `reporting_week`, `week_of`
- `channel` ← `channel`, `platform`, `source`, `network`
- `reach` ← `reach`
- `impressions` ← `impressions`, `impression`, `views`, `view`
- `engagements` ← `engagements`, `engagement`, `total_engagements`
- `followers` ← `followers`, `followers_total`, `subscribers_total`, `audience`, `subscribers`
- `clicks` ← `clicks`, `link_clicks`, `linktree_clicks`, `total_clicks`, `taps`
- `conversions` ← `conversions`; else the sum of `form_submissions`/`submissions`/`responses` and `new_subscribers`/`signups`/`sign_ups`

Download a starter file from the app ("Download template CSV") or use
[`sample/comms_template.csv`](sample/comms_template.csv).

### Platform adapters

Ship for: **Meta/Facebook Page Insights, Instagram Insights, LinkedIn Page
Analytics, Linktree Analytics, and Mailchimp-style newsletter campaign
exports.** These raw exports are usually daily or per-post — the matching
adapter reshapes them to one row per channel per ISO week automatically:
additive metrics (reach, impressions, engagements, clicks, conversions) sum
across the week; `followers` (a running total, not a daily count) takes the
**latest** value seen that week.

**Known limitation:** some platforms only export follower *deltas*
("new followers today") rather than a running total. Where that's the only
column available, an adapter's `followers` output will read as that day's
delta, not your actual audience size — there's no way to reconstruct a
cumulative total from deltas alone without a starting baseline. If you hit
this, either ignore the Followers column for that channel or track it
separately until the export includes a snapshot total.

Adapters are intentionally the most likely thing to break — a platform can
change its export columns at any time. Each one is a small, self-contained
block (detector + column map) inside `index.html`, marked
`// ---------- Platform adapters ----------`. **To fix an adapter, edit its
`aliasToField` (and `signature`, if the platform renamed a column you rely
on for detection) in that one block — nothing else in the app needs to
change.** Until it's fixed, files from that platform still work; they just
fall to the manual-mapping step.

### Funnel

`Reach → Engagement → Clicks → Sign-ups`, summed across the selected channels
for the selected week.

- **Click-through rate** = clicks ÷ reach
- **Conversion rate** = sign-ups ÷ clicks

## Counts only — never PII

**Only upload aggregate numbers.** This tool is built to handle "47 form
submissions," never the 47 people who submitted them. Do not put
respondent-level data — names, emails, free-text answers — into the file. If
your source system (e.g. Google Forms) exports individual responses,
aggregate them into a count before they ever reach this tool. The Google
Sheet or intake form you already use remains the record of truth; this
dashboard is a disposable, stateless read-out of it.

This holds on every ingestion path, not just the canonical schema.
Adapters and the manual-mapping step only ever *copy* the specific columns
mapped to a canonical field (reach, clicks, followers, etc.) into the
dataset — a name or email column left unmapped is simply never read past
detection; it's discarded with the rest of the file the moment parsing
finishes. If a raw export is respondent-level (a Google Forms/Typeform
response dump, say), map only the date/channel and leave every PII column
unmapped — you'll end up with a per-week row count, not a name list. If the
file has no natural count at all, aggregate it to counts in the source
system first.

## Security & privacy model

- **100% client-side.** Parsing, computation, and rendering all happen in
  your browser tab.
- **No accounts, no auth.** There is nothing to sign into.
- **No persistence.** Nothing is written to `localStorage`, `sessionStorage`,
  IndexedDB, or cookies. A refresh clears all uploaded data back to the
  sample dataset.
- **No exfiltration path.** The only network requests the page makes are the
  two library loads in CDN mode (none in offline mode). No analytics, no
  telemetry, no `fetch`/XHR/WebSocket of your data, ever. Check your
  browser's Network tab to confirm.
- **A leaked link is safe.** Because there's nothing to sign into and
  nothing stored, sharing the URL — even by accident — just hands someone a
  blank tool with sample data. There's no dataset behind it to expose.

If you're extending this tool, preserve this model: **adding an account, a
stored dataset, a server, or a "phone home" of any kind breaks the security
model** and should be called out explicitly in review — it's the whole
reason this exists instead of the previous Looker Studio setup.

## What the dashboard shows

- **KPI tiles** — Reach, Engagement, Followers, Clicks, Sign-ups for the
  selected week, each with a week-over-week delta.
- **Growth chart** — one line per channel; switch the metric with the tabs
  above the chart.
- **Funnel** — the four-stage funnel for the selected week, with rates.
- **Detail table** — per-channel numbers for the selected week, with totals.
- **Filters** — toggle channels on/off (at least one stays selected) and
  pick the reporting week; both apply to every view above.

## Repository structure

```
cdls-comms-pulse/
├── index.html              # the app (CDN mode)
├── index.offline.html      # the app with libraries inlined (zero network calls)
├── scripts/
│   └── build-offline.js    # regenerates index.offline.html from index.html
├── sample/
│   └── comms_template.csv  # canonical schema + example rows, downloadable in-app too
├── README.md
└── LICENSE                 # MIT
```

## Out of scope (v1)

Ad-spend/paid-campaign attribution, cross-platform de-duplicated unique
reach, real-time API pulls, multi-user collaboration, saved history/audit
trail, anything server-side. Your existing intake sheet or form remains the
source of record; this tool is a stateless read-out of it.

## License

This project is MIT — see [LICENSE](LICENSE). Fork it, host it yourself,
hand it to the next cohort. Bundled third-party libraries keep their own
licenses (PapaParse and Chart.js are MIT; SheetJS `xlsx` is Apache-2.0),
noted above where each is pinned.
