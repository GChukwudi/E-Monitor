import { useState } from 'react';
import { Phone, Lock, Eye, EyeOff, Building } from 'lucide-react';
import AuthService from '../../services/auth';
import styles from './Auth.module.css';

const Login = ({ onLoginSuccess, onSwitchToRegister, onForgotPassword }) => {
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setAccessCode(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await AuthService.loginWithAccessCode(accessCode);

      if (result.success) {
        onLoginSuccess(result.manager, result.building, result.buildingId);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Property Access</h1>
          <p className={styles.authSubtitle}>Enter your property access code to continue</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Access Code</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={accessCode}
                onChange={handleInputChange}
                placeholder="Enter your access code"
                className={styles.input}
                required
                minLength={6}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.authFooter}>
          <button
            className={styles.linkButton}
            onClick={onForgotPassword}
          >
            Reset Access Code
          </button>
          <button
            className={styles.linkButton}
            onClick={onSwitchToRegister}
          >
            New Property? Register Here
          </button>
        </div>
      </div>
    </div>
  );
};

const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    buildingId: '',
    mobileNumber: '',
    accessCode: '',
    confirmAccessCode: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentOTP, setSentOTP] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.accessCode !== formData.confirmAccessCode) {
      setError('Access codes do not match');
      return;
    }

    if (formData.accessCode.length < 6) {
      setError('Access code must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Send OTP for mobile verification
      const otp = AuthService.generateOTP();
      const result = await AuthService.sendOTP(formData.mobileNumber, otp);
      
      if (result.success) {
        setSentOTP(otp);
        setStep(2);
      } else {
        setError(result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verify OTP first
      const otpResult = await AuthService.verifyOTP(formData.mobileNumber, formData.otp);
      
      if (otpResult.success) {
        // Register property
        const registerResult = await AuthService.registerProperty({
          buildingId: formData.buildingId,
          mobileNumber: formData.mobileNumber,
          accessCode: formData.accessCode
        });

        if (registerResult.success) {
          setStep(3);
        } else {
          setError(registerResult.error);
        }
      } else {
        setError(otpResult.error);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleStep1Submit} className={styles.authForm}>
      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Building ID</label>
        <div className={styles.inputWrapper}>
          <Building className={styles.inputIcon} size={20} />
          <input
            type="text"
            name="buildingId"
            value={formData.buildingId}
            onChange={handleInputChange}
            placeholder="e.g., building_002"
            className={styles.input}
            required
          />
        </div>
        <p className={styles.inputHint}>
          Building ID provided by your installer
        </p>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Mobile Number</label>
        <div className={styles.inputWrapper}>
          <Phone className={styles.inputIcon} size={20} />
          <input
            type="tel"
            name="mobileNumber"
            value={formData.mobileNumber}
            onChange={handleInputChange}
            placeholder="+234 XXX XXX XXXX"
            className={styles.input}
            required
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Create Access Code</label>
        <div className={styles.inputWrapper}>
          <Lock className={styles.inputIcon} size={20} />
          <input
            type="password"
            name="accessCode"
            value={formData.accessCode}
            onChange={handleInputChange}
            placeholder="Minimum 6 characters"
            className={styles.input}
            required
            minLength={6}
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Confirm Access Code</label>
        <div className={styles.inputWrapper}>
          <Lock className={styles.inputIcon} size={20} />
          <input
            type="password"
            name="confirmAccessCode"
            value={formData.confirmAccessCode}
            onChange={handleInputChange}
            placeholder="Re-enter access code"
            className={styles.input}
            required
          />
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? 'Verifying...' : 'Send Verification Code'}
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleOTPSubmit} className={styles.authForm}>
      <div className={styles.otpInfo}>
        <p>We've sent a 6-digit code to {formData.mobileNumber}</p>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Verification Code</label>
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
          placeholder="Enter 6-digit code"
          className={styles.input}
          maxLength={6}
          required
        />
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify & Register'}
      </button>

      <button
        type="button"
        className={styles.linkButton}
        onClick={() => setStep(1)}
      >
        Change Details
      </button>
    </form>
  );

  const renderStep3 = () => (
    <div className={styles.successMessage}>
      <h3>Registration Successful!</h3>
      <p>Your property access has been set up for building {formData.buildingId}.</p>
      <p className={styles.accessCodeDisplay}>
        Your access code: <strong>{formData.accessCode}</strong>
      </p>
      <p className={styles.saveNote}>
        Save this access code - you'll need it to login.
      </p>
      <button
        className={styles.submitButton}
        onClick={() => onRegisterSuccess()}
      >
        Continue to Login
      </button>
    </div>
  );

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Register Property Access</h1>
          <p className={styles.authSubtitle}>
            {step === 1 && 'Set up access to your property monitoring'}
            {step === 2 && 'Verify your mobile number'}
            {step === 3 && 'Access registered successfully'}
          </p>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {step === 1 && (
          <div className={styles.authFooter}>
            <button className={styles.linkButton} onClick={onSwitchToLogin}>
              Already registered? Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ForgotPassword = ({ onBackToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    mobileNumber: '',
    otp: '',
    newAccessCode: '',
    confirmAccessCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentOTP, setSentOTP] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if property exists with this mobile number
      const property = await AuthService.checkPropertyByMobile(formData.mobileNumber);
      if (!property) {
        setError('No property found with this mobile number');
        setLoading(false);
        return;
      }

      const otp = AuthService.generateOTP();
      const result = await AuthService.sendOTP(formData.mobileNumber, otp);
      
      if (result.success) {
        setSentOTP(otp);
        setStep(2);
      } else {
        setError(result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAccessCode = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newAccessCode !== formData.confirmAccessCode) {
      setError('Access codes do not match');
      return;
    }

    if (formData.newAccessCode.length < 6) {
      setError('Access code must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Verify OTP first
      const otpResult = await AuthService.verifyOTP(formData.mobileNumber, formData.otp);
      
      if (!otpResult.success) {
        setError(otpResult.error);
        setLoading(false);
        return;
      }

      // Reset access code
      const resetResult = await AuthService.resetAccessCode(
        formData.mobileNumber, 
        formData.newAccessCode
      );

      if (resetResult.success) {
        setStep(3);
      } else {
        setError(resetResult.error);
      }
    } catch (error) {
      console.error('Reset access code error:', error);
      setError('Failed to reset access code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleSendOTP} className={styles.authForm}>
      <div className={styles.infoBox}>
        <p>Enter the mobile number you used during registration to reset your access code.</p>
      </div>
      
      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Registered Mobile Number</label>
        <div className={styles.inputWrapper}>
          <Phone className={styles.inputIcon} size={20} />
          <input
            type="tel"
            name="mobileNumber"
            value={formData.mobileNumber}
            onChange={handleInputChange}
            placeholder="+234 XXX XXX XXXX"
            className={styles.input}
            required
          />
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? 'Sending...' : 'Send Verification Code'}
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleResetAccessCode} className={styles.authForm}>
      <div className={styles.otpInfo}>
        <p>Enter the verification code sent to {formData.mobileNumber} and create your new access code</p>
        {sentOTP && (
          <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '8px' }}>
            Demo Mode: Your verification code is <strong>{sentOTP}</strong>
          </p>
        )}
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Verification Code</label>
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
          placeholder="Enter 6-digit code"
          className={styles.input}
          maxLength={6}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>New Access Code</label>
        <div className={styles.inputWrapper}>
          <Lock className={styles.inputIcon} size={20} />
          <input
            type="password"
            name="newAccessCode"
            value={formData.newAccessCode}
            onChange={handleInputChange}
            placeholder="Minimum 6 characters"
            className={styles.input}
            required
            minLength={6}
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Confirm New Access Code</label>
        <div className={styles.inputWrapper}>
          <Lock className={styles.inputIcon} size={20} />
          <input
            type="password"
            name="confirmAccessCode"
            value={formData.confirmAccessCode}
            onChange={handleInputChange}
            placeholder="Re-enter new access code"
            className={styles.input}
            required
          />
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? 'Resetting...' : 'Reset Access Code'}
      </button>

      <button
        type="button"
        className={styles.linkButton}
        onClick={() => setStep(1)}
        disabled={loading}
      >
        Change Mobile Number
      </button>
    </form>
  );

  const renderStep3 = () => (
    <div className={styles.successMessage}>
      <h3>Access Code Reset Successfully!</h3>
      <p>You can now login with your new access code.</p>
      <button className={styles.submitButton} onClick={onBackToLogin}>
        Back to Login
      </button>
    </div>
  );

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Reset Access Code</h1>
          <p className={styles.authSubtitle}>
            {step === 1 && 'Verify your registered mobile number'}
            {step === 2 && 'Enter verification code and new access code'}
            {step === 3 && 'Access code updated successfully'}
          </p>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {step === 1 && (
          <div className={styles.authFooter}>
            <button className={styles.linkButton} onClick={onBackToLogin}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export { Login, Register, ForgotPassword };