# Product Scope — Olaa TakeNote

## Purpose
Independent note-taking and knowledge workspace

## In scope
Notebooks, pages, rich-text notes, freeform canvas, handwriting support, PDF/image attachments and annotation, tags, search and sync.

## Out of scope
Curriculum engine, language assessment engine, general-purpose habit tracking.

## Integrations
- Olaa Identity (`olaa-platform`, branch 00.03): shared authentication (contract pending).
- Olaa Platform (`olaa-platform`): shared platform services (contracts pending).
- Other Olaa products: optional integrations only through approved contracts.

## Boundary rule
This repository owns its product domain. Other products must not directly modify its data or import its internal implementation.

## Scope change process
Changes to scope must be reviewed and documented before implementation.
