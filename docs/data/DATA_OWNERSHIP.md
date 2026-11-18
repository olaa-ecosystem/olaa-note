# Data Ownership

## Principle
Each product owns its domain data. Other apps must not directly mutate another product’s storage. Shared infrastructure does not imply shared table ownership.

## Domain owner
- This repository: product-specific domain records (to be inventoried).
- Olaa Identity (`olaa-platform`, branch 00.03): identity/account records (external contract).
- Shared platform: sync metadata, cross-product events and platform services, as defined by contracts.

## Data inventory (to be completed before schema work)
Record entity, owner, sensitivity, retention, export, deletion, backup, migration, and access policy.

## Migration rules
Preserve existing identifiers where migrating data. Validate row/item counts and reconcile before cutover. Define rollback before migration.
