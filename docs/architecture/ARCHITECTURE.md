# Architecture

## Status
Draft — foundation only; no implementation is implied.

## Principles
- Independent build, test, deployment, and release.
- Domain-owned modules; no feature-to-feature internal coupling.
- Typed contracts for API and cross-product integration.
- Secure by default, accessible, observable, testable.
- Local/offline behavior and sync semantics are explicitly designed, not assumed.

## System context
Describe actors, app boundaries, external systems, and Olaa shared-platform responsibilities.

## Application layers
Presentation → Feature/Application logic → Domain → Infrastructure adapters.

## Module boundaries
See `MODULES.md`.

## Data and persistence
See `docs/data/DATA_OWNERSHIP.md`. No production schema or migration is defined yet.

## API and integrations
See `docs/api/API_CONTRACTS.md`. Integrations must be optional where possible and failure-isolated.

## Security
See `docs/security/SECURITY_BASELINE.md`.

## Deployment and environments
See `docs/operations/ENVIRONMENTS.md`.

## Decisions
Architecture changes require ADRs in `docs/decisions/`.
