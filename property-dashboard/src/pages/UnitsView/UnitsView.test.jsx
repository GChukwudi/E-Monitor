import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnitsView from './UnitsView';

const mockUnits = {
  unit_001: { power: 250, remaining_credit: 3000 },
  unit_002: { power: 150, remaining_credit: 800 }
};

describe('UnitsView Page', () => {
  test('renders search bar', () => {
    render(<UnitsView units={mockUnits} onUnitClick={() => {}} />);
    expect(screen.getByPlaceholderText(/search units/i)).toBeInTheDocument();
  });

  test('displays unit count', () => {
    render(<UnitsView units={mockUnits} onUnitClick={() => {}} />);
    expect(screen.getByText(/all units \(2\)/i)).toBeInTheDocument();
  });

  test('filters units by search', () => {
    render(<UnitsView units={mockUnits} onUnitClick={() => {}} />);
    
    const searchInput = screen.getByPlaceholderText(/search units/i);
    fireEvent.change(searchInput, { target: { value: '001' } });
    
    expect(screen.getByText(/House 001/i)).toBeInTheDocument();
    expect(screen.queryByText(/House 002/i)).not.toBeInTheDocument();
  });

  test('shows empty state when no matches', () => {
    render(<UnitsView units={mockUnits} onUnitClick={() => {}} />);
    
    const searchInput = screen.getByPlaceholderText(/search units/i);
    fireEvent.change(searchInput, { target: { value: 'xyz' } });
    
    expect(screen.getByText(/no units found/i)).toBeInTheDocument();
  });
});
