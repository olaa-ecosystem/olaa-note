# Security Baseline

## Identity and access
- Integrate through approved Olaa Identity (`olaa-platform`, branch 00.03) flows.
- Enforce authorization server-side.
- Use least privilege and short-lived tokens where possible.

## Secrets
- Keep secrets out of Git, logs, issues, screenshots and client bundles.
- Use platform secret storage for CI/deployment.
- `.env.example` contains names/placeholders only.

## Application security
- Validate input at boundaries.
- Protect against XSS, CSRF as applicable, injection, insecure direct object references, and unsafe file handling.
- Apply secure headers and transport security in production.
- Review dependencies and lockfiles.

## Privacy
- Minimize collected data.
- Define retention, export, and deletion requirements.
- Avoid sensitive data in analytics and logs.

## Incident readiness
Define contact, triage, severity, response process and disclosure policy before production.
