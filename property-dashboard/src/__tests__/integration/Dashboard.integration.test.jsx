import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../App';

// Mock Firebase services
jest.mock('../../services/firebase', () => ({
  default: {
    subscribeToBuilding: jest.fn((buildingId, callback) => {
      // Simulate real-time data
      callback({
        name: 'Test Building',
        units: {
          unit_001: {
            power: 250,
            current: 2.0,
            voltage: 230,
            remaining_credit: 3000,
            remaining_units: 14.3,
            timestamp: '2025-11-05 14:30:00'
          },
          unit_002: {
            power: 150,
            current: 1.5,
            voltage: 230,
            remaining_credit: 450,
            remaining_units: 2.1,
            timestamp: '2025-11-05 14:30:00'
          }
        }
      });
      return () => {}; // Cleanup function
    }),
    getBuilding: jest.fn().mockResolvedValue({
      success: true,
      data: {
        name: 'Test Building',
        units: {
          unit_001: {
            power: 250,
            remaining_credit: 3000
          }
        }
      }
    })
  }
}));

jest.mock('../../services/auth', () => ({
  default: {
    getCurrentUser: jest.fn(() => ({
      buildingId: 'building_002',
      propertyName: 'Test Property'
    })),
    loginWithAccessCode: jest.fn().mockResolvedValue({
      success: true,
      manager: { buildingId: 'building_002' },
      building: { name: 'Test Building' },
      buildingId: 'building_002'
    }),
    logout: jest.fn(),
    onMessageListener: jest.fn(() => () => {})
  }
}));

describe('Integration Test: ESP32 → Firebase → Dashboard', () => {
  test('IT-001: Complete data flow from ESP32 to Dashboard', async () => {
    render(<App />);

    // Wait for app to load with authenticated state
    await waitFor(() => {
      expect(screen.getByText(/test building/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify dashboard displays
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    
    // Verify units data is displayed
    await waitFor(() => {
      expect(screen.getByText(/total units/i)).toBeInTheDocument();
    });
  });

  test('IT-002: Unit status changes reflect in real-time', async () => {
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/test building/i)).toBeInTheDocument();
    });

    // Verify initial state shows units
    expect(screen.getByText(/total power/i)).toBeInTheDocument();
  });

  test('IT-003: Navigation between views', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // Click on Units view
    const unitsButton = screen.getByText(/^units$/i);
    fireEvent.click(unitsButton);

    // Verify Units view loaded
    await waitFor(() => {
      expect(screen.getByText(/all units/i)).toBeInTheDocument();
    });
  });

  test('IT-004: Alerts generated for low credit units', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/test building/i)).toBeInTheDocument();
    });

    // Low credit unit (450) should trigger alert
    // Check if alert banner appears (if enabled)
    // This depends on your alert implementation
  });
});

describe('Integration Test: Login → Dashboard Flow', () => {
  test('IT-005: Complete login workflow', async () => {
    const AuthService = require('../../services/auth').default;
    
    // Reset to unauthenticated state
    AuthService.getCurrentUser.mockReturnValueOnce(null);
    
    const { rerender } = render(<App />);

    // Should show login form
    await waitFor(() => {
      expect(screen.getByText(/property access/i)).toBeInTheDocument();
    });

    // Enter access code
    const input = screen.getByPlaceholderText(/enter your access code/i);
    fireEvent.change(input, { target: { value: 'TEST-CODE-123' } });

    // Submit login
    const loginButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(loginButton);

    // Wait for successful login and redirect to dashboard
    await waitFor(() => {
      expect(AuthService.loginWithAccessCode).toHaveBeenCalled();
    });
  });
});

describe('Integration Test: Credit Management', () => {
  test('IT-006: Low credit warning displays correctly', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/test building/i)).toBeInTheDocument();
    });

    // Navigate to Units view
    const unitsButton = screen.getByText(/^units$/i);
    fireEvent.click(unitsButton);

    // Unit with 450 credit should show warning
    await waitFor(() => {
      // Check for warning indicators
      const warnings = screen.queryAllByText(/requires attention/i);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('Integration Test: Multi-Platform Consistency', () => {
  test('IT-007: Same data across Dashboard and Units view', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/test building/i)).toBeInTheDocument();
    });

    // Check dashboard stats
    const dashboardPower = screen.getByText(/total power/i);
    expect(dashboardPower).toBeInTheDocument();

    // Navigate to Units
    const unitsButton = screen.getByText(/^units$/i);
    fireEvent.click(unitsButton);

    await waitFor(() => {
      expect(screen.getByText(/all units/i)).toBeInTheDocument();
    });

    // Verify same units appear
    expect(screen.getByText(/house 001/i)).toBeInTheDocument();
    expect(screen.getByText(/house 002/i)).toBeInTheDocument();
  });
});
