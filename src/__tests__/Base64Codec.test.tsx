import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Base64Codec from '../pages/Base64Codec';

describe('Base64Codec', () => {
  it('renders encode and decode tabs', () => {
    render(<Base64Codec />);
    expect(screen.getByRole('tab', { name: /encode/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /decode/i })).toBeInTheDocument();
  });

  it('renders input and output panes', () => {
    render(<Base64Codec />);
    expect(screen.getByLabelText(/text input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/base64 output/i)).toBeInTheDocument();
  });

  it('encodes text to base64', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    await user.type(screen.getByLabelText(/text input/i), 'hello');
    const output = screen.getByLabelText(/base64 output/i) as HTMLTextAreaElement;
    expect(output.value).toBe(btoa('hello'));
  });

  it('decodes base64 to text', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    await user.click(screen.getByRole('tab', { name: /decode/i }));
    await user.type(screen.getByLabelText(/base64 input/i), btoa('hello'));
    const output = screen.getByLabelText(/decoded text output/i) as HTMLTextAreaElement;
    expect(output.value).toBe('hello');
  });

  it('shows error for invalid base64', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    await user.click(screen.getByRole('tab', { name: /decode/i }));
    await user.type(screen.getByLabelText(/base64 input/i), '!!!not-valid!!!');
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid base64/i);
  });

  it('clears input and output when clear is clicked', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    const input = screen.getByLabelText(/text input/i);
    await user.type(input, 'test');
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(input).toHaveValue('');
    expect((screen.getByLabelText(/base64 output/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('swaps output to input and flips mode', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    await user.type(screen.getByLabelText(/text input/i), 'hello');
    const encoded = btoa('hello');
    await user.click(screen.getByRole('button', { name: /swap/i }));
    // Mode should now be decode, input should be the encoded value
    expect(screen.getByRole('tab', { name: /decode/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/base64 input/i)).toHaveValue(encoded);
  });

  it('marks the active tab with aria-selected', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    const encodeTab = screen.getByRole('tab', { name: /encode/i });
    const decodeTab = screen.getByRole('tab', { name: /decode/i });

    expect(encodeTab).toHaveAttribute('aria-selected', 'true');
    expect(decodeTab).toHaveAttribute('aria-selected', 'false');

    await user.click(decodeTab);
    expect(decodeTab).toHaveAttribute('aria-selected', 'true');
    expect(encodeTab).toHaveAttribute('aria-selected', 'false');
  });
});
