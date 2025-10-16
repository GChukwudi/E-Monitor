// src/services/auth.js
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

class AuthService {
  constructor() {
    this.database = getDatabase();
    this.messaging = null;
    this.currentUser = null;
    this.initializeMessaging();
  }

  async initializeMessaging() {
    try {
      this.messaging = getMessaging();
      // Request permission for notifications
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });
        console.log('FCM Token:', token);
        return token;
      }
    } catch (error) {
      console.error('Error initializing messaging:', error);
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate 8-character unit access code
  generateUnitAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Send OTP using Firebase SMS Authentication
  async sendOTP(mobileNumber, otp = null) {
    try {
      const useFirebaseSMS = import.meta.env.VITE_USE_FIREBASE_SMS === 'true';
      const testMode = import.meta.env.VITE_SMS_TEST_MODE === 'true';
      
      if (useFirebaseSMS && !testMode) {
        // Use Firebase SMS Authentication
        const FirebaseSMSService = (await import('./firebaseSMS')).default;
        return await FirebaseSMSService.sendSMSVerification(mobileNumber);
      } else if (testMode) {
        // Test mode with fake SMS
        const FirebaseSMSService = (await import('./firebaseSMS')).default;
        return await FirebaseSMSService.sendTestSMS(mobileNumber);
      } else {
        // Fallback: Store OTP in database (for demo)
        const generatedOTP = otp || this.generateOTP();
        const otpRef = ref(this.database, `otp_verification/${mobileNumber.replace('+', '')}`);
        await set(otpRef, {
          otp: generatedOTP,
          createdAt: Date.now(),
          expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
          verified: false
        });

        // For demo purposes, show alert with OTP
        console.log(`Demo: OTP ${generatedOTP} sent to ${mobileNumber}`);
        alert(`Demo Mode: Your verification code is ${generatedOTP}`);
        
        return { success: true, otp: generatedOTP };
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP using Firebase SMS or fallback method
  async verifyOTP(mobileNumber, enteredOTP) {
    try {
      const useFirebaseSMS = import.meta.env.VITE_USE_FIREBASE_SMS === 'true';
      const testMode = import.meta.env.VITE_SMS_TEST_MODE === 'true';
      
      if (useFirebaseSMS && !testMode) {
        // Use Firebase SMS verification
        const FirebaseSMSService = (await import('./firebaseSMS')).default;
        return await FirebaseSMSService.verifySMSCode(enteredOTP);
      } else if (testMode) {
        // Test mode verification
        const FirebaseSMSService = (await import('./firebaseSMS')).default;
        return await FirebaseSMSService.verifyTestSMS(enteredOTP);
      } else {
        // Fallback: Check OTP in database
        const otpRef = ref(this.database, `otp_verification/${mobileNumber.replace('+', '')}`);
        const snapshot = await get(otpRef);
        
        if (!snapshot.exists()) {
          return { success: false, error: 'OTP not found or expired' };
        }

        const otpData = snapshot.val();
        
        if (Date.now() > otpData.expiresAt) {
          return { success: false, error: 'OTP has expired' };
        }

        if (otpData.otp !== enteredOTP) {
          return { success: false, error: 'Invalid OTP' };
        }

        // Mark as verified
        await update(otpRef, { verified: true, verifiedAt: Date.now() });
        return { success: true };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if property manager exists
  async checkPropertyManager(mobileNumber) {
    try {
      const managersRef = ref(this.database, 'property_managers');
      const snapshot = await get(managersRef);
      
      if (snapshot.exists()) {
        const managers = snapshot.val();
        const manager = Object.values(managers).find(m => m.mobileNumber === mobileNumber);
        return manager || null;
      }
      return null;
    } catch (error) {
      console.error('Error checking property manager:', error);
      return null;
    }
  }

  // Register new property manager
  async registerPropertyManager(propertyData) {
    try {
      const managerId = `manager_${Date.now()}`;
      const managerRef = ref(this.database, `property_managers/${managerId}`);
      
      const managerData = {
        id: managerId,
        propertyName: propertyData.propertyName,
        mobileNumber: propertyData.mobileNumber,
        accessCode: propertyData.accessCode,
        createdAt: Date.now(),
        lastLogin: null,
        isActive: true
      };

      await set(managerRef, managerData);
      return { success: true, managerId, data: managerData };
    } catch (error) {
      console.error('Error registering property manager:', error);
      return { success: false, error: error.message };
    }
  }

  // Login with access code only
  async loginWithAccessCode(accessCode) {
    try {
      // Search for manager by access code
      const managersRef = ref(this.database, 'property_managers');
      const snapshot = await get(managersRef);
      
      if (!snapshot.exists()) {
        return { success: false, error: 'No property managers found' };
      }

      const managers = snapshot.val();
      const manager = Object.values(managers).find(m => m.accessCode === accessCode && m.isActive);
      
      if (!manager) {
        return { success: false, error: 'Invalid access code' };
      }

      // Update last login
      const managerRef = ref(this.database, `property_managers/${manager.id}`);
      await update(managerRef, { lastLogin: Date.now() });

      this.currentUser = manager;
      
      // Store session
      localStorage.setItem('propertyManager', JSON.stringify(manager));
      
      return { success: true, manager };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, error: error.message };
    }
  }

  // Login property manager (old method for compatibility)
  async loginPropertyManager(mobileNumber, accessCode) {
    try {
      const manager = await this.checkPropertyManager(mobileNumber);
      
      if (!manager) {
        return { success: false, error: 'Property manager not found' };
      }

      if (manager.accessCode !== accessCode) {
        return { success: false, error: 'Invalid access code' };
      }

      if (!manager.isActive) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Update last login
      const managerRef = ref(this.database, `property_managers/${manager.id}`);
      await update(managerRef, { lastLogin: Date.now() });

      this.currentUser = manager;
      
      // Store session
      localStorage.setItem('propertyManager', JSON.stringify(manager));
      
      return { success: true, manager };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset access code
  async resetAccessCode(mobileNumber, newAccessCode) {
    try {
      const manager = await this.checkPropertyManager(mobileNumber);
      
      if (!manager) {
        return { success: false, error: 'Property manager not found' };
      }

      const managerRef = ref(this.database, `property_managers/${manager.id}`);
      await update(managerRef, { 
        accessCode: newAccessCode,
        updatedAt: Date.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error resetting access code:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current session
  getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    
    const stored = localStorage.getItem('propertyManager');
    if (stored) {
      this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }
    
    return null;
  }

  // Logout
  logout() {
    this.currentUser = null;
    localStorage.removeItem('propertyManager');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  // Setup FCM message listener
  onMessageListener() {
    if (!this.messaging) return () => {};
    
    return onMessage(this.messaging, (payload) => {
      console.log('Message received:', payload);
      
      // Show notification
      if (payload.notification) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/favicon.ico'
        });
      }
      
      return payload;
    });
  }
}

export default new AuthService();