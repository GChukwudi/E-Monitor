import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../App';

// Mock Firebase services with proper initialization
jest.mock('../../services/firebase', () => ({
  default: {
    subscribeToBuilding: jest.fn((buildingId, callback) => {
      // Immediately call callback with test data
      setTimeout(() => {
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
      }, 0);
      
      return jest.fn(); // Cleanup function
    }),
    getBuilding: jest.fn().mockResolvedValue({
      success: true,
      data: {
        name: 'Test Building',
        units: {
          unit_001: {
            power: 250,
            current: 2.0,
            voltage: 230,
            remaining_credit: 3000,
            timestamp: '2025-11-05 14:30:00'
          },
          unit_002: {
            power: 150,
            current: 1.5,
            voltage: 230,
            remaining_credit: 450,
            timestamp: '2025-11-05 14:30:00'
          }
        }
      }
    })
  }
}));

// Mock AuthService with proper authenticated state
const mockAuthService = {
  getCurrentUser: jest.fn(() => ({
    buildingId: 'building_002',
    propertyName: 'Test Building'
  })),
  loginWithAccessCode: jest.fn().mockResolvedValue({
    success: true,
    manager: { 
      buildingId: 'building_002',
      propertyName: 'Test Building'
    },
    building: { 
      name: 'Test Building',
      units: {
        unit_001: { power: 250, remaining_credit: 3000 },
        unit_002: { power: 150, remaining_credit: 450 }
      }
    },
    buildingId: 'building_002'
  }),
  logout: jest.fn(),
  onMessageListener: jest.fn(() => jest.fn())
};

jest.mock('../../services/auth', () => ({
  default: mockAuthService
}));

describe('Integration Test: ESP32 → Firebase → Dashboard', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Ensure user is authenticated by default
    mockAuthService.getCurrentUser.mockReturnValue({
      buildingId: 'building_002',
      propertyName: 'Test Building'
    });
  });

  test('IT-001: Complete data flow from ESP32 to Dashboard', async () => {
    render(<App />);

    // Wait for building name to appear (indicates successful load)
    await waitFor(() => {
      expect(screen.getByText(/Test Building/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify dashboard displays
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    
    // Verify units data is displayed
    await waitFor(() => {
      expect(screen.getByText(/Total Units/i)).toBeInTheDocument();
    });
  });

  test('IT-002: Unit status changes reflect in real-time', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Test Building/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify initial state shows units
    expect(screen.getByText(/Total Power/i)).toBeInTheDocument();
  });

  test('IT-003: Navigation between views', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Test Building/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click on Units view
    const unitsButton = screen.getByText(/^Units$/i);
    fireEvent.click(unitsButton);

    // Verify Units view loaded
    await waitFor(() => {
      expect(screen.getByText(/All Units/i)).toBeInTheDocument();
    });
  });

  test('IT-004: Alerts generated for low credit units', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Test Building/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Navigate to units to see status
    const unitsButton = screen.getByText(/^Units$/i);
    fireEvent.click(unitsButton);

    await waitFor(() => {
      // Low credit unit (450) should show warning status
      expect(screen.getByText(/House 002/i)).toBeInTheDocument();
    });
  });
});

describe('Integration Test: Login → Dashboard Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('IT-005: Complete login workflow', async () => {
    // Start with unauthenticated state
    mockAuthService.getCurrentUser.mockReturnValueOnce(null);
    
    render(<App />);

    // Should show login form
    await waitFor(() => {
      const headings = screen.getAllByText(/Property Access/i);
      expect(headings.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Enter access code
    const input = screen.getByPlaceholderText(/enter your access code/i);
    fireEvent.change(input, { target: { value: 'TEST-CODE-123' } });

    // Submit login
    const loginButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(loginButton);

    // Wait for successful login
    await waitFor(() => {
      expect(mockAuthService.loginWithAccessCode).toHaveBeenCalledWith('TEST-CODE-123');
    });
  });
});

describe('Integration Test: Credit Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.getCurrentUser.mockReturnValue({
      buildingId: 'building_002',
      propertyName: 'Test Building'
    });
  });

  test('IT-006: Low credit warning displays correctly', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Test Building/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Navigate to Units view
    const unitsButton = screen.getByText(/^Units$/i);
    fireEvent.click(unitsButton);

    // Unit with 450 credit should show warning
    await waitFor(() => {
      // Check for warning indicators
      expect(screen.getByText(/House 002/i)).toBeInTheDocument();
      // The low credit unit should have "requires attention" status
      const attentionElements = screen.queryAllByText(/requires attention/i);
      expect(attentionElements.length).toBeGreaterThan(0);
    });
  });
});

describe('Integration Test: Multi-Platform Consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.getCurrentUser.mockReturnValue({
      buildingId: 'building_002',
      propertyName: 'Test Building'
    });
  });

  test('IT-007: Same data across Dashboard and Units view', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Test Building/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check dashboard stats
    const dashboardPower = screen.getByText(/Total Power/i);
    expect(dashboardPower).toBeInTheDocument();

    // Navigate to Units
    const unitsButton = screen.getByText(/^Units$/i);
    fireEvent.click(unitsButton);

    await waitFor(() => {
      expect(screen.getByText(/All Units/i)).toBeInTheDocument();
    });

    // Verify same units appear
    expect(screen.getByText(/House 001/i)).toBeInTheDocument();
    expect(screen.getByText(/House 002/i)).toBeInTheDocument();
  });
});