import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JwtDecoder from '../pages/JwtDecoder';

// A real JWT (HS256, expired) for testing
const TEST_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' +
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('JwtDecoder', () => {
  it('renders token input', () => {
    render(<JwtDecoder />);
    expect(screen.getByLabelText(/jwt token input/i)).toBeInTheDocument();
  });

  it('shows empty state when no token', () => {
    render(<JwtDecoder />);
    expect(screen.getByText(/paste a jwt above/i)).toBeInTheDocument();
  });

  it('decodes a valid JWT and shows header', async () => {
    const user = userEvent.setup();
    render(<JwtDecoder />);
    await user.type(screen.getByLabelText(/jwt token input/i), TEST_JWT);
    expect(screen.getByText('alg')).toBeInTheDocument();
    expect(screen.getByText('HS256')).toBeInTheDocument();
  });

  it('decodes payload claims', async () => {
    const user = userEvent.setup();
    render(<JwtDecoder />);
    await user.type(screen.getByLabelText(/jwt token input/i), TEST_JWT);
    expect(screen.getByText('sub')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows signature section', async () => {
    const user = userEvent.setup();
    render(<JwtDecoder />);
    await user.type(screen.getByLabelText(/jwt token input/i), TEST_JWT);
    expect(screen.getByText('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')).toBeInTheDocument();
  });

  it('shows error for invalid JWT', async () => {
    const user = userEvent.setup();
    render(<JwtDecoder />);
    await user.type(screen.getByLabelText(/jwt token input/i), 'not.a.jwt');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows error for non-3-part token', async () => {
    const user = userEvent.setup();
    render(<JwtDecoder />);
    await user.type(screen.getByLabelText(/jwt token input/i), 'only-one-part');
    expect(screen.getByText(/3 parts/i)).toBeInTheDocument();
  });

  it('has paste and clear buttons', () => {
    render(<JwtDecoder />);
    expect(screen.getByTitle(/paste from clipboard/i)).toBeInTheDocument();
    expect(screen.getByTitle(/clear input/i)).toBeInTheDocument();
  });
});
