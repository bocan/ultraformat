import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeBeautify from '../pages/CodeBeautify';

// Mock the beautify lib so we avoid Prettier overhead and debounce complexity
vi.mock('../lib/beautify', () => ({
  LANGUAGES: [
    { id: 'html', label: 'HTML', parser: 'html' },
    { id: 'css', label: 'CSS', parser: 'css' },
    { id: 'javascript', label: 'JavaScript', parser: 'babel' },
    { id: 'typescript', label: 'TypeScript', parser: 'typescript' },
    { id: 'yaml', label: 'YAML', parser: 'yaml' },
    { id: 'sql', label: 'SQL', parser: '__sql' },
    { id: 'xml', label: 'XML', parser: 'html' },
  ],
  detectLanguage: vi.fn(() => 'javascript'),
  beautifyCode: vi.fn(async (code: string) => `formatted:${code}`),
  minifyCode: vi.fn((code: string) => `minified:${code}`),
}));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

describe('CodeBeautify', () => {
  it('renders beautify and minify tabs', () => {
    render(<CodeBeautify />);
    expect(screen.getByRole('tab', { name: /beautify/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /minify/i })).toBeInTheDocument();
  });

  it('renders input and output panes', () => {
    render(<CodeBeautify />);
    expect(screen.getByLabelText(/code input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/formatted output/i)).toBeInTheDocument();
  });

  it('renders language selector with all languages', () => {
    render(<CodeBeautify />);
    const select = screen.getByLabelText(/language/i);
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll('option')).toHaveLength(7);
  });

  it('renders indent selector in beautify mode', () => {
    render(<CodeBeautify />);
    expect(screen.getByLabelText(/indent size/i)).toBeInTheDocument();
  });

  it('marks beautify tab as active by default', () => {
    render(<CodeBeautify />);
    expect(screen.getByRole('tab', { name: /beautify/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /minify/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to minify mode', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CodeBeautify />);
    await user.click(screen.getByRole('tab', { name: /minify/i }));
    expect(screen.getByRole('tab', { name: /minify/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('clears input and output on clear', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CodeBeautify />);
    const input = screen.getByLabelText(/code input/i);
    await user.type(input, 'some code');
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(input).toHaveValue('');
  });

  it('has ARIA region and toolbar roles', () => {
    render(<CodeBeautify />);
    expect(screen.getByRole('region', { name: /code beautify/i })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: /beautify operations/i })).toBeInTheDocument();
  });
});
