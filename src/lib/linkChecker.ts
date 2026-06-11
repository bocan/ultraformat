export type StatusKind =
  | 'ok'
  | 'redirect'
  | 'client-error'
  | 'server-error'
  | 'blocked';

export interface ExtractedLink {
  /** Absolute URL with any fragment stripped */
  url: string;
  /** Text of the first anchor pointing at this URL */
  text: string;
  /** How many times this URL appears on the page */
  count: number;
  /** Same origin as the page being checked */
  internal: boolean;
  /** Plain-http link found on an https page */
  insecure: boolean;
}

export interface SkippedLink {
  href: string;
  reason: string;
}

export interface LinkCheckResult {
  status: number | null;
  kind: StatusKind;
  redirected: boolean;
  durationMs: number;
  detail?: string;
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal; redirect?: RequestRedirect },
) => Promise<{ status: number; redirected: boolean }>;

/** Trim, add https:// when no scheme is given, and validate. Throws on garbage. */
export function normalizePageUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) throw new Error('Enter a URL to check');
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  const url = new URL(trimmed);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Only http(s) pages can be checked, not ${url.protocol}`);
  }
  return url.href;
}

const SKIP_SCHEMES: Record<string, string> = {
  'javascript:': 'JavaScript link',
  'data:': 'Data URI',
  'blob:': 'Blob URI',
  'about:': 'Browser-internal link',
  'mailto:': 'Email address',
  'tel:': 'Phone number',
};

/**
 * Pull every anchor out of an HTML document, resolve to absolute URLs,
 * dedupe, and separate out anything that is not checkable over http(s).
 * Without a baseUrl, relative links cannot be resolved and are skipped.
 */
export function extractLinks(
  html: string,
  baseUrl?: string,
): { links: ExtractedLink[]; skipped: SkippedLink[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const anchors = doc.querySelectorAll('a[href]');
  const byUrl = new Map<string, ExtractedLink>();
  const skipped: SkippedLink[] = [];
  const base = baseUrl ? new URL(baseUrl) : null;

  for (const a of anchors) {
    const href = (a.getAttribute('href') ?? '').trim();
    if (!href || href.startsWith('#')) continue;

    const schemeMatch = href.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
    const scheme = schemeMatch?.[0].toLowerCase();
    if (scheme && SKIP_SCHEMES[scheme]) {
      skipped.push({ href, reason: SKIP_SCHEMES[scheme] });
      continue;
    }

    let resolved: URL;
    try {
      resolved = base ? new URL(href, base) : new URL(href);
    } catch {
      skipped.push({
        href,
        reason: base ? 'Invalid URL' : 'Relative link (no base URL given)',
      });
      continue;
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      skipped.push({ href, reason: `Unsupported scheme (${resolved.protocol})` });
      continue;
    }

    resolved.hash = '';
    const url = resolved.href;
    const existing = byUrl.get(url);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byUrl.set(url, {
      url,
      text: a.textContent?.trim().replace(/\s+/g, ' ') || '(no text)',
      count: 1,
      internal: base ? resolved.origin === base.origin : false,
      insecure: base?.protocol === 'https:' && resolved.protocol === 'http:',
    });
  }

  return { links: [...byUrl.values()], skipped };
}

export function classifyStatus(status: number): StatusKind {
  if (status >= 200 && status < 300) return 'ok';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  if (status >= 500) return 'server-error';
  return 'blocked';
}

export interface CheckOptions {
  fetchFn?: FetchLike;
  timeoutMs?: number;
  concurrency?: number;
  signal?: AbortSignal;
  onResult?: (index: number, result: LinkCheckResult) => void;
}

export async function checkLink(
  url: string,
  { fetchFn, timeoutMs = 10000, signal }: CheckOptions = {},
): Promise<LinkCheckResult> {
  const doFetch: FetchLike = fetchFn ?? ((u, init) => fetch(u, init));
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener('abort', onOuterAbort, { once: true });

  const started = performance.now();
  try {
    const res = await doFetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    });
    const durationMs = Math.round(performance.now() - started);
    // Headers are all we need; stop the body download.
    controller.abort();
    return {
      status: res.status,
      kind: classifyStatus(res.status),
      redirected: res.redirected,
      durationMs,
    };
  } catch {
    const durationMs = Math.round(performance.now() - started);
    let detail = 'CORS policy or network error';
    if (timedOut) detail = `Timed out after ${timeoutMs / 1000}s`;
    else if (signal?.aborted) detail = 'Cancelled';
    return { status: null, kind: 'blocked', redirected: false, durationMs, detail };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

/** Check a list of URLs with a small worker pool, reporting each result as it lands. */
export async function checkLinks(
  urls: string[],
  options: CheckOptions = {},
): Promise<LinkCheckResult[]> {
  const { concurrency = 6, onResult } = options;
  const results: LinkCheckResult[] = new Array(urls.length);
  let next = 0;

  async function worker() {
    while (next < urls.length) {
      const index = next++;
      const result = await checkLink(urls[index], options);
      results[index] = result;
      onResult?.(index, result);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, worker),
  );
  return results;
}
