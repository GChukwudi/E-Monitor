import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertBanner from './AlertBanner';

describe('AlertBanner Component', () => {
  test('renders nothing when no alerts', () => {
    const { container } = render(<AlertBanner alerts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('displays alert count', () => {
    const alerts = ['Alert 1', 'Alert 2'];
    render(<AlertBanner alerts={alerts} />);
    expect(screen.getByText(/active alerts \(2\)/i)).toBeInTheDocument();
  });

  test('renders all alerts', () => {
    const alerts = ['Low credit warning', 'High consumption'];
    render(<AlertBanner alerts={alerts} />);
    
    expect(screen.getByText(/low credit warning/i)).toBeInTheDocument();
    expect(screen.getByText(/high consumption/i)).toBeInTheDocument();
  });
});
