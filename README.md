# Olaa TakeNote

Type and handwrite on the same page, on iPad first (TakeNote PRD in
`olaa-platform/architecture/03-olaa-takenote/requirements/PRD.md`).

## Status

MVP web app (pre-release), PRD P0. Same stack as `olaa-language` and `olaa-habits`
(platform ADR-0003). Everything is stored on this device in IndexedDB; sign-in and cloud sync
(P1) are not built yet.

Implemented:
- **Notebooks:** create (title, cover colour, paper), rename, trash with 30-day restore,
  delete forever with confirmation.
- **Pages:** blank, lined, grid or dot paper; add, duplicate, move, delete (never the last),
  thumbnails.
- **One page, typing and handwriting together:** text boxes with bold, italic, heading and
  lists; pen and highlighter with pressure, 8 colours and 3 widths; stroke eraser.
- **Apple Pencil on the web:** Pointer Events with coalesced samples. Pen and mouse draw;
  fingers scroll unless "Vẽ bằng ngón tay" is on, so a resting palm does not draw.
- **PDF and slides:** import a PDF as pages (portrait and landscape keep their shape) and
  write on top; the original is never modified. Up to 100 MB.
- **Attachments:** images (move and resize) and any file (open from the page).
- **Export:** a page or the whole notebook to PDF, shared through the system share sheet where
  available, otherwise downloaded.
- **Never lose work:** autosave within 300 ms, saved again when the tab hides; undo and redo
  per page (also Ctrl/Cmd+Z).
- **UI:** Vietnamese, iPad / phone / desktop, keyboard and screen-reader labels.

Not yet (PRD P1+): Olaa ID sign-in and sync, links with Olaa Language, search, handwriting
recognition, tags, version history, lasso and ruler.

## Project layout

```
src/
  app/                    App root, hash router
  components/             Icons, stored image, confirm dialog
  features/
    notebook-management/  Notebook model, notebook screen, multi-step commands (03.01)
    page-management/      Page model, paper patterns (03.07)
    digital-canvas/       Items, eraser, page layers and editor (03.04)
    inking-tools/         Stroke outlines, colours and widths (03.06)
    rich-text-editor/     Sanitising, text layout for export (03.03)
    document-annotation/  PDF import (03.08)
    export-sharing/       Page rendering, PDF export, share (03.13)
    history-recovery/     Undo / redo (03.12)
    library/              Notebook library and trash
  services/               IndexedDB
  stores/                 Pure actions and the persistent store
tests/integration/        App-level tests (fake IndexedDB)
```

## Development

Requires Node 20+ and pnpm 9.

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Deploy to Firebase Hosting site `olaa-takenote` (create it once with
`npx firebase-tools hosting:sites:create olaa-takenote`):

```bash
pnpm build && npx firebase-tools deploy --only hosting
```

## Libraries

| Library | Use | Licence |
|---|---|---|
| pdfjs-dist | Render PDF pages on import | Apache-2.0 |
| pdf-lib | Build exported PDFs | MIT |
| perfect-freehand | Pressure-sensitive stroke outlines | MIT |

## Security

See `SECURITY.md` and `docs/security/SECURITY_BASELINE.md`. Text box HTML is sanitised to
b, i, h2, ul, ol, li, p and br with no attributes before it is stored or shown.
