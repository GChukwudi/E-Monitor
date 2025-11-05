import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from './Dashboard';

// Mock Recharts to avoid React 19 issues
jest.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
}));

const mockBuilding = {
  name: 'Test Building',
  units: {
    unit_001: { power: 250, remaining_credit: 3000 },
    unit_002: { power: 150, remaining_credit: 800 },
    unit_003: { power: 350, remaining_credit: 0 }
  }
};

const mockStats = {
  totalPower: '750.00',
  avgCurrent: '2.00',
  totalUnits: 3
};

const mockChartData = [
  { name: 'Unit 001', power: 250 },
  { name: 'Unit 002', power: 150 }
];

const mockPieData = [
  { name: 'Unit 001', value: 250 },
  { name: 'Unit 002', value: 150 }
];

describe('Dashboard Page', () => {
  test('renders stat cards', () => {
    render(
      <Dashboard 
        building={mockBuilding}
        stats={mockStats}
        alerts={[]}
        chartData={mockChartData}
        pieData={mockPieData}
      />
    );
    
    expect(screen.getByText('Total Units')).toBeInTheDocument();
    expect(screen.getByText('Total Power')).toBeInTheDocument();
    expect(screen.getByText('Operational Units')).toBeInTheDocument();
  });

  test('displays correct stats', () => {
    render(
      <Dashboard 
        building={mockBuilding}
        stats={mockStats}
        alerts={[]}
        chartData={mockChartData}
        pieData={mockPieData}
      />
    );
    
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/750.*W/)).toBeInTheDocument();
  });

  test('shows operational count', () => {
    render(
      <Dashboard 
        building={mockBuilding}
        stats={mockStats}
        alerts={[]}
        chartData={mockChartData}
        pieData={mockPieData}
      />
    );
    
    // 1 unit operational (unit_001 with 3000 credit)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('renders charts', () => {
    render(
      <Dashboard 
        building={mockBuilding}
        stats={mockStats}
        alerts={[]}
        chartData={mockChartData}
        pieData={mockPieData}
      />
    );
    
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });
});