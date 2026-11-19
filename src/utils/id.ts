export function newId(prefix = ''): string {
  const c = globalThis.crypto as Crypto | undefined;
  const raw =
    c && typeof c.randomUUID === 'function'
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return prefix + raw;
}
