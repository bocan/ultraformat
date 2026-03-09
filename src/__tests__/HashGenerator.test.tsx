import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HashGenerator from '../pages/HashGenerator';

// Mock crypto.subtle for SHA hashes in jsdom
const mockDigest = vi.fn(async (algo: string, data: ArrayBuffer) => {
  // Return deterministic fake hashes based on algorithm
  const len = algo === 'SHA-512' ? 64 : algo === 'SHA-256' ? 32 : 20;
  const view = new Uint8Array(data as ArrayBuffer);
  const buf = new ArrayBuffer(len);
  const out = new Uint8Array(buf);
  // Simple deterministic fill from input
  for (let i = 0; i < len; i++) {
    out[i] = (view[i % view.length] ?? 0) ^ (i * 7);
  }
  return buf;
});

Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: { digest: mockDigest },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
  },
  writable: true,
});

describe('HashGenerator', () => {
  it('renders input area', () => {
    render(<HashGenerator />);
    expect(screen.getByLabelText(/text to hash/i)).toBeInTheDocument();
  });

  it('renders all algorithm cards', () => {
    render(<HashGenerator />);
    expect(screen.getByText('MD5')).toBeInTheDocument();
    expect(screen.getByText('SHA-1')).toBeInTheDocument();
    expect(screen.getByText('SHA-256')).toBeInTheDocument();
    expect(screen.getByText('SHA-512')).toBeInTheDocument();
  });

  it('computes hashes when text is entered', async () => {
    const user = userEvent.setup();
    render(<HashGenerator />);
    await user.type(screen.getByLabelText(/text to hash/i), 'hello');
    await waitFor(() => {
      const md5Card = screen.getByLabelText('MD5 hash value');
      expect(md5Card.textContent).not.toBe('—');
    });
  });

  it('shows empty state when input is cleared', async () => {
    const user = userEvent.setup();
    render(<HashGenerator />);
    await user.type(screen.getByLabelText(/text to hash/i), 'test');
    await user.click(screen.getByRole('button', { name: /clear/i }));
    await waitFor(() => {
      const md5Card = screen.getByLabelText('MD5 hash value');
      expect(md5Card.textContent).toBe('—');
    });
  });

  it('MD5 produces a 32-char hex string', async () => {
    const user = userEvent.setup();
    render(<HashGenerator />);
    await user.type(screen.getByLabelText(/text to hash/i), 'test');
    await waitFor(() => {
      const md5Card = screen.getByLabelText('MD5 hash value');
      expect(md5Card.textContent).toMatch(/^[0-9a-f]{32}$/);
    });
  });
});
