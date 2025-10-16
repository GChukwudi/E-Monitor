const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [step, setStep] = useState(1); // 1: Details, 2: OTP, 3: Property Setup
  const [formData, setFormData] = useState({
    propertyName: '',
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
      // Check if manager already exists
      const existingManager = await AuthService.checkPropertyManager(formData.mobileNumber);
      if (existingManager) {
        setError('A property manager with this number already exists');
        setLoading(false);
        return;
      }

      // Send OTP
      const otp = AuthService.generateOTP();
      const result = await AuthService.sendOTP(formData.mobileNumber, otp);
      
      if (result.success) {
        setSentOTP(otp);
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

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await AuthService.verifyOTP(formData.mobileNumber, formData.otp);
      
      if (result.success) {
        // Register property manager
        const registerResult = await AuthService.registerPropertyManager({
          propertyName: formData.propertyName,
          mobileNumber: formData.mobileNumber,
          accessCode: formData.accessCode
        });

        if (registerResult.success) {
          setStep(3);
        } else {
          setError(registerResult.error);
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleStep1Submit} className={styles.authForm}>
      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Property Name</label>
        <input
          type="text"
          name="propertyName"
          value={formData.propertyName}
          onChange={handleInputChange}
          placeholder="e.g., Sunset Apartments"
          className={styles.input}
          required
        />
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
        {loading ? 'Sending OTP...' : 'Send Verification Code'}
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
        {loading ? 'Verifying...' : 'Verify Code'}
      </button>

      <button
        type="button"
        className={styles.linkButton}
        onClick={() => setStep(1)}
      >
        Change Mobile Number
      </button>
    </form>
  );

  const renderStep3 = () => (
    <div className={styles.successMessage}>
      <h3>Registration Successful!</h3>
      <p>Your property manager account has been created.</p>
      <button
        className={styles.submitButton}
        onClick={() => onRegisterSuccess()}
      >
        Continue to Setup
      </button>
    </div>
  );

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Register Property</h1>
          <p className={styles.authSubtitle}>
            {step === 1 && 'Create your property manager account'}
            {step === 2 && 'Verify your mobile number'}
            {step === 3 && 'Account created successfully'}
          </p>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {step === 1 && (
          <div className={styles.authFooter}>
            <button className={styles.linkButton} onClick={onSwitchToLogin}>
              Already have an account? Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};