# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Apache-2.0 license.
- README with a Today-dashboard screenshot and a CI status badge.
- Vitest unit suite covering the scoring (`componentScores`), metrics
  (`metricsForDay`, `computeDeepFocus`), and classifier (`classify`) logic.
- GitHub Actions CI (`Typecheck & test`) on every push and pull request, plus
  branch protection requiring it to pass before merge.
- `CONTRIBUTING.md` documenting the branch-protection / PR workflow.

### Fixed
- "Output shipped" score component collapsed to ~1 on any active day because
  `clamp01` wrapped the raw event count instead of the normalized ratio.
- Technical-YouTube reclassification (talks, tutorials, courses → learning) was
  unreachable: the generic `youtube.com → distract` rule was matched first.
- VS Code's macOS app name (`Code`) was misclassified as `other` because the
  editor rule only matched `vscode` / `visual studio code`.

## [0.1.0] - 2026-06-02

### Added
- Initial Pulse desktop app — a local-first macOS productivity tracker
  (Electron + Vite + React + TypeScript). Records foreground activity to a local
  SQLite database, classifies it into categories and per-app sources, computes a
  daily 0–100 productivity score across five weighted components, and uses Claude
  to generate end-of-day reports plus measurable, machine-checkable suggestions —
  then evaluates whether yesterday's suggestions were followed.
