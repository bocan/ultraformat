import { useMemo, useRef, useState } from 'react';
import {
  checkLinks,
  extractLinks,
  normalizePageUrl,
  type ExtractedLink,
  type LinkCheckResult,
  type SkippedLink,
} from '../lib/linkChecker';
import './LinkChecker.css';

type Mode = 'fetch' | 'paste';
type Phase = 'idle' | 'working' | 'done';
type Filter = 'all' | 'ok' | 'redirect' | 'broken' | 'unknown';

const KIND_LABEL: Record<string, string> = {
  ok: 'OK',
  redirect: 'Redirect',
  'client-error': 'Client Error',
  'server-error': 'Server Error',
  unknown: 'Unknown',
  unreachable: 'Unreachable',
};

const BROKEN_KINDS = ['client-error', 'server-error', 'unreachable'];

function matchesFilter(result: LinkCheckResult | null, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (!result) return false;
  if (filter === 'broken') return BROKEN_KINDS.includes(result.kind);
  return result.kind === filter;
}

export default function LinkChecker() {
  const [mode, setMode] = useState<Mode>('fetch');
  const [pageUrl, setPageUrl] = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [pageError, setPageError] = useState('');
  const [links, setLinks] = useState<ExtractedLink[]>([]);
  const [skipped, setSkipped] = useState<SkippedLink[]>([]);
  const [results, setResults] = useState<(LinkCheckResult | null)[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const counts = useMemo(() => {
    const c = { ok: 0, redirect: 0, broken: 0, unknown: 0, pending: 0 };
    for (const r of results) {
      if (!r) c.pending += 1;
      else if (r.kind === 'ok') c.ok += 1;
      else if (r.kind === 'redirect') c.redirect += 1;
      else if (r.kind === 'unknown') c.unknown += 1;
      else c.broken += 1;
    }
    return c;
  }, [results]);

  const handleCheck = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPageError('');
    setFilter('all');
    setLinks([]);
    setSkipped([]);
    setResults([]);
    setPhase('working');

    let html: string;
    let base: string | undefined;
    try {
      if (mode === 'fetch') {
        base = normalizePageUrl(pageUrl);
        const res = await fetch(base, { signal: controller.signal });
        if (!res.ok) throw new Error(`The page itself returned HTTP ${res.status}`);
        html = await res.text();
      } else {
        if (!pastedHtml.trim()) throw new Error('Paste some HTML to scan');
        base = baseUrl.trim() ? normalizePageUrl(baseUrl) : undefined;
        html = pastedHtml;
      }
    } catch (e) {
      let message = e instanceof Error ? e.message : 'Could not fetch the page';
      if (e instanceof TypeError) {
        message =
          'Could not fetch that page from the browser. The site probably does not allow ' +
          'cross-origin requests (CORS). Try the Paste HTML tab instead: view the page source, ' +
          'copy it, and paste it here.';
      }
      setPageError(message);
      setPhase('idle');
      return;
    }

    const extracted = extractLinks(html, base);
    setLinks(extracted.links);
    setSkipped(extracted.skipped);
    setResults(new Array<LinkCheckResult | null>(extracted.links.length).fill(null));

    await checkLinks(
      extracted.links.map((l) => l.url),
      {
        signal: controller.signal,
        onResult: (index, result) =>
          setResults((prev) => {
            const updated = prev.slice();
            updated[index] = result;
            return updated;
          }),
      },
    );
    setPhase('done');
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleCopy = async () => {
    const lines = links.map((link, i) => {
      const r = results[i];
      const status = r
        ? (r.status ?? `${KIND_LABEL[r.kind].toUpperCase()} (${r.detail ?? ''})`)
        : 'PENDING';
      return `${status}\t${link.url}`;
    });
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const visible = links
    .map((link, index) => ({ link, index, result: results[index] }))
    .filter(({ result }) => matchesFilter(result, filter));

  const working = phase === 'working';
  const checking = working && links.length > 0;
  const done = counts.ok + counts.redirect + counts.broken + counts.blocked;

  return (
    <div className="linkcheck-tool" role="region" aria-label="Link Checker">
      {/* Toolbar */}
      <div className="linkcheck-toolbar" role="toolbar" aria-label="Link Checker controls">
        <div className="linkcheck-toolbar__tabs" role="tablist">
          <button
            className={`linkcheck-toolbar__tab ${mode === 'fetch' ? 'linkcheck-toolbar__tab--active' : ''}`}
            role="tab"
            aria-selected={mode === 'fetch'}
            onClick={() => setMode('fetch')}
          >
            Fetch URL
          </button>
          <button
            className={`linkcheck-toolbar__tab ${mode === 'paste' ? 'linkcheck-toolbar__tab--active' : ''}`}
            role="tab"
            aria-selected={mode === 'paste'}
            onClick={() => setMode('paste')}
          >
            Paste HTML
          </button>
        </div>

        <div className="linkcheck-toolbar__controls">
          {working ? (
            <button className="linkcheck-toolbar__btn" onClick={handleCancel}>
              Cancel
            </button>
          ) : (
            <button
              className="linkcheck-toolbar__btn linkcheck-toolbar__btn--primary"
              onClick={handleCheck}
            >
              Check Links
            </button>
          )}
          <button
            className={`linkcheck-toolbar__btn ${copied ? 'linkcheck-toolbar__btn--done' : ''}`}
            onClick={handleCopy}
            disabled={!links.length}
            title="Copy results as text"
          >
            {copied ? '✓ Copied' : 'Copy Report'}
          </button>
        </div>
      </div>

      {/* Input */}
      {mode === 'fetch' ? (
        <input
          className="linkcheck-input"
          type="text"
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !working) handleCheck();
          }}
          placeholder="https://example.com/page-to-check"
          spellCheck={false}
          aria-label="Page URL to check"
        />
      ) : (
        <div className="linkcheck-paste">
          <input
            className="linkcheck-input"
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Base URL for resolving relative links (optional)"
            spellCheck={false}
            aria-label="Base URL for relative links"
          />
          <textarea
            className="linkcheck-paste__editor"
            value={pastedHtml}
            onChange={(e) => setPastedHtml(e.target.value)}
            placeholder="Paste the page's HTML source here…"
            spellCheck={false}
            aria-label="HTML source to scan"
          />
        </div>
      )}

      {/* CORS note */}
      <p className="linkcheck-note">
        Checks run directly from your browser, so nothing is sent anywhere except to the links
        themselves. The trade-off: sites that don't allow cross-origin requests (CORS) hide
        their status code, and show as <strong>Unknown</strong>: the server answered, but the
        browser won't say with what. <strong>Unreachable</strong> means nothing answered at
        all, so the link really is dead. To get exact status codes from a server you control,
        send an <code>Access-Control-Allow-Origin</code> header.
      </p>

      {/* Error */}
      {pageError && (
        <div className="linkcheck-error" role="alert" aria-live="assertive">
          <span className="linkcheck-error__icon" aria-hidden="true">✕</span>
          {pageError}
        </div>
      )}

      {/* Summary */}
      {links.length > 0 && (
        <div className="linkcheck-summary" role="group" aria-label="Result filters">
          <button
            className={`linkcheck-chip ${filter === 'all' ? 'linkcheck-chip--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All <strong>{links.length}</strong>
          </button>
          <button
            className={`linkcheck-chip linkcheck-chip--ok ${filter === 'ok' ? 'linkcheck-chip--active' : ''}`}
            onClick={() => setFilter('ok')}
          >
            OK <strong>{counts.ok}</strong>
          </button>
          <button
            className={`linkcheck-chip linkcheck-chip--redirect ${filter === 'redirect' ? 'linkcheck-chip--active' : ''}`}
            onClick={() => setFilter('redirect')}
          >
            Redirects <strong>{counts.redirect}</strong>
          </button>
          <button
            className={`linkcheck-chip linkcheck-chip--broken ${filter === 'broken' ? 'linkcheck-chip--active' : ''}`}
            onClick={() => setFilter('broken')}
          >
            Broken <strong>{counts.broken}</strong>
          </button>
          <button
            className={`linkcheck-chip linkcheck-chip--unknown ${filter === 'unknown' ? 'linkcheck-chip--active' : ''}`}
            onClick={() => setFilter('unknown')}
          >
            Unknown <strong>{counts.unknown}</strong>
          </button>
          <span className="linkcheck-summary__progress" aria-live="polite">
            {checking
              ? `Checking ${done} / ${links.length}…`
              : phase === 'done'
                ? `Checked ${links.length} link${links.length === 1 ? '' : 's'}`
                : ''}
          </span>
        </div>
      )}

      {/* Results */}
      <div className="linkcheck-results">
        {links.length > 0 ? (
          <table className="linkcheck-table" aria-label="Link check results">
            <thead>
              <tr>
                <th className="linkcheck-table__status-col">Status</th>
                <th>URL</th>
                <th>Link Text</th>
                <th>Notes</th>
                <th className="linkcheck-table__time-col">Time</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ link, result }) => (
                <tr key={link.url}>
                  <td>
                    {result ? (
                      <span
                        className={`linkcheck-badge linkcheck-badge--${result.kind}`}
                        title={result.detail ?? KIND_LABEL[result.kind]}
                      >
                        {result.status ?? (result.kind === 'unknown' ? '?' : 'ERR')}
                        <span className="linkcheck-badge__label">
                          {KIND_LABEL[result.kind]}
                        </span>
                      </span>
                    ) : (
                      <span className="linkcheck-badge linkcheck-badge--pending">…</span>
                    )}
                  </td>
                  <td className="linkcheck-table__url">
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.url}
                    </a>
                  </td>
                  <td className="linkcheck-table__text">{link.text}</td>
                  <td className="linkcheck-table__tags">
                    <span className="linkcheck-tag">
                      {link.internal ? 'internal' : 'external'}
                    </span>
                    {link.count > 1 && (
                      <span className="linkcheck-tag">x{link.count}</span>
                    )}
                    {link.insecure && (
                      <span className="linkcheck-tag linkcheck-tag--warn">http on https page</span>
                    )}
                    {result?.redirected && (
                      <span className="linkcheck-tag linkcheck-tag--warn">redirected</span>
                    )}
                  </td>
                  <td className="linkcheck-table__time">
                    {result ? `${result.durationMs} ms` : ''}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td className="linkcheck-table__empty" colSpan={5}>
                    No links match this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="linkcheck-empty">
            {working
              ? 'Fetching page…'
              : phase === 'done'
                ? 'No checkable links found on that page'
                : 'Results will appear here…'}
          </div>
        )}
      </div>

      {/* Skipped */}
      {skipped.length > 0 && (
        <details className="linkcheck-skipped">
          <summary>
            {skipped.length} link{skipped.length === 1 ? '' : 's'} skipped (not checkable over
            http)
          </summary>
          <ul>
            {skipped.map((s, i) => (
              <li key={i}>
                <span className="linkcheck-skipped__href">{s.href}</span>
                <span className="linkcheck-skipped__reason">{s.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
