// AuthService.js - Simplified for property-based authentication
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

class AuthService {
  constructor() {
    this.database = null;
    this.messaging = null;
    this.currentUser = null;
    this.isInitialized = false;
    this.initializeFirebase();
  }

  async initializeFirebase() {
    try {
      this.database = getDatabase();
      
      const messagingSupported = await isSupported();
      if (messagingSupported) {
        this.messaging = getMessaging();
        await this.initializeMessaging();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Firebase services:', error);
    }
  }

  async initializeMessaging() {
    if (!this.messaging) return;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (vapidKey) {
          const token = await getToken(this.messaging, { vapidKey });
          console.log('FCM Token:', token);
          return token;
        }
      }
    } catch (error) {
      console.error('Error initializing messaging:', error);
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeFirebase();
    }
    return this.database !== null;
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Simple hash function for access codes (browser-compatible)
  async hashAccessCode(accessCode) {
    const encoder = new TextEncoder();
    const data = encoder.encode(accessCode + 'property_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verify access code against hash
  async verifyAccessCode(accessCode, hashedCode) {
    const newHash = await this.hashAccessCode(accessCode);
    return newHash === hashedCode;
  }

  // Send OTP (demo mode)
  async sendOTP(mobileNumber, otp = null) {
    try {
      await this.ensureInitialized();
      
      const generatedOTP = otp || this.generateOTP();
      const otpRef = ref(this.database, `otp_verification/${mobileNumber.replace(/[^0-9]/g, '')}`);
      
      await set(otpRef, {
        otp: generatedOTP,
        createdAt: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        verified: false
      });

      console.log(`Demo: OTP ${generatedOTP} sent to ${mobileNumber}`);
      return { success: true, otp: generatedOTP };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP
  async verifyOTP(mobileNumber, enteredOTP) {
    try {
      await this.ensureInitialized();
      
      const otpRef = ref(this.database, `otp_verification/${mobileNumber.replace(/[^0-9]/g, '')}`);
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

      await update(otpRef, { verified: true, verifiedAt: Date.now() });
      return { success: true };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, error: error.message };
    }
  }

  // Register property access
  async registerProperty(propertyData) {
    try {
      await this.ensureInitialized();
      
      const { buildingId, mobileNumber, accessCode } = propertyData;
      
      // Check if building exists
      const buildingRef = ref(this.database, buildingId);
      const buildingSnapshot = await get(buildingRef);
      
      if (!buildingSnapshot.exists()) {
        return { success: false, error: 'Building ID not found. Please check with your installer.' };
      }

      const buildingData = buildingSnapshot.val();
      
      // Check if building already has access credentials
      if (buildingData.accessCode) {
        return { success: false, error: 'This building is already registered. Use the existing access code to login.' };
      }

      // Hash the access code for security
      const hashedAccessCode = await this.hashAccessCode(accessCode);
      
      // Update building with access credentials
      await update(buildingRef, {
        accessCode: hashedAccessCode,
        mobileNumber: mobileNumber,
        registeredAt: Date.now(),
        lastLogin: null,
        isActive: true
      });

      return { success: true, buildingId };
    } catch (error) {
      console.error('Error registering property:', error);
      return { success: false, error: error.message };
    }
  }

  // Login with access code only
  async loginWithAccessCode(accessCode) {
    try {
      await this.ensureInitialized();
      
      // Get all buildings and search for matching access code
      const allBuildingsRef = ref(this.database);
      const snapshot = await get(allBuildingsRef);
      
      if (!snapshot.exists()) {
        return { success: false, error: 'No buildings found' };
      }

      const allData = snapshot.val();
      let foundBuilding = null;
      let foundBuildingId = null;

      // Search through all building IDs
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('building_') && value.accessCode) {
          const isMatch = await this.verifyAccessCode(accessCode, value.accessCode);
          if (isMatch && value.isActive) {
            foundBuilding = value;
            foundBuildingId = key;
            break;
          }
        }
      }

      if (!foundBuilding) {
        return { success: false, error: 'Invalid access code' };
      }

      // Update last login
      const buildingRef = ref(this.database, foundBuildingId);
      await update(buildingRef, { lastLogin: Date.now() });

      // Set current user (simplified)
      this.currentUser = {
        buildingId: foundBuildingId,
        propertyName: foundBuilding.name,
        mobileNumber: foundBuilding.mobileNumber,
        lastLogin: Date.now()
      };
      
      // Store session
      localStorage.setItem('propertyUser', JSON.stringify(this.currentUser));
      
      return { 
        success: true, 
        manager: this.currentUser,
        building: foundBuilding,
        buildingId: foundBuildingId
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if property has access credentials (by mobile number)
  async checkPropertyByMobile(mobileNumber) {
    try {
      await this.ensureInitialized();
      
      const allBuildingsRef = ref(this.database);
      const snapshot = await get(allBuildingsRef);
      
      if (!snapshot.exists()) return null;

      const allData = snapshot.val();
      
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('building_') && value.mobileNumber === mobileNumber) {
          return { buildingId: key, ...value };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error checking property:', error);
      return null;
    }
  }

  // Reset access code
  async resetAccessCode(mobileNumber, newAccessCode) {
    try {
      await this.ensureInitialized();
      
      const property = await this.checkPropertyByMobile(mobileNumber);
      
      if (!property) {
        return { success: false, error: 'No property found with this mobile number' };
      }

      const hashedAccessCode = await this.hashAccessCode(newAccessCode);
      const buildingRef = ref(this.database, property.buildingId);
      
      await update(buildingRef, { 
        accessCode: hashedAccessCode,
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
    
    const stored = localStorage.getItem('propertyUser');
    if (stored) {
      this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }
    
    return null;
  }

  // Logout
  logout() {
    this.currentUser = null;
    localStorage.removeItem('propertyUser');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  // Setup FCM message listener
  onMessageListener() {
    if (!this.messaging) {
      return () => {};
    }
    
    try {
      return onMessage(this.messaging, (payload) => {
        console.log('Message received:', payload);
        
        if (payload.notification) {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/favicon.ico'
          });
        }
        
        return payload;
      });
    } catch (error) {
      console.error('Error setting up message listener:', error);
      return () => {};
    }
  }
}

export default new AuthService();