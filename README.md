# OLAA Note

Independent note-taking and knowledge workspace

## Product scope
- **In scope:** Notebooks, pages, rich-text notes, freeform canvas, handwriting support, PDF/image attachments and annotation, tags, search and sync.
- **Out of scope:** Curriculum engine, language assessment engine, general-purpose habit tracking.

## Repository status
MVP — a local-first web app (works offline, data stored in the browser's IndexedDB):

- **Ghi chú (rich-text notes):** headings, bold/italic/underline/strike, highlight, bullet/numbered
  lists, checklists, quotes, sanitised paste, auto-title from first line.
- **Sổ tay viết tay (handwriting notebooks):** cover colours, paper styles (lined/grid/dotted/blank),
  pen with pressure (Apple Pencil / stylus), highlighter, stroke eraser, colours and widths, images
  (move/resize/delete), per-page undo/redo, add/duplicate/reorder/delete pages, page thumbnails,
  zoom, "pen only" palm rejection, PNG export per page.
- **Library:** pin, tags, accent-insensitive search (`#tag` filter), trash with restore, JSON
  backup export/import, light/dark mode, desktop and iPad layouts.

Not yet implemented: cloud sync, OLAA ID login, PDF import/annotation, shapes/lasso, text boxes on
handwriting pages. See `docs/decisions/ADR-001-mvp-stack-and-local-first-storage.md`.

## Start here
1. Read `docs/product/SCOPE.md`.
2. Read `docs/architecture/ARCHITECTURE.md` and `TECH_STACK.md`.
3. Review `docs/engineering/AI_AGENT_RULES.md` before using an AI coding agent.
4. Review the roadmap and requirements register.

## Development setup
Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + integration tests (Vitest)
npm run typecheck
npm run build      # static output in dist/ (deployable to any static host)
```

Keyboard shortcuts in a notebook: `P` pen, `H` highlighter, `E` eraser, `V` select image,
`Ctrl/⌘+Z` undo, `Ctrl/⌘+Shift+Z` or `Ctrl+Y` redo, `←/→` previous/next page.

## Security
See `SECURITY.md` and `docs/security/SECURITY_BASELINE.md`.

## Contributing
See `CONTRIBUTING.md`.
