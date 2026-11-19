# Local-first & Sync Strategy

## Status
Local storage implemented for the MVP (IndexedDB, see ADR-001). **Sync design still pending** —
no sync behavior should be assumed.

## Decisions required
- Which features work offline?
- Local storage technology and schema.
- Sync direction and scheduling.
- Conflict resolution rules.
- Retry, backoff, idempotency.
- Account switching and shared-device behavior.
- Export, deletion, and recovery.
- Encryption and sensitive content handling.

Define product-specific behavior and test offline transitions before implementation.
