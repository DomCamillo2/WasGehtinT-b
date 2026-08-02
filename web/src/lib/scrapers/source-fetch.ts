/**
 * Shared helpers for official venue scrapers — timeouts + transport failures
 * must throw so refresh can skip stale-deletes for that source.
 */

export class ExternalSourceFetchError extends Error {
  readonly source: string;

  constructor(source: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ExternalSourceFetchError";
    this.source = source;
  }
}

const DEFAULT_TIMEOUT_MS = 25_000;

export async function fetchSourceText(
  source: string,
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<string> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { timeoutMs: _ignored, ...requestInit } = init ?? {};
  void _ignored;

  let response: Response;
  try {
    response = await fetch(url, {
      ...requestInit,
      cache: requestInit.cache ?? "no-store",
      signal: requestInit.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ExternalSourceFetchError(
      source,
      `Network error fetching ${url}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new ExternalSourceFetchError(
      source,
      `HTTP ${response.status} ${response.statusText || ""} from ${url}`.trim(),
    );
  }

  try {
    return await response.text();
  } catch (error) {
    throw new ExternalSourceFetchError(
      source,
      `Failed reading body from ${url}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
