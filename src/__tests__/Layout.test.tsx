import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../useTheme';
import Layout from '../components/Layout';

function renderLayout(route = '/') {
  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>
          <Layout />
        </MemoryRouter>
      </ThemeProvider>,
    ),
  };
}

describe('Layout', () => {
  it('renders the brand name', () => {
    renderLayout();
    expect(screen.getByText('UltraFormat')).toBeInTheDocument();
  });

  it('renders navigation with all tool tabs', async () => {
    const { user } = renderLayout();
    // Open the dropdown to reveal the nav
    await user.click(screen.getByRole('button', { name: /tools/i }));
    const nav = screen.getByRole('listbox', { name: /developer tools/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders the rotating privacy badge', () => {
    renderLayout();
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent(/100% client-side/i);
  });

  it('has a skip-to-content link', () => {
    renderLayout();
    const skipLink = screen.getByText(/skip to content/i);
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders the main content area with id', () => {
    renderLayout();
    expect(document.getElementById('main-content')).toBeInTheDocument();
  });

  it('renders a theme toggle button', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  });

  it('toggles theme on click', async () => {
    const { user } = renderLayout();
    const btn = screen.getByRole('button', { name: /switch to light mode/i });
    await user.click(btn);
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
