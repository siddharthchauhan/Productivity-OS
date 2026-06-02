# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

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
