import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Home from '../pages/Home';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  it('renders the hero title', () => {
    renderHome();
    expect(screen.getByText(/dev tools that/i)).toBeInTheDocument();
    expect(screen.getByText(/respect your data/i)).toBeInTheDocument();
  });

  it('displays all three privacy guarantees', () => {
    renderHome();
    expect(screen.getByText('No Cookies')).toBeInTheDocument();
    expect(screen.getByText('No Server Processing')).toBeInTheDocument();
    expect(screen.getByText('Data Stays Local')).toBeInTheDocument();
  });

  it('renders a card for each tool', () => {
    renderHome();
    expect(screen.getByText('JSON Formatter')).toBeInTheDocument();
    expect(screen.getByText('Diff Checker')).toBeInTheDocument();
    expect(screen.getByText('Base64 Codec')).toBeInTheDocument();
    expect(screen.getByText('Code Beautify')).toBeInTheDocument();
    expect(screen.getByText('Regex Tester')).toBeInTheDocument();
  });

  it('has accessible privacy section', () => {
    renderHome();
    expect(screen.getByLabelText(/privacy guarantees/i)).toBeInTheDocument();
  });

  it('has accessible tool grid', () => {
    renderHome();
    expect(screen.getByLabelText(/available tools/i)).toBeInTheDocument();
  });
});
