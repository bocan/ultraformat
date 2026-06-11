import { describe, it, expect, vi } from 'vitest';
import {
  normalizePageUrl,
  extractLinks,
  classifyStatus,
  checkLink,
  checkLinks,
  type FetchLike,
} from '../lib/linkChecker';

describe('normalizePageUrl', () => {
  it('adds https:// when no scheme is given', () => {
    expect(normalizePageUrl('example.com/page')).toBe('https://example.com/page');
  });

  it('keeps an explicit scheme', () => {
    expect(normalizePageUrl('http://example.com')).toBe('http://example.com/');
  });

  it('trims whitespace', () => {
    expect(normalizePageUrl('  example.com  ')).toBe('https://example.com/');
  });

  it('rejects empty input', () => {
    expect(() => normalizePageUrl('   ')).toThrow();
  });

  it('rejects non-http schemes', () => {
    expect(() => normalizePageUrl('ftp://example.com')).toThrow(/http/);
  });
});

describe('extractLinks', () => {
  const base = 'https://site.test/blog/post';

  it('resolves relative links against the base URL', () => {
    const { links } = extractLinks('<a href="/about">About</a>', base);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('https://site.test/about');
    expect(links[0].text).toBe('About');
    expect(links[0].internal).toBe(true);
  });

  it('marks cross-origin links as external', () => {
    const { links } = extractLinks('<a href="https://other.test/x">Other</a>', base);
    expect(links[0].internal).toBe(false);
  });

  it('dedupes repeated URLs and counts occurrences', () => {
    const html = '<a href="/a">One</a><a href="/a">Two</a><a href="/b">Three</a>';
    const { links } = extractLinks(html, base);
    expect(links).toHaveLength(2);
    expect(links[0].count).toBe(2);
    expect(links[0].text).toBe('One');
  });

  it('strips fragments before deduping', () => {
    const html = '<a href="/a#top">One</a><a href="/a#bottom">Two</a>';
    const { links } = extractLinks(html, base);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('https://site.test/a');
  });

  it('ignores fragment-only and empty hrefs', () => {
    const { links, skipped } = extractLinks('<a href="#top">Top</a><a href="">x</a>', base);
    expect(links).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });

  it('skips mailto, tel and javascript links with reasons', () => {
    const html =
      '<a href="mailto:a@b.c">Mail</a>' +
      '<a href="tel:+44123">Call</a>' +
      '<a href="javascript:void(0)">JS</a>';
    const { links, skipped } = extractLinks(html, base);
    expect(links).toHaveLength(0);
    expect(skipped).toHaveLength(3);
    expect(skipped[0].reason).toMatch(/email/i);
  });

  it('flags http links on an https page as insecure', () => {
    const { links } = extractLinks('<a href="http://site.test/old">Old</a>', base);
    expect(links[0].insecure).toBe(true);
  });

  it('skips relative links when no base URL is given', () => {
    const html = '<a href="/rel">Rel</a><a href="https://abs.test/">Abs</a>';
    const { links, skipped } = extractLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('https://abs.test/');
    expect(skipped[0].reason).toMatch(/relative/i);
  });

  it('uses a placeholder for anchors with no text', () => {
    const { links } = extractLinks('<a href="/img"><img src="x.png"></a>', base);
    expect(links[0].text).toBe('(no text)');
  });
});

describe('classifyStatus', () => {
  it('classifies status ranges', () => {
    expect(classifyStatus(200)).toBe('ok');
    expect(classifyStatus(204)).toBe('ok');
    expect(classifyStatus(301)).toBe('redirect');
    expect(classifyStatus(404)).toBe('client-error');
    expect(classifyStatus(500)).toBe('server-error');
  });
});

describe('checkLink', () => {
  it('returns the status for a successful fetch', async () => {
    const fetchFn: FetchLike = async () => ({ status: 200, redirected: false });
    const result = await checkLink('https://a.test/', { fetchFn });
    expect(result.status).toBe(200);
    expect(result.kind).toBe('ok');
  });

  it('reports redirected responses', async () => {
    const fetchFn: FetchLike = async () => ({ status: 200, redirected: true });
    const result = await checkLink('https://a.test/', { fetchFn });
    expect(result.redirected).toBe(true);
  });

  it('classifies fetch failures as blocked', async () => {
    const fetchFn: FetchLike = async () => {
      throw new TypeError('Failed to fetch');
    };
    const result = await checkLink('https://a.test/', { fetchFn });
    expect(result.status).toBeNull();
    expect(result.kind).toBe('blocked');
    expect(result.detail).toMatch(/CORS/);
  });

  it('times out slow requests', async () => {
    const fetchFn: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    const result = await checkLink('https://slow.test/', { fetchFn, timeoutMs: 20 });
    expect(result.kind).toBe('blocked');
    expect(result.detail).toMatch(/timed out/i);
  });
});

describe('checkLinks', () => {
  it('checks every URL and preserves order', async () => {
    const statuses: Record<string, number> = {
      'https://a.test/': 200,
      'https://b.test/': 404,
      'https://c.test/': 503,
    };
    const fetchFn: FetchLike = async (url) => ({
      status: statuses[url],
      redirected: false,
    });
    const results = await checkLinks(Object.keys(statuses), { fetchFn });
    expect(results.map((r) => r.status)).toEqual([200, 404, 503]);
    expect(results.map((r) => r.kind)).toEqual(['ok', 'client-error', 'server-error']);
  });

  it('reports each result through onResult', async () => {
    const fetchFn: FetchLike = async () => ({ status: 200, redirected: false });
    const onResult = vi.fn();
    await checkLinks(['https://a.test/', 'https://b.test/'], { fetchFn, onResult });
    expect(onResult).toHaveBeenCalledTimes(2);
  });

  it('handles an empty list', async () => {
    const results = await checkLinks([], {});
    expect(results).toEqual([]);
  });
});
