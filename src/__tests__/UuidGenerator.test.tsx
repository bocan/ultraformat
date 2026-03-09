import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UuidGenerator from '../pages/UuidGenerator';

// Ensure crypto.getRandomValues is available
if (!globalThis.crypto?.getRandomValues) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
    },
    writable: true,
  });
}

describe('UuidGenerator', () => {
  it('renders generate button', () => {
    render(<UuidGenerator />);
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('renders count input', () => {
    render(<UuidGenerator />);
    expect(screen.getByLabelText(/number of uuids/i)).toBeInTheDocument();
  });

  it('shows empty state initially', () => {
    render(<UuidGenerator />);
    expect(screen.getByText(/click generate/i)).toBeInTheDocument();
  });

  it('generates UUIDs on click', async () => {
    const user = userEvent.setup();
    render(<UuidGenerator />);
    await user.click(screen.getByRole('button', { name: /generate/i }));
    // Default count is 5
    const items = screen.getAllByRole('button', { name: /copy uuid/i });
    expect(items.length).toBe(5);
  });

  it('generates correct number of UUIDs', async () => {
    const user = userEvent.setup();
    render(<UuidGenerator />);
    const input = screen.getByLabelText(/number of uuids/i);
    fireEvent.change(input, { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: /generate/i }));
    const items = screen.getAllByRole('button', { name: /copy uuid/i });
    expect(items.length).toBe(3);
  });

  it('generates valid v4 UUID format', async () => {
    const user = userEvent.setup();
    render(<UuidGenerator />);
    const input = screen.getByLabelText(/number of uuids/i);
    fireEvent.change(input, { target: { value: '1' } });
    await user.click(screen.getByRole('button', { name: /generate/i }));
    const codeEl = document.querySelector('.uuid-output__value');
    expect(codeEl?.textContent).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('clears UUIDs', async () => {
    const user = userEvent.setup();
    render(<UuidGenerator />);
    await user.click(screen.getByRole('button', { name: /generate/i }));
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByText(/click generate/i)).toBeInTheDocument();
  });

  it('uppercase option works', async () => {
    const user = userEvent.setup();
    render(<UuidGenerator />);
    await user.click(screen.getByLabelText(/uppercase/i));
    const input = screen.getByLabelText(/number of uuids/i);
    fireEvent.change(input, { target: { value: '1' } });
    await user.click(screen.getByRole('button', { name: /generate/i }));
    const codeEl = document.querySelector('.uuid-output__value');
    expect(codeEl?.textContent).toMatch(/^[0-9A-F-]+$/);
  });
});
