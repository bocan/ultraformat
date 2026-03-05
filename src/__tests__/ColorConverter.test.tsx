import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorConverter from '../pages/ColorConverter';

describe('ColorConverter', () => {
  it('renders color input', () => {
    render(<ColorConverter />);
    expect(screen.getByLabelText(/color value input/i)).toBeInTheDocument();
  });

  it('renders color picker', () => {
    render(<ColorConverter />);
    expect(screen.getByLabelText(/color picker/i)).toBeInTheDocument();
  });

  it('shows empty state when no input', () => {
    render(<ColorConverter />);
    expect(screen.getByText(/enter a color above/i)).toBeInTheDocument();
  });

  it('converts hex to all formats', async () => {
    const user = userEvent.setup();
    render(<ColorConverter />);
    await user.type(screen.getByLabelText(/color value input/i), '#ff0000');
    expect(screen.getByText('#ff0000')).toBeInTheDocument();
    expect(screen.getByText('rgb(255, 0, 0)')).toBeInTheDocument();
    expect(screen.getByText('hsl(0, 100%, 50%)')).toBeInTheDocument();
  });

  it('converts rgb string', async () => {
    const user = userEvent.setup();
    render(<ColorConverter />);
    await user.clear(screen.getByLabelText(/color value input/i));
    await user.type(screen.getByLabelText(/color value input/i), 'rgb(0, 128, 255)');
    expect(screen.getByText('#0080ff')).toBeInTheDocument();
  });

  it('converts hsl string', async () => {
    const user = userEvent.setup();
    render(<ColorConverter />);
    await user.type(screen.getByLabelText(/color value input/i), 'hsl(120, 100%, 50%)');
    expect(screen.getByText('#00ff00')).toBeInTheDocument();
    expect(screen.getByText('rgb(0, 255, 0)')).toBeInTheDocument();
  });

  it('shows unrecognised format message for invalid input', async () => {
    const user = userEvent.setup();
    render(<ColorConverter />);
    await user.type(screen.getByLabelText(/color value input/i), 'not-a-color');
    expect(screen.getByText(/unrecognised color format/i)).toBeInTheDocument();
  });

  it('renders RGB channel sliders when color is valid', async () => {
    const user = userEvent.setup();
    render(<ColorConverter />);
    await user.type(screen.getByLabelText(/color value input/i), '#ff7043');
    expect(screen.getByLabelText(/r channel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/g channel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/b channel/i)).toBeInTheDocument();
  });
});
