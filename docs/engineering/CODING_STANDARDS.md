# Coding Standards

- TypeScript strictness is intended; exact tsconfig is pending stack approval.
- Keep modules small and domain-focused.
- Avoid `any`; justify exceptions.
- Prefer explicit names and typed interfaces.
- Components should not own API transport or persistence logic.
- Handle loading, empty, error, offline, and success states.
- Do not hardcode secrets, endpoints, or environment-specific values.
- Document non-obvious decisions.
- Add tests for behavior, not implementation trivia.
