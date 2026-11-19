# Changelog

All notable changes will be recorded here. Until the first release, this repository is in pre-development foundation stage.

## Unreleased
- Repository foundation initialized.
- MVP web app, PRD P0 (React + Vite + TypeScript, platform ADR-0003):
  - Notebooks with cover colour and paper; trash with 30-day restore.
  - Pages: blank / lined / grid / dots; add, duplicate, move, delete; thumbnails.
  - Typing and handwriting on one page: rich text boxes, pressure pen, highlighter, stroke eraser.
  - Pen-only drawing by default (palm rejection); optional finger drawing.
  - PDF import as writable pages; images and file attachments.
  - Export to PDF with share sheet or download.
  - IndexedDB autosave, undo / redo; GitHub Actions CI; Firebase Hosting config.
- Ecosystem PRD v1.0, TakeNote core (§8.2):
  - Search across notebook titles, typed text, attachment names and tags; accent-insensitive; highlights matches.
  - Page tags with filter, rename and merge.
  - Favorite and archive notebooks; move a page to another notebook.
  - Visible save state ("Đang lưu…", "Đã lưu trên máy", "Chưa lưu được").
  - Recovery of text typed but not yet saved when the tab closed.
  - Text boxes: checklists (tap to tick), quotes, code blocks and links (http/https/mailto only); exported to PDF.
