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

  // Send OTP (in real implementation, this would use SMS service)
  async sendOTP(mobileNumber, otp) {
    try {
      // Store OTP in Firebase with expiration
      const otpRef = ref(this.database, `otp_verification/${mobileNumber.replace('+', '')}`);
      await set(otpRef, {
        otp: otp,
        createdAt: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        verified: false
      });

      // In real implementation, integrate with SMS service like Twilio
      console.log(`OTP ${otp} sent to ${mobileNumber}`);
      
      // For demo purposes, show alert
      alert(`Demo: OTP is ${otp} for ${mobileNumber}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP
  async verifyOTP(mobileNumber, enteredOTP) {
    try {
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
      await update(otpRef, { verified: true });
      return { success: true };
      
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

  // Login property manager
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