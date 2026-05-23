export function newId(prefix: string): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `${prefix}-${uuid}`;
}
