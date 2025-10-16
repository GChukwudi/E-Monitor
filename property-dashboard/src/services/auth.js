// AuthService.js - Fixed version
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
      console.log('Firebase services initialized successfully');
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
    let attempts = 0;
    while (!this.isInitialized && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return this.database !== null;
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Simple hash function for access codes (browser-compatible)
  async hashAccessCode(accessCode) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(accessCode + 'property_salt_2024');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Error hashing access code:', error);
      // Fallback to simple encoding for development
      return btoa(accessCode + 'property_salt_2024');
    }
  }

  // Verify access code against hash
  async verifyAccessCode(accessCode, hashedCode) {
    try {
      const newHash = await this.hashAccessCode(accessCode);
      return newHash === hashedCode;
    } catch (error) {
      console.error('Error verifying access code:', error);
      return false;
    }
  }

  // Send OTP (demo mode)
  async sendOTP(mobileNumber, otp = null) {
    try {
      await this.ensureInitialized();
      
      const generatedOTP = otp || this.generateOTP();
      const cleanNumber = mobileNumber.replace(/[^0-9]/g, '');
      const otpRef = ref(this.database, `otp_verification/${cleanNumber}`);
      
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
      
      const cleanNumber = mobileNumber.replace(/[^0-9]/g, '');
      const otpRef = ref(this.database, `otp_verification/${cleanNumber}`);
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
      
      console.log('Attempting login with access code...');
      
      // Get all data from root
      const rootRef = ref(this.database);
      const snapshot = await get(rootRef);
      
      if (!snapshot.exists()) {
        console.log('No data found in database');
        return { success: false, error: 'No buildings found' };
      }

      const allData = snapshot.val();
      console.log('Database data keys:', Object.keys(allData));
      
      let foundBuilding = null;
      let foundBuildingId = null;

      // Search through all building IDs
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('buildings/building_') && value && typeof value === 'object') {
          console.log(`Checking building ${key}:`, {
            hasAccessCode: !!value.accessCode,
            isActive: value.isActive
          });
          
          if (value.accessCode && value.isActive) {
            try {
              const isMatch = await this.verifyAccessCode(accessCode, value.accessCode);
              console.log(`Access code match for ${key}:`, isMatch);
              
              if (isMatch) {
                foundBuilding = value;
                foundBuildingId = key;
                break;
              }
            } catch (verifyError) {
              console.error(`Error verifying access code for ${key}:`, verifyError);
            }
          }
        }
      }

      if (!foundBuilding) {
        console.log('No matching building found');
        return { success: false, error: 'Invalid access code' };
      }

      console.log('Login successful for building:', foundBuildingId);

      // Update last login
      try {
        const buildingRef = ref(this.database, foundBuildingId);
        await update(buildingRef, { lastLogin: Date.now() });
      } catch (updateError) {
        console.warn('Failed to update last login:', updateError);
      }

      // Set current user (simplified)
      this.currentUser = {
        buildingId: foundBuildingId,
        propertyName: foundBuilding.name || foundBuildingId,
        mobileNumber: foundBuilding.mobileNumber,
        lastLogin: Date.now()
      };
      
      // Store session
      try {
        localStorage.setItem('propertyUser', JSON.stringify(this.currentUser));
      } catch (storageError) {
        console.warn('Failed to save to localStorage:', storageError);
      }
      
      return { 
        success: true, 
        manager: this.currentUser,
        building: foundBuilding,
        buildingId: foundBuildingId
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  // Check if property has access credentials (by mobile number)
  async checkPropertyByMobile(mobileNumber) {
    try {
      await this.ensureInitialized();
      
      const rootRef = ref(this.database);
      const snapshot = await get(rootRef);
      
      if (!snapshot.exists()) return null;

      const allData = snapshot.val();
      
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('building_') && value && value.mobileNumber === mobileNumber) {
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
    
    try {
      const stored = localStorage.getItem('propertyUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error getting current user from localStorage:', error);
      localStorage.removeItem('propertyUser');
    }
    
    return null;
  }

  // Logout
  logout() {
    this.currentUser = null;
    try {
      localStorage.removeItem('propertyUser');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
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
        
        if (payload.notification && 'Notification' in window) {
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