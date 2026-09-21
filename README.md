# Pulser

A weekly communications dashboard that runs entirely in your browser. Drop in
the raw exports from each channel (CSV, TSV, or Excel) and see your growth
trends and a click-to-signup funnel across every channel: reach, engagement,
followers, clicks, and sign-ups, week over week.

This is a first version (an MVP) built for CDLS. The point is to find where the
current reporting process creates friction, and to build strategy around making
analytics a foundational part of how the team works rather than an afterthought.
It's an extra step in the workflow, but it keeps data processing and access to a
minimum, which matters both for security and for handing things off between
cohorts.

## What it is

- One HTML file (`index.html`) with the styling and code built in. There is no
  build step and no server.
- It opens straight from your computer (`file://`) or from any web host.
- The first time you open it, it fills itself with sample numbers so there is
  always something on screen.
- Drag in your own files (CSV, TSV, or Excel) and the sample numbers are
  replaced right away.
- You can download a shareable PDF report for the week you are looking at:
  the numbers plus a short plain-language read of them, all put together in
  the browser.
- Nothing you upload is saved, sent anywhere, or kept in the browser. Refresh
  the page and you are back to a clean start.

## How to run it

Locally: double-click `index.html` (or `index.offline.html`, described below).
That is all.

Hosted on GitHub Pages:

1. Push this repo to GitHub.
2. Go to Settings, then Pages, and deploy from the default branch, root folder.
3. Your dashboard is live at the Pages URL. There is nothing else to configure.

Any other web host (Netlify, S3, a plain nginx folder) works the same way. Just
serve the file.

## Two versions of the file

| File | Use when | Network calls |
|---|---|---|
| `index.html` | The usual choice. Hosted or local, internet available. | Loads PapaParse, Chart.js, SheetJS, and jsPDF from cdnjs, plus Open Sans/Montserrat from Google Fonts, the first time it opens. |
| `index.offline.html` | A machine with no internet, a locked-down network, or when you want a file you can prove makes no network calls. | None. Every library is built in, and typography falls back to the system font stack. |

The two files are otherwise the same and come from the same source. To rebuild
`index.offline.html` after you edit `index.html`, run:

```
node scripts/build-offline.js
```

This pulls the pinned library versions from the npm registry at build time
only, folds them into the file, and writes `index.offline.html`. The file it
produces makes no outside requests. You can confirm this in your browser's
Network tab.

Pinned libraries:

