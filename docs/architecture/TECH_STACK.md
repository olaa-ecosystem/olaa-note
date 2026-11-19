# Technology Stack

## MVP implementation
See `docs/decisions/ADR-001-mvp-stack-and-local-first-storage.md` for what the MVP actually uses
(React 18 + Vite 5 + TypeScript, plain CSS, IndexedDB, Vitest, npm). That ADR is pending approval.

## Proposed, not yet approved
- TypeScript
- React + Vite
- Tailwind CSS (decision pending design-system needs)
- pnpm
- Vitest + React Testing Library
- Playwright E2E
- ESLint + Prettier
- GitHub Actions

## Must be decided before application scaffold
- React version and runtime baseline
- Router
- State management strategy
- UI primitives and design tokens
- API client generation approach
- Authentication SDK / OLAA ID integration
- Local persistence and sync approach
- Deployment provider

Do not install dependencies until decisions are recorded and approved.
