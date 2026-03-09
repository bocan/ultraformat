import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoremGenerator from '../pages/LoremGenerator';

describe('LoremGenerator', () => {
  it('renders style tabs', () => {
    render(<LoremGenerator />);
    expect(screen.getByRole('tab', { name: /classic/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /hipster/i })).toBeInTheDocument();
  });

  it('renders unit selector and count input', () => {
    render(<LoremGenerator />);
    expect(screen.getByLabelText(/text unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/count/i)).toBeInTheDocument();
  });

  it('generates classic lorem text', async () => {
    const user = userEvent.setup();
    render(<LoremGenerator />);
    await user.click(screen.getByRole('button', { name: /generate/i }));
    const output = screen.getByLabelText(/generated text output/i) as HTMLTextAreaElement;
    expect(output.value.length).toBeGreaterThan(0);
  });

  it('generates hipster lorem text', async () => {
    const user = userEvent.setup();
    render(<LoremGenerator />);
    await user.click(screen.getByRole('tab', { name: /hipster/i }));
    await user.click(screen.getByRole('button', { name: /generate/i }));
    const output = screen.getByLabelText(/generated text output/i) as HTMLTextAreaElement;
    expect(output.value.length).toBeGreaterThan(0);
  });

  it('clears output', async () => {
    const user = userEvent.setup();
    render(<LoremGenerator />);
    await user.click(screen.getByRole('button', { name: /generate/i }));
    await user.click(screen.getByRole('button', { name: /clear/i }));
    const output = screen.getByLabelText(/generated text output/i) as HTMLTextAreaElement;
    expect(output.value).toBe('');
  });

  it('shows word count after generating', async () => {
    const user = userEvent.setup();
    render(<LoremGenerator />);
    await user.click(screen.getByRole('button', { name: /generate/i }));
    expect(screen.getByText(/\d+ words/i)).toBeInTheDocument();
  });

  it('generates different unit types', async () => {
    const user = userEvent.setup();
    render(<LoremGenerator />);
    const select = screen.getByLabelText(/text unit/i);
    await user.selectOptions(select, 'words');
    await user.click(screen.getByRole('button', { name: /generate/i }));
    const output = screen.getByLabelText(/generated text output/i) as HTMLTextAreaElement;
    expect(output.value.length).toBeGreaterThan(0);
  });
});
