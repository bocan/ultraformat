import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimestampConverter from '../pages/TimestampConverter';

describe('TimestampConverter', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-03-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the live clock', () => {
    render(<TimestampConverter />);
    expect(screen.getByLabelText(/current unix timestamp/i)).toBeInTheDocument();
  });

  it('renders timestamp input', () => {
    render(<TimestampConverter />);
    expect(screen.getByLabelText(/timestamp or date input/i)).toBeInTheDocument();
  });

  it('shows empty state when no input', () => {
    render(<TimestampConverter />);
    expect(screen.getByText(/enter a timestamp or date above/i)).toBeInTheDocument();
  });

  it('converts unix timestamp (seconds)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimestampConverter />);
    await user.type(screen.getByLabelText(/timestamp or date input/i), '1000000000');
    expect(screen.getByText('ISO 8601')).toBeInTheDocument();
    expect(screen.getByText('2001-09-09T01:46:40.000Z')).toBeInTheDocument();
  });

  it('converts ISO date string', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimestampConverter />);
    await user.type(screen.getByLabelText(/timestamp or date input/i), '2024-01-01T00:00:00Z');
    expect(screen.getByText('1704067200')).toBeInTheDocument();
  });

  it('shows error for invalid input', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimestampConverter />);
    await user.type(screen.getByLabelText(/timestamp or date input/i), 'not-a-date');
    expect(screen.getByText(/could not parse/i)).toBeInTheDocument();
  });

  it('fills current timestamp on Now click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimestampConverter />);
    await user.click(screen.getByRole('button', { name: /now/i }));
    const input = screen.getByLabelText(/timestamp or date input/i) as HTMLInputElement;
    expect(input.value).toMatch(/^\d{10}$/);
  });

  it('clears input', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimestampConverter />);
    await user.type(screen.getByLabelText(/timestamp or date input/i), '1000000000');
    await user.click(screen.getByRole('button', { name: /clear/i }));
    const input = screen.getByLabelText(/timestamp or date input/i) as HTMLInputElement;
    expect(input.value).toBe('');
  });
});
