import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  PhoneAuthProvider,
  signInWithCredential 
} from 'firebase/auth';
import { getDatabase, ref, set, get, update } from 'firebase/database';

class FirebaseSMSService {
  constructor() {
    this.auth = getAuth();
    this.database = getDatabase();
    this.recaptchaVerifier = null;
  }

  // Initialize reCAPTCHA verifier (required by Firebase for SMS)
  initializeRecaptcha(containerId = 'recaptcha-container') {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
    }

    this.recaptchaVerifier = new RecaptchaVerifier(this.auth, containerId, {
      size: 'invisible', // or 'normal' for visible reCAPTCHA
      callback: (response) => {
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });

    return this.recaptchaVerifier;
  }

  // Send SMS verification code using Firebase Auth
  async sendSMSVerification(phoneNumber) {
    try {
      // Ensure reCAPTCHA is initialized
      if (!this.recaptchaVerifier) {
        this.initializeRecaptcha();
      }

      // Format phone number (ensure it has country code)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      // Send SMS using Firebase Auth
      const confirmationResult = await signInWithPhoneNumber(
        this.auth, 
        formattedNumber, 
        this.recaptchaVerifier
      );

      // Store confirmation result for later verification
      this.confirmationResult = confirmationResult;

      // Store OTP request in database for tracking
      await this.storeOTPRequest(formattedNumber);

      return { 
        success: true, 
        verificationId: confirmationResult.verificationId,
        message: `SMS sent to ${formattedNumber}`
      };

    } catch (error) {
      console.error('SMS sending error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Failed to send SMS';
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'Invalid phone number format';
          break;
        case 'auth/missing-phone-number':
          errorMessage = 'Phone number is required';
          break;
        case 'auth/quota-exceeded':
          errorMessage = 'SMS quota exceeded. Please try again later';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This phone number has been disabled';
          break;
        case 'auth/captcha-check-failed':
          errorMessage = 'reCAPTCHA verification failed';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please wait before trying again';
          break;
        default:
          errorMessage = error.message || 'Failed to send SMS';
      }

      return { success: false, error: errorMessage };
    }
  }

  // Verify SMS code using Firebase Auth
  async verifySMSCode(verificationCode) {
    try {
      if (!this.confirmationResult) {
        return { success: false, error: 'No SMS verification in progress' };
      }

      // Verify the code
      const result = await this.confirmationResult.confirm(verificationCode);
      
      // Get phone number from result
      const phoneNumber = result.user.phoneNumber;
      
      // Mark as verified in database
      await this.markOTPAsVerified(phoneNumber);

      // Sign out the temporary user (we're just using this for verification)
      await this.auth.signOut();

      return { 
        success: true, 
        phoneNumber: phoneNumber,
        message: 'Phone number verified successfully'
      };

    } catch (error) {
      console.error('SMS verification error:', error);
      
      let errorMessage = 'Invalid verification code';
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = 'Invalid verification code';
          break;
        case 'auth/code-expired':
          errorMessage = 'Verification code has expired';
          break;
        case 'auth/missing-verification-code':
          errorMessage = 'Please enter the verification code';
          break;
        default:
          errorMessage = error.message || 'Verification failed';
      }

      return { success: false, error: errorMessage };
    }
  }

  // Alternative method: Verify using credential (if you have verificationId)
  async verifyWithCredential(verificationId, verificationCode) {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const result = await signInWithCredential(this.auth, credential);
      
      const phoneNumber = result.user.phoneNumber;
      await this.markOTPAsVerified(phoneNumber);
      
      // Sign out the temporary user
      await this.auth.signOut();

      return { 
        success: true, 
        phoneNumber: phoneNumber 
      };

    } catch (error) {
      console.error('Credential verification error:', error);
      return { success: false, error: 'Invalid verification code' };
    }
  }

  // Format phone number to international format
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assuming Nigeria +234)
    if (!cleaned.startsWith('234') && !cleaned.startsWith('+234')) {
      // Remove leading 0 if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '+234' + cleaned;
    } else if (cleaned.startsWith('234')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  // Store OTP request in database for tracking
  async storeOTPRequest(phoneNumber) {
    try {
      const otpRef = ref(this.database, `sms_verification/${phoneNumber.replace('+', '')}`);
      await set(otpRef, {
        phoneNumber: phoneNumber,
        requestedAt: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
        verified: false,
        attempts: 0
      });
    } catch (error) {
      console.error('Error storing OTP request:', error);
    }
  }

  // Mark OTP as verified
  async markOTPAsVerified(phoneNumber) {
    try {
      const otpRef = ref(this.database, `sms_verification/${phoneNumber.replace('+', '')}`);
      await update(otpRef, {
        verified: true,
        verifiedAt: Date.now()
      });
    } catch (error) {
      console.error('Error marking OTP as verified:', error);
    }
  }

  // Check if phone number was recently verified
  async isPhoneVerified(phoneNumber) {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const otpRef = ref(this.database, `sms_verification/${formattedNumber.replace('+', '')}`);
      const snapshot = await get(otpRef);
      
      if (!snapshot.exists()) {
        return false;
      }

      const data = snapshot.val();
      const now = Date.now();
      const verifiedRecently = data.verified && (now - data.verifiedAt) < (30 * 60 * 1000); // 30 minutes
      
      return verifiedRecently;
    } catch (error) {
      console.error('Error checking phone verification:', error);
      return false;
    }
  }

  // Clean up reCAPTCHA
  cleanup() {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
  }

  // Test mode: Use fake SMS for development
  async sendTestSMS(phoneNumber) {
    const testCode = '123456';
    
    console.log(`TEST MODE: SMS code for ${phoneNumber} is: ${testCode}`);
    alert(`TEST MODE: Your verification code is: ${testCode}`);
    
    // Store fake verification
    await this.storeOTPRequest(this.formatPhoneNumber(phoneNumber));
    
    return { 
      success: true, 
      verificationId: 'test_verification_id',
      testCode: testCode 
    };
  }

  async verifyTestSMS(code) {
    if (code === '123456') {
      return { success: true, phoneNumber: '+234xxxxxxxxx' };
    } else {
      return { success: false, error: 'Invalid test code' };
    }
  }
}

export default new FirebaseSMSService();