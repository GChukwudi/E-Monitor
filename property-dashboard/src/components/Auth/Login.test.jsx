import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Login } from './Login';

// Mock AuthService
jest.mock('../../services/auth', () => ({
  default: {
    loginWithAccessCode: jest.fn()
  }
}));

import AuthService from '../../services/auth';

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form', () => {
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    expect(screen.getByText(/property access/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your access code/i)).toBeInTheDocument();
  });

  test('prevents submission with blank access code', () => {
    const mockSubmit = jest.fn();
    render(
      <Login 
        onLoginSuccess={mockSubmit} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    const button = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(button);
    
    // HTML5 validation prevents submission
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  test('toggles password visibility', () => {
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    const input = screen.getByPlaceholderText(/enter your access code/i);
    expect(input).toHaveAttribute('type', 'password');
    
    const toggleButtons = screen.getAllByRole('button');
    const eyeButton = toggleButtons.find(btn => btn.querySelector('svg'));
    fireEvent.click(eyeButton);
    
    expect(input).toHaveAttribute('type', 'text');
  });

  test('submits valid access code', async () => {
    const mockOnSuccess = jest.fn();
    const mockUser = { buildingId: 'building_001' };
    const mockBuilding = { name: 'Test Building' };
    
    AuthService.loginWithAccessCode.mockResolvedValue({
      success: true,
      manager: mockUser,
      building: mockBuilding,
      buildingId: 'building_001'
    });
    
    render(
      <Login 
        onLoginSuccess={mockOnSuccess} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    const input = screen.getByPlaceholderText(/enter your access code/i);
    fireEvent.change(input, { target: { value: 'VALID-CODE-123' } });
    
    const button = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(AuthService.loginWithAccessCode).toHaveBeenCalledWith('VALID-CODE-123');
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('displays error message on failed login', async () => {
    AuthService.loginWithAccessCode.mockResolvedValue({
      success: false,
      error: 'Invalid access code'
    });
    
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    const input = screen.getByPlaceholderText(/enter your access code/i);
    fireEvent.change(input, { target: { value: 'WRONG-CODE' } });
    
    const button = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid access code/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    AuthService.loginWithAccessCode.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );
    
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    const input = screen.getByPlaceholderText(/enter your access code/i);
    fireEvent.change(input, { target: { value: 'VALID-CODE' } });
    
    const button = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(button);
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  test('switches to register view', () => {
    const mockSwitch = jest.fn();
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={mockSwitch}
        onForgotPassword={() => {}}
      />
    );
    
    const registerButton = screen.getByText(/register here/i);
    fireEvent.click(registerButton);
    
    expect(mockSwitch).toHaveBeenCalled();
  });

  test('switches to forgot password view', () => {
    const mockForgot = jest.fn();
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={mockForgot}
      />
    );
    
    const forgotButton = screen.getByText(/reset access code/i);
    fireEvent.click(forgotButton);
    
    expect(mockForgot).toHaveBeenCalled();
  });
});
