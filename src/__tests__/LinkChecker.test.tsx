import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkChecker from '../pages/LinkChecker';

const pageHtml = `<html><body>
  <a href="https://site.test/good">Good link</a>
  <a href="https://site.test/missing">Missing link</a>
  <a href="https://walled.test/">Walled garden</a>
  <a href="mailto:hi@site.test">Email us</a>
</body></html>`;

function mockFetch(url: string): Promise<unknown> {
  switch (url) {
    case 'https://site.test/':
      return Promise.resolve({
        ok: true,
        status: 200,
        redirected: false,
        text: async () => pageHtml,
      });
    case 'https://site.test/good':
      return Promise.resolve({ ok: true, status: 200, redirected: false });
    case 'https://site.test/missing':
      return Promise.resolve({ ok: false, status: 404, redirected: false });
    default:
      return Promise.reject(new TypeError('Failed to fetch'));
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(mockFetch));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function runCheck(url: string) {
  const user = userEvent.setup();
  render(<LinkChecker />);
  await user.type(screen.getByLabelText(/page url to check/i), url);
  await user.click(screen.getByRole('button', { name: /check links/i }));
  return user;
}

describe('LinkChecker', () => {
  it('renders URL input and fetch/paste tabs', () => {
    render(<LinkChecker />);
    expect(screen.getByLabelText(/page url to check/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /fetch url/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /paste html/i })).toBeInTheDocument();
  });

  it('checks links and shows colour-coded status badges', async () => {
    await runCheck('site.test');
    expect(await screen.findByText('200')).toBeInTheDocument();
    expect(await screen.findByText('404')).toBeInTheDocument();
    expect(await screen.findByText('n/a')).toBeInTheDocument();
    expect(screen.getByText('200').closest('.linkcheck-badge')).toHaveClass(
      'linkcheck-badge--ok',
    );
    expect(screen.getByText('404').closest('.linkcheck-badge')).toHaveClass(
      'linkcheck-badge--client-error',
    );
    expect(screen.getByText('n/a').closest('.linkcheck-badge')).toHaveClass(
      'linkcheck-badge--blocked',
    );
  });

  it('shows summary counts after checking', async () => {
    await runCheck('site.test');
    await screen.findByText('404');
    const summary = screen.getByRole('group', { name: /result filters/i });
    expect(summary).toHaveTextContent('All 3');
    expect(summary).toHaveTextContent('OK 1');
    expect(summary).toHaveTextContent('Broken 1');
    expect(summary).toHaveTextContent('Blocked 1');
  });

  it('filters results by category', async () => {
    const user = await runCheck('site.test');
    await screen.findByText('404');
    await user.click(screen.getByRole('button', { name: /broken/i }));
    expect(screen.getByText('https://site.test/missing')).toBeInTheDocument();
    expect(screen.queryByText('https://site.test/good')).not.toBeInTheDocument();
  });

  it('lists skipped non-http links', async () => {
    await runCheck('site.test');
    await screen.findByText('404');
    expect(screen.getByText(/1 link skipped/i)).toBeInTheDocument();
    expect(screen.getByText('mailto:hi@site.test')).toBeInTheDocument();
  });

  it('shows a CORS explanation when the page itself cannot be fetched', async () => {
    await runCheck('walled.test');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/CORS/);
  });

  it('checks links from pasted HTML with a base URL', async () => {
    const user = userEvent.setup();
    render(<LinkChecker />);
    await user.click(screen.getByRole('tab', { name: /paste html/i }));
    await user.type(screen.getByLabelText(/base url/i), 'site.test');
    const editor = screen.getByLabelText(/html source to scan/i);
    await user.click(editor);
    await user.paste('<a href="/good">Good</a>');
    await user.click(screen.getByRole('button', { name: /check links/i }));
    expect(await screen.findByText('200')).toBeInTheDocument();
    expect(screen.getByText('https://site.test/good')).toBeInTheDocument();
  });

  it('shows an error when checking with no URL', async () => {
    const user = userEvent.setup();
    render(<LinkChecker />);
    await user.click(screen.getByRole('button', { name: /check links/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
