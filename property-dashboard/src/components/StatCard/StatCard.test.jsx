import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatCard from './StatCard';
import { Zap } from 'lucide-react';

describe('StatCard Component', () => {
  test('renders title and value', () => {
    render(
      <StatCard 
        title="Total Power" 
        value="750W" 
        icon={Zap} 
      />
    );
    
    expect(screen.getByText('Total Power')).toBeInTheDocument();
    expect(screen.getByText('750W')).toBeInTheDocument();
  });

  test('shows subtitle when provided', () => {
    render(
      <StatCard 
        title="Units" 
        value="5" 
        icon={Zap}
        subtitle="Active units"
      />
    );
    
    expect(screen.getByText('Active units')).toBeInTheDocument();
  });

  test('renders without subtitle', () => {
    render(
      <StatCard 
        title="Test" 
        value="100" 
        icon={Zap}
      />
    );
    
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
