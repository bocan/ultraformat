import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiffChecker from '../pages/DiffChecker';

describe('DiffChecker', () => {
  it('renders the view mode tabs', () => {
    render(<DiffChecker />);
    expect(screen.getByRole('tab', { name: /side by side/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /inline/i })).toBeInTheDocument();
  });

  it('renders both text input areas', () => {
    render(<DiffChecker />);
    expect(screen.getByLabelText(/original text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modified text/i)).toBeInTheDocument();
  });

  it('renders swap and clear buttons', () => {
    render(<DiffChecker />);
    expect(screen.getByRole('button', { name: /swap/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('shows diff output when texts differ', async () => {
    const user = userEvent.setup();
    render(<DiffChecker />);
    await user.type(screen.getByLabelText(/original text/i), 'hello');
    await user.type(screen.getByLabelText(/modified text/i), 'world');
    expect(screen.getByText('Differences')).toBeInTheDocument();
  });

  it('shows identical message when texts match', async () => {
    const user = userEvent.setup();
    render(<DiffChecker />);
    await user.type(screen.getByLabelText(/original text/i), 'same');
    await user.type(screen.getByLabelText(/modified text/i), 'same');
    expect(screen.getByText(/no differences found/i)).toBeInTheDocument();
  });

  it('clears both panes when clear is clicked', async () => {
    const user = userEvent.setup();
    render(<DiffChecker />);
    const orig = screen.getByLabelText(/original text/i);
    const mod = screen.getByLabelText(/modified text/i);
    await user.type(orig, 'text');
    await user.type(mod, 'text');
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(orig).toHaveValue('');
    expect(mod).toHaveValue('');
  });

  it('swaps the pane contents', async () => {
    const user = userEvent.setup();
    render(<DiffChecker />);
    const orig = screen.getByLabelText(/original text/i);
    const mod = screen.getByLabelText(/modified text/i);
    await user.type(orig, 'aaa');
    await user.type(mod, 'bbb');
    await user.click(screen.getByRole('button', { name: /swap/i }));
    expect(orig).toHaveValue('bbb');
    expect(mod).toHaveValue('aaa');
  });

  it('marks the active tab with aria-selected', async () => {
    const user = userEvent.setup();
    render(<DiffChecker />);
    const splitTab = screen.getByRole('tab', { name: /side by side/i });
    const inlineTab = screen.getByRole('tab', { name: /inline/i });

    expect(splitTab).toHaveAttribute('aria-selected', 'true');
    expect(inlineTab).toHaveAttribute('aria-selected', 'false');

    await user.click(inlineTab);
    expect(inlineTab).toHaveAttribute('aria-selected', 'true');
    expect(splitTab).toHaveAttribute('aria-selected', 'false');
  });
});
