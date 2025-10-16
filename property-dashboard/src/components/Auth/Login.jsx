import React, { useState } from 'react';
import { Phone, Lock, Eye, EyeOff } from 'lucide-react';
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
        onLoginSuccess(result.manager);
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
          <h1 className={styles.authTitle}>Property Manager Login</h1>
          <p className={styles.authSubtitle}>Enter your access code to continue</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Access Code</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={20} />
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
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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