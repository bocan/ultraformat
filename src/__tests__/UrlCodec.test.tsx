import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UrlCodec from '../pages/UrlCodec';

describe('UrlCodec', () => {
  it('renders encode and decode tabs', () => {
    render(<UrlCodec />);
    expect(screen.getByRole('tab', { name: /encode/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /decode/i })).toBeInTheDocument();
  });

  it('renders input and output panes', () => {
    render(<UrlCodec />);
    expect(screen.getByLabelText(/plain text input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/encoded output/i)).toBeInTheDocument();
  });

  it('encodes text with special characters', async () => {
    const user = userEvent.setup();
    render(<UrlCodec />);
    await user.type(screen.getByLabelText(/plain text input/i), 'hello world&foo=bar');
    const output = screen.getByLabelText(/encoded output/i) as HTMLTextAreaElement;
    expect(output.value).toBe(encodeURIComponent('hello world&foo=bar'));
  });

  it('decodes encoded text', async () => {
    const user = userEvent.setup();
    render(<UrlCodec />);
    await user.click(screen.getByRole('tab', { name: /decode/i }));
    await user.type(screen.getByLabelText(/encoded url input/i), 'hello%20world');
    const output = screen.getByLabelText(/decoded output/i) as HTMLTextAreaElement;
    expect(output.value).toBe('hello world');
  });

  it('shows query parameters table', async () => {
    const user = userEvent.setup();
    render(<UrlCodec />);
    await user.type(
      screen.getByLabelText(/plain text input/i),
      'https://example.com?name=Chris&lang=ts'
    );
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Chris')).toBeInTheDocument();
    expect(screen.getByText('lang')).toBeInTheDocument();
    expect(screen.getByText('ts')).toBeInTheDocument();
  });

  it('shows scope selector', () => {
    render(<UrlCodec />);
    expect(screen.getByLabelText(/scope/i)).toBeInTheDocument();
  });

  it('shows error for invalid decode input', async () => {
    const user = userEvent.setup();
    render(<UrlCodec />);
    await user.click(screen.getByRole('tab', { name: /decode/i }));
    await user.type(screen.getByLabelText(/encoded url input/i), '%E0%A4%A');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has clear button', () => {
    render(<UrlCodec />);
    expect(screen.getByTitle(/clear input/i)).toBeInTheDocument();
  });
});
