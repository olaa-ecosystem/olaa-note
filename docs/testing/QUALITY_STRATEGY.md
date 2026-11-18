# Quality Strategy

## Test layers
- Unit: domain logic and utilities.
- Integration: module/service boundaries, API adapters, persistence.
- Component: UI behavior and accessibility.
- E2E: critical user journeys.

## Quality gates
- No knowingly failing tests merged.
- Typecheck and lint pass.
- Critical flows have automated tests.
- Accessibility reviewed for interactive UI.
- Regression checks required for migrations.

## Test data
Use synthetic fixtures. Never commit real user data.
