import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import JsonFormatter from '../pages/JsonFormatter';

function renderJson() {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter>
        <JsonFormatter />
      </MemoryRouter>,
    ),
  };
}

describe('JsonFormatter', () => {
  it('renders the three mode tabs', () => {
    renderJson();
    expect(screen.getByRole('tab', { name: /format/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /minify/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /validate/i })).toBeInTheDocument();
  });

  it('formats valid JSON', async () => {
    const { user } = renderJson();
    const input = screen.getByLabelText(/json input/i);
    await user.type(input, '{{"a":1}');
    const output = screen.getByLabelText(/json output/i);
    expect(output).toHaveValue(JSON.stringify({ a: 1 }, null, 2));
  });

  it('shows error for invalid JSON', async () => {
    const { user } = renderJson();
    const input = screen.getByLabelText(/json input/i);
    await user.type(input, '{{not json');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('minifies JSON when minify tab is selected', async () => {
    const { user } = renderJson();
    const minifyTab = screen.getByRole('tab', { name: /minify/i });
    await user.click(minifyTab);

    const input = screen.getByLabelText(/json input/i);
    await user.type(input, '{{"a" : 1 , "b" : 2}');

    const output = screen.getByLabelText(/json output/i);
    expect(output).toHaveValue('{"a":1,"b":2}');
  });

  it('validates JSON when validate tab is selected', async () => {
    const { user } = renderJson();
    const validateTab = screen.getByRole('tab', { name: /validate/i });
    await user.click(validateTab);

    const input = screen.getByLabelText(/json input/i);
    await user.type(input, '{{"valid":true}');

    const output = screen.getByLabelText(/json output/i);
    expect(output).toHaveValue('✓ Valid JSON');
  });

  it('clears input and output when Clear is clicked', async () => {
    const { user } = renderJson();
    const input = screen.getByLabelText(/json input/i);
    await user.type(input, '{{"a":1}');

    const clearBtn = screen.getByRole('button', { name: /clear/i });
    await user.click(clearBtn);

    expect(input).toHaveValue('');
    expect(screen.getByLabelText(/json output/i)).toHaveValue('');
  });

  it('has proper aria-selected on active tab', () => {
    renderJson();
    expect(screen.getByRole('tab', { name: /format/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /minify/i })).toHaveAttribute('aria-selected', 'false');
  });
});
