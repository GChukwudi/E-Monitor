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
      const manager = await AuthService.checkPropertyManager(formData.mobileNumber);
      if (!manager) {
        setError('No property manager found with this mobile number');
        setLoading(false);
        return;
      }

      const otp = AuthService.generateOTP();
      const result = await AuthService.sendOTP(formData.mobileNumber, otp);
      
      if (result.success) {
        setStep(2);
      } else {
        setError(result.error);
      }
    } catch (error) {
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