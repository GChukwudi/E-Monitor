import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnitCard from './UnitCard';

const mockUnit = {
  power: 250.5,
  current: 1.2,
  voltage: 230,
  remaining_credit: 3205.35,
  timestamp: '2025-11-05 14:30:00'
};

describe('UnitCard Component', () => {
  test('displays unit power and current', () => {
    render(<UnitCard unitId="unit_001" unit={mockUnit} onClick={() => {}} />);
    
    expect(screen.getByText(/250.5W/i)).toBeInTheDocument();
    expect(screen.getByText(/1.20A/i)).toBeInTheDocument();
  });

  test('shows operational status for sufficient credit', () => {
    const operationalUnit = { ...mockUnit, remaining_credit: 2000 };
    render(<UnitCard unitId="unit_001" unit={operationalUnit} />);
    
    expect(screen.getByText(/operational/i)).toBeInTheDocument();
  });

  test('shows warning for low credit', () => {
    const lowCreditUnit = { ...mockUnit, remaining_credit: 750 };
    render(<UnitCard unitId="unit_001" unit={lowCreditUnit} />);
    
    expect(screen.getByText(/requires attention/i)).toBeInTheDocument();
  });

  test('displays critical alert for very low credit', () => {
    const criticalUnit = { ...mockUnit, remaining_credit: 300 };
    render(<UnitCard unitId="unit_001" unit={criticalUnit} />);
    
    expect(screen.getByText(/contact tenant/i)).toBeInTheDocument();
  });

  test('shows disconnected status when credit is zero', () => {
    const disconnectedUnit = { ...mockUnit, remaining_credit: 0 };
    render(<UnitCard unitId="unit_001" unit={disconnectedUnit} />);
    
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <UnitCard unitId="unit_001" unit={mockUnit} onClick={handleClick} />
    );
    
    fireEvent.click(container.firstChild);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('formats unit ID correctly', () => {
    render(<UnitCard unitId="unit_001" unit={mockUnit} />);
    expect(screen.getByText(/House 001/i)).toBeInTheDocument();
  });
});
