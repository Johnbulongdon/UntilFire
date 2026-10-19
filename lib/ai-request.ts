/** Bound bytes while streaming, including requests with no Content-Length. */
export class AIRequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readAIRequest(req: Request, maxBytes = 32_768): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get("content-length"));
  if (declared > maxBytes) throw new AIRequestError("Request is too large", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new AIRequestError("A JSON body is required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AIRequestError("Request is too large", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new AIRequestError("Invalid JSON"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AIRequestError("A JSON object is required");
  return body as Record<string, unknown>;
}

export function boundedText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new AIRequestError(`${name} must be 1–${max} characters`);
  }
  return value.trim();
}

export function classificationItems(value: unknown): { description: string; category: string }[] {
  if (!Array.isArray(value) || value.length > 50) throw new AIRequestError("items must be an array of at most 50 transactions");
  return value.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new AIRequestError("Invalid transaction");
    return {
      description: boundedText(item.description, "description", 300),
      category: boundedText(item.category, "category", 80),
    };
  });
}
