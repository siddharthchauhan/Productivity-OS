# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Penalty-based score components now earn credit with tracked activity** —
  comms hygiene and focus discipline started at 100 and only lost points, so
  an untracked day scored a constant 32 ("perfect marks for no data"). Their
  credit now scales with tracked active time, reaching full credit at 2 hours.
  An empty day scores 0; a normal workday is unchanged.

### Fixed
- **Today queried the wrong day in the evening** — "today" was computed in UTC
  (`toISOString()`) but interpreted as a local day, so west of Greenwich the
  app showed an empty, frozen-score day after 8 PM (EDT). All date strings now
  come from local-timezone helpers in `src/shared/dates.ts`. Affected the Today
  view, week trends, the daily/monthly schedulers, suggestion evaluation
  windows, and the header date.
- **Most tracked time silently vanished from metrics** — per-event rounding to
  whole minutes dropped every event under ~30s (85% of recorded events).
  Aggregates now accumulate milliseconds and round once per output value.
- **Events spanning midnight were double-counted** — an 11 PM–2 AM session was
  counted in full on both days. Events are now clipped to the day window
  before aggregation.
- **Tracker fragmented focus into 5-second slivers** — any window-title change
  (e.g. Warp's animated spinner glyph) split the open event each poll. Events
  now split only when the app, classification, or idle state changes; the title
  refreshes in place.
- **Misleading constant score with no data** — with zero tracked activity the
  score formula degenerates to a constant 32; the Today hero now shows an
  honest "No score yet" state, and the report rail labels which date the
  latest report is from instead of presenting a stale one as today's.

## [0.1.0] - 2026-06-02

First release of Pulse.

### Added
- **Pulse desktop app** — a local-first macOS productivity tracker (Electron +
  Vite + React + TypeScript). Records foreground activity to a local SQLite
  database, classifies it into categories and per-app sources, computes a daily
  0–100 productivity score across five weighted components, and uses Claude to
  generate end-of-day reports plus measurable, machine-checkable suggestions —
  then evaluates whether yesterday's suggestions were followed.
- **App icon and brand logo** — an azure-gradient squircle with a heartbeat
  mark, plus a "Pulse" wordmark lockup (light/dark README variants).
- **macOS menu-bar (Tray) icon** with an Open / Quit menu; Pulse stays in the
  menu bar when its window is closed.
- **Vitest test suite** (52 tests) covering the scoring (`componentScores`),
  metrics (`metricsForDay`, `computeDeepFocus`), and classifier (`classify`) logic.
- **GitHub Actions CI** (typecheck + tests) on every push and pull request,
  branch protection requiring it to pass, a CI status badge, and `CONTRIBUTING.md`.
- **Apache-2.0 license** and a README with a Today-dashboard screenshot.

### Fixed
- "Output shipped" score component collapsed to ~1 on any active day because
  `clamp01` wrapped the raw event count instead of the normalized ratio.
- Technical-YouTube reclassification (talks, tutorials, courses → learning) was
  unreachable: the generic `youtube.com → distract` rule was matched first.
- VS Code's macOS app name (`Code`) was misclassified as `other` because the
  editor rule only matched `vscode` / `visual studio code`.

[Unreleased]: https://github.com/siddharthchauhan/Productivity-OS/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/siddharthchauhan/Productivity-OS/releases/tag/v0.1.0
