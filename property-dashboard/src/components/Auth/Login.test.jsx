import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Login } from './Login';

// Mock the auth service to avoid import.meta issues
jest.mock('../../services/auth', () => ({
  default: {
    loginWithAccessCode: jest.fn(),
    generateOTP: jest.fn(),
    sendOTP: jest.fn(),
    verifyOTP: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: jest.fn()
  }
}));

describe('Login Component', () => {
  test('renders login form', () => {
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    expect(screen.getByRole('heading', { name: /property access/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your access code/i)).toBeInTheDocument();
  });

  test('has required input field', () => {
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    const input = screen.getByPlaceholderText(/enter your access code/i);
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('minlength', '6');
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
    const eyeButton = toggleButtons.find(btn => btn.className.includes('eyeButton'));
    fireEvent.click(eyeButton);
    
    expect(input).toHaveAttribute('type', 'text');
  });

  test('allows typing in access code field', () => {
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    const input = screen.getByPlaceholderText(/enter your access code/i);
    fireEvent.change(input, { target: { value: 'TEST123' } });
    
    expect(input).toHaveValue('TEST123');
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

  test('displays submit button', () => {
    render(
      <Login 
        onLoginSuccess={() => {}} 
        onSwitchToRegister={() => {}}
        onForgotPassword={() => {}}
      />
    );
    
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});