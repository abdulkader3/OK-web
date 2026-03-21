export function generateIdempotencyKey(): string {
  return `idem-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export default generateIdempotencyKey;
