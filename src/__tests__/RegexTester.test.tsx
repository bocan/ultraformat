import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegexTester from '../pages/RegexTester';

describe('RegexTester', () => {
  it('renders pattern input and test string', () => {
    render(<RegexTester />);
    expect(screen.getByRole('textbox', { name: /regex pattern/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /test string/i })).toBeInTheDocument();
  });

  it('renders all flag buttons', () => {
    render(<RegexTester />);
    for (const f of ['g', 'i', 'm', 's', 'u']) {
      expect(screen.getByRole('button', { name: f })).toBeInTheDocument();
    }
  });

  it('toggles flag on click', async () => {
    const user = userEvent.setup();
    render(<RegexTester />);
    const mBtn = screen.getByRole('button', { name: 'm' });
    expect(mBtn).toHaveAttribute('aria-pressed', 'false');
    await user.click(mBtn);
    expect(mBtn).toHaveAttribute('aria-pressed', 'true');
    await user.click(mBtn);
    expect(mBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('finds matches and displays count', async () => {
    const user = userEvent.setup();
    render(<RegexTester />);
    await user.type(screen.getByRole('textbox', { name: /regex pattern/i }), '\\d+');
    await user.type(screen.getByRole('textbox', { name: /test string/i }), 'abc 123 def 456');
    expect(screen.getAllByText('2 matches').length).toBeGreaterThan(0);
  });

  it('displays individual match items', async () => {
    const user = userEvent.setup();
    render(<RegexTester />);
    await user.type(screen.getByRole('textbox', { name: /regex pattern/i }), 'hello');
    await user.type(screen.getByRole('textbox', { name: /test string/i }), 'hello world hello');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });

  it('shows error for invalid regex', async () => {
    const user = userEvent.setup();
    render(<RegexTester />);
    await user.type(screen.getByRole('textbox', { name: /regex pattern/i }), '(unclosed');
    await user.type(screen.getByRole('textbox', { name: /test string/i }), 'test');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows "No matches" when pattern matches nothing', async () => {
    const user = userEvent.setup();
    render(<RegexTester />);
    await user.type(screen.getByRole('textbox', { name: /regex pattern/i }), 'zzz');
    await user.type(screen.getByRole('textbox', { name: /test string/i }), 'hello world');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('has ARIA region role', () => {
    render(<RegexTester />);
    expect(screen.getByRole('region', { name: /regex tester/i })).toBeInTheDocument();
  });
});
