import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Analytics from './Analytics';

const mockUnits = {
  unit_001: { power: 250, current: 2.0, voltage: 230, remaining_credit: 3000 },
  unit_002: { power: 150, current: 1.5, voltage: 230, remaining_credit: 450 },
  unit_003: { power: 350, current: 2.5, voltage: 230, remaining_credit: 0 }
};

describe('Analytics Page', () => {
  test('renders table with all units', () => {
    render(<Analytics units={mockUnits} />);
    
    expect(screen.getByText(/House 001/i)).toBeInTheDocument();
    expect(screen.getByText(/House 002/i)).toBeInTheDocument();
    expect(screen.getByText(/House 003/i)).toBeInTheDocument();
  });

  test('displays operational status', () => {
    render(<Analytics units={mockUnits} />);
    
    expect(screen.getAllByText(/Operational/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });

  test('shows power metrics', () => {
    render(<Analytics units={mockUnits} />);
    
    expect(screen.getByText(/250.00/)).toBeInTheDocument();
    expect(screen.getByText(/150.00/)).toBeInTheDocument();
  });
});
