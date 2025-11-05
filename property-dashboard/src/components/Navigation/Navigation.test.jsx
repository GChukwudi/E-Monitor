import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navigation from './Navigation';

describe('Navigation Component', () => {
  test('renders navigation items', () => {
    render(
      <Navigation 
        activeView="dashboard" 
        onViewChange={() => {}} 
      />
    );
    
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/units/i)).toBeInTheDocument();
    expect(screen.getByText(/analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/management/i)).toBeInTheDocument();
  });

  test('calls onViewChange when item is clicked', () => {
    const mockOnViewChange = jest.fn();
    render(
      <Navigation 
        activeView="dashboard" 
        onViewChange={mockOnViewChange} 
      />
    );
    
    const unitsButton = screen.getByText(/units/i);
    fireEvent.click(unitsButton);
    
    expect(mockOnViewChange).toHaveBeenCalledWith('units');
  });

  test('highlights active view', () => {
    const { container } = render(
      <Navigation 
        activeView="dashboard" 
        onViewChange={() => {}} 
      />
    );
    
    const activeButton = container.querySelector('.active');
    expect(activeButton).toBeInTheDocument();
  });
});