- [PapaParse](https://www.papaparse.com/) 5.4.1 (MIT), for reading CSV and TSV, with the delimiter detected for you
- [Chart.js](https://www.chartjs.org/) 4.4.4 (MIT), for the growth line chart
- [SheetJS `xlsx`](https://sheetjs.com/) 0.18.5 (Apache-2.0), for reading Excel `.xlsx` and `.xls` files
- [jsPDF](https://github.com/parallax/jsPDF) 2.5.2 (MIT), for the downloadable PDF report

If Chart.js does not load (a blocked network, or offline without the offline
version), the growth chart shows a text version instead. The KPI tiles, funnel,
and detail table are plain HTML and keep working. The PDF report still generates,
with a text note in place of the chart image. If PapaParse or SheetJS do not
load, uploading that file type is turned off with a clear message. If jsPDF does
not load, the PDF button shows a message instead of downloading. In every one of
these cases the app itself, and any data you have already loaded, keep working.

### Typography

Headings use Open Sans, body text uses Montserrat, both loaded from Google
Fonts in `index.html` only, with the system font stack (`system-ui`,
`-apple-system`, `"Segoe UI"`, `sans-serif`) as the fallback if the fonts do
not load. `index.offline.html` never references Google Fonts at all — the
build script strips that block entirely, so the offline version always
renders in the system stack, the same way on every machine.

## Adding your data

Drop in CSV, TSV, or Excel (`.xlsx` or `.xls`) files, one or several at once.
Mixing file types and platforms in the same drop is fine. Each non-Excel file
is read first (UTF-8 or UTF-16, detected for you, see "Format Mix exports"
below), then sent down one of four paths, tried in order. Growth and funnel
data from every file that matched is combined into one set at the end. Format
Mix data (below) is kept fully separate and never mixes into it.

1. A Format Mix export: a Meta or Instagram "Top content formats" file,
   recognized by its distinctive stacked-section shape rather than a header
   row. This goes to the separate Format Mix view, never the funnel. See
   "Format Mix exports" below.
2. The standard layout: the file already has `week` and `channel` columns
   (described below). Used as is.
3. A platform adapter: the file's columns match a known raw export (see
   "Platform adapters" below). The app spots this on its own from the columns
   (using the filename as a tiebreaker) and reshapes the file to weekly rows.
4. Map it yourself: none of the above matched. Rather than failing, the app
   shows a one-time step that lists the file's columns and lets you assign
   each one to a field (and type in a fixed channel or week if the file does
   not have those as columns). This lasts only for the current session,
   nothing about it is saved. It is also the fallback for a platform quietly
   changing its export format: a broken adapter drops to "map it yourself"
   rather than leaving you stuck.

A row with no readable date and no channel is skipped quietly rather than
failing the whole batch.

### The standard layout

One row per channel per ISO week (a week starts on Monday).

| Column | Type | Meaning |
|---|---|---|
| `week` | date, `YYYY-MM-DD` | Required. The join key. |
| `channel` | text | Required. For example Instagram, Facebook, LinkedIn, Linktree, Forms, Newsletter. |
| `reach` | number | People who saw content. Falls back to `impressions` if this column is missing. |
| `impressions` | number | Raw views. |
| `engagements` | number | Likes, comments, shares, and saves added up (or entered directly). |
| `followers` | number | Running follower or subscriber total. |
| `clicks` | number | Outbound or link clicks (Linktree taps, post link clicks). |
| `conversions` | number | Sign-ups. Falls back to `form_submissions + new_subscribers` if missing. |

Column names can be in any order and any capitalization. Missing columns are
read as `0` or blank rather than causing an error. Each column also accepts
these alternate names:

- `week`: `week`, `week_start`, `date`, `reporting_week`, `week_of`
- `channel`: `channel`, `platform`, `source`, `network`
- `reach`: `reach`
- `impressions`: `impressions`, `impression`, `views`, `view`
- `engagements`: `engagements`, `engagement`, `total_engagements`
- `followers`: `followers`, `followers_total`, `subscribers_total`, `audience`, `subscribers`
- `clicks`: `clicks`, `link_clicks`, `linktree_clicks`, `total_clicks`, `taps`
- `conversions`: `conversions`, otherwise the sum of `form_submissions`/`submissions`/`responses` and `new_subscribers`/`signups`/`sign_ups`

You can download a starter file from the app ("Download template CSV") or use
[`sample/comms_template.csv`](sample/comms_template.csv).

### Platform adapters

There are adapters for Meta and Facebook Page Insights, Instagram Insights,
LinkedIn Page Analytics, Linktree Analytics, and Mailchimp-style newsletter
campaign exports. These raw exports are usually daily or per-post, and the
matching adapter reshapes them to one row per channel per ISO week on its own.
The metrics that add up (reach, impressions, engagements, clicks, conversions)
are summed across the week. `followers`, which is a running total rather than a
daily count, takes the latest value seen that week.

A known limitation: some platforms only export follower changes ("new followers
today") rather than a running total. Where that is the only column available,
the adapter's `followers` figure will read as that day's change, not your real
audience size. There is no way to rebuild a running total from daily changes
alone without a starting number. If you run into this, either ignore the
Followers column for that channel or track it on the side until the export
includes a full total.

Adapters are the part most likely to break, since a platform can rename its
export columns at any time. Each adapter is a small self-contained block (a
detector plus a column map) inside `index.html`, marked
`// ---------- Platform adapters ----------`. To fix one, edit its
`aliasToField` (and its `signature`, if the platform renamed a column you rely
on to detect the file) in that one block. Nothing else in the app needs to
change. Until you fix it, files from that platform still work, they just fall
to the map-it-yourself step.

### Format Mix exports

Meta and Instagram's "Top content formats" export answers a different question
than the rest of the app: not how the audience is growing, but which content
formats earn attention. It is handled on its own, on purpose:

- It is usually UTF-16 encoded, with a `sep=,` hint line at the top. Both are
  handled for you. The app checks the byte-order-mark on every non-Excel file
  and reads it accordingly, and strips the hint line before parsing.
- It is not one header row with data under it. It is three small tables stacked
  in one file (`Published content`, `Views`, `Content interactions`, each with
  a label row, a format-name row, then a values row). The app recognizes this
  shape and combines the three sections into one record per format (Reels,
  Stories, Photo, and so on).
- It has no date column. When you import it, the app asks you to tag the file
  with the week it covers (the same date picker used for the map-it-yourself
  week field). Tagging a file to a week you have already loaded replaces that
  week's format mix rather than adding a duplicate, so re-exporting the same
  period twice settles to one.
- It never contains reach, followers, clicks, or sign-ups, so it can never feed
  the growth chart or funnel, and the app does not try. If it is the only kind
  of file you have loaded, the Format Mix view says so plainly rather than
  leaving you to wonder why the funnel is empty.

See "Format Mix" under "What the dashboard shows" for what the view itself
contains.

### Funnel

Reach to Engagement to Clicks to Sign-ups, added up across the channels you have
selected for the week you have selected.

- Click-through rate is clicks divided by reach.
- Conversion rate is sign-ups divided by clicks.

## Counts only, never personal details

Only upload totals. This tool is built to handle "47 form submissions," not the
47 people who submitted them. Do not put person-level data (names, emails,
free-text answers) into the file. If your source system (for example Google
Forms) exports individual responses, turn them into a count before they reach
this tool. The Google Sheet or intake form you already use stays the record of
truth. This dashboard is a throwaway read-out of it.

This holds on every path in, not just the standard layout. Adapters and the
map-it-yourself step only ever copy the specific columns you mapped to a field
(reach, clicks, followers, and so on) into the data set. A name or email column
you leave unmapped is never read past detection. It is thrown out with the rest
of the file the moment parsing finishes. If a raw export is person-level (a
Google Forms or Typeform response dump, say), map only the date and channel and
leave every personal-detail column unmapped. You will end up with a per-week row
count, not a list of names. If the file has no natural count at all, turn it
into counts in the source system first.

## Security and privacy

- Everything happens in your browser tab: reading the files, doing the math,
  and drawing the screen.
- There are no accounts and no sign-in. There is nothing to log into.
- Nothing is saved. Nothing is written to `localStorage`, `sessionStorage`,
  IndexedDB, or cookies. A refresh clears everything you uploaded back to the
  sample data.
- There is no way for your data to leave. The only network requests the page
  makes are the two library loads when it runs in the CDN version (and none in
  the offline version). No analytics, no tracking, and no sending of your data,
  ever. You can check your browser's Network tab to confirm.
- A leaked link is harmless. Since there is nothing to log into and nothing
  stored, sharing the URL by accident just hands someone a blank tool with
  sample data. There is no data set behind it to expose.

If you extend this tool, keep this model in place. Adding an account, a stored
data set, a server, or any kind of phone-home breaks the privacy model and
should be flagged in review. It is the whole reason this tool exists instead of
the old Looker Studio setup.

## What the dashboard shows

- KPI tiles: Reach, Engagement, Followers, Clicks, and Sign-ups for the week
  you have selected, each with its change from the week before.
- Growth chart: one line per channel. Switch the metric with the tabs above the
  chart.
- Funnel: the four-stage funnel for the selected week, with its rates.
- Detail table: per-channel numbers for the selected week, with totals.
- Filters: turn channels on and off (at least one stays on) and pick the week.
  Both apply to every view above.

## Format Mix

A companion view, kept separate from the funnel on purpose, fed by Meta and
Instagram "Top content formats" exports (see "Format Mix exports" under "Adding
your data"). Pick a period (the week the file was tagged with on import) and it
shows, for that period:

- Views by format: a sorted bar per format. The headline number.
- Views per post: views divided by posts published, sorted on its own. This is
  the efficiency signal. A format that earns a lot from very few posts stands
  out here even if its raw view count does not top the chart above.
- Published count and interactions per format, next to views and views per post,
  in one table.
- A one-line, rule-based note, for example "Reels earned 75% of views from a
  small share of posts; Stories were published most but drew the fewest views
  per post." Same idea as the PDF read: plain arithmetic over the numbers
  already shown, not a claim about cause.
- A share-of-views comparison across periods, once you have loaded two or more,
  for example watching Reels' share of views move week to week.

If you have not loaded a Format Mix file, this card says so. If you have loaded
only a Format Mix file and no growth or funnel data, this card says that too,
rather than leaving the empty funnel unexplained. Format Mix numbers are never
used to fill in or stand in for reach, followers, clicks, or sign-ups. The two
views share a page, never data.

## PDF report

"Download PDF report," next to the week selector, builds a one-to-two page PDF
for the week and channel filter you are looking at, with the same numbers as the
screen, saved to a file (`pulse-report-YYYY-MM-DD.pdf`). It is built entirely in
the browser through a `Blob`. Nothing is uploaded and no network request is
made, and it works the same in the offline version. It contains, in order:

1. A title, the selected week, and the date the report was made.
2. The five KPIs with their change from the week before.
3. The funnel (Reach to Engagement to Clicks to Sign-ups) with the click-through
   and conversion rates.
4. The growth chart as an image (skipped with a text note if Chart.js did not
   load, and the rest of the report is unaffected).
5. The per-channel detail table for the week.
6. "What this means," a short plain-language read of the week.
7. A footer noting that the report contains totals only.

If the sample data is loaded, the report is stamped SAMPLE DATA so it is never
mistaken for a real week's reporting.

### About the read

The "What this means" section is plain text worked out from the numbers already
in memory. It is not an AI call and it does not try to explain cause. It states
the direction and size of the week-over-week change in reach, engagement,
followers, and sign-ups; names this week's funnel bottleneck (the stage with the
weakest conversion rate compared with the stage before it, for example "clicks
are healthy, but sign-ups lag"), with this week's click-through and conversion
rates set against the average of up to the prior 4 weeks; and names the top
channel by reach, by engagement rate, and by sign-ups, flagging any channel with
an unusually large move from the week before. It always closes with a note that
reach is not de-duplicated across platforms and that these are observations, not
explanations of why something moved.

It is kept simple and clear on purpose. Someone who is not an analyst can read
every sentence back to the arithmetic that produced it, and so can you. All of
the rules and their adjustable thresholds (how many weeks count as "short
history," the trailing-average window, what counts as a "notable" move) live in
one block in `index.html`, marked
`// ---------- Report interpretation rules (plain-language, rule-based) ----------`.
To change the wording or a threshold, edit that block. Nothing else in the app
depends on it.

## Repository layout

```
cdls-comms-pulse/
├── index.html              # the app (CDN version)
├── index.offline.html      # the app with libraries built in (no network calls)
├── scripts/
│   └── build-offline.js    # rebuilds index.offline.html from index.html
├── sample/
│   └── comms_template.csv  # the standard layout with example rows, also downloadable in the app
├── README.md
└── LICENSE                 # MIT
```

## Not in this version

Ad-spend and paid-campaign attribution, cross-platform de-duplicated unique
reach, live API pulls, more than one person working at once, saved history or an
audit trail, and anything server-side. Your existing intake sheet or form stays
the record of truth. This tool is a read-out of it that keeps nothing.

## License

This project is MIT, see [LICENSE](LICENSE). Fork it, host it yourself, hand it
to the next cohort. The bundled libraries keep their own licenses (PapaParse,
Chart.js, and jsPDF are MIT; SheetJS `xlsx` is Apache-2.0), noted above where
each one is pinned.
