# ADR-001: MVP stack and local-first storage

- Status: Proposed (implemented on `feat/notes-app-mvp`, pending owner review)
- Date: 2026-11-19
- Owners: TBD

## Context
The product owner requested a working app comparable to Apple Notes ("Ghi chú") and GoodNotes:
rich-text notes plus paged handwriting notebooks. `TECH_STACK.md` listed a proposed stack that had
not been approved, and `LOCAL_FIRST_AND_SYNC.md` had no storage decision.

## Decision
- **Runtime:** React 18.3 + Vite 5 + TypeScript (strict). No router library — hash routing (`#/doc/<id>`).
- **State:** a small external store (`src/stores/libraryStore.ts`) consumed via `useSyncExternalStore`.
  No state library.
- **Styling:** plain CSS with design tokens and `prefers-color-scheme` dark mode. Tailwind deferred.
- **Rich text:** `contenteditable` + `document.execCommand`, with an allow-list sanitiser applied to
  pasted HTML and to stored HTML before rendering. No editor framework yet.
- **Handwriting:** Canvas 2D with Pointer Events (pressure, coalesced events), page-coordinate strokes
  (820 × 1160 logical units), stroke eraser, highlighter, images, per-page undo/redo.
- **Persistence:** IndexedDB, one record per document (`olaa-note` DB, `documents` store), debounced
  write-behind (400 ms) and flush on `visibilitychange`/`pagehide`. In-memory fallback when IndexedDB
  is unavailable (UI warns). JSON backup export/import (newer `updatedAt` wins on import).
- **Package manager:** npm (pnpm was not available on the dev machine). Switching later is cheap.
- **Tests:** Vitest (node env) + `fake-indexeddb` for storage integration tests.

## Alternatives considered
- TipTap/ProseMirror for rich text — better long-term, but a large dependency; revisit when
  collaboration or structured blocks are needed.
- SVG for ink — simpler hit-testing but slower with many strokes; canvas chosen.
- Dexie/idb wrappers — unnecessary for a single object store.

## Consequences
- Fully offline, no account required. **No cloud sync, no OLAA ID integration yet.**
- `execCommand` is deprecated; formatting behaviour differs slightly between browsers.
- Images are stored inline as data URLs (downscaled to ≤1400 px); large notebooks grow the DB.
- PDF import/annotation is not implemented.

## Security / privacy impact
All data stays in the browser's IndexedDB on the user's device. Note HTML is sanitised against an
allow-list (no scripts, event handlers, or non-http(s)/mailto links). Backups are plain JSON — users
must store them safely.

## Rollback / migration
DB schema version is 1. Future schema changes must bump `DB_VERSION` and migrate in
`onupgradeneeded`, preserving document ids. Backup JSON (`version: 1`) is the portable escape hatch.
