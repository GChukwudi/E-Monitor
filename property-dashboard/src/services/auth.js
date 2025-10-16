// AuthService.js - Fixed version with correct building paths
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

  // Register property access - FIXED TO USE CORRECT PATH
  async registerProperty(propertyData) {
    try {
      await this.ensureInitialized();
      
      const { buildingId, mobileNumber, accessCode } = propertyData;
      
      console.log('Checking for building:', buildingId);
      
      // FIXED: Check if building exists under buildings/ path
      const buildingRef = ref(this.database, `buildings/${buildingId}`);
      const buildingSnapshot = await get(buildingRef);
      
      console.log('Building exists:', buildingSnapshot.exists());
      console.log('Building data:', buildingSnapshot.val());
      
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

      console.log('Registration successful for:', buildingId);
      return { success: true, buildingId };
    } catch (error) {
      console.error('Error registering property:', error);
      return { success: false, error: error.message };
    }
  }

  // Login with access code only - FIXED TO USE CORRECT PATH
  async loginWithAccessCode(accessCode) {
    try {
      await this.ensureInitialized();
      
      console.log('Attempting login with access code...');
      
      // Get all buildings and search for matching access code
      const buildingsRef = ref(this.database, 'buildings');
      const snapshot = await get(buildingsRef);
      
      if (!snapshot.exists()) {
        console.log('No buildings found in database');
        return { success: false, error: 'No buildings found' };
      }

      const buildings = snapshot.val();
      console.log('Buildings found:', Object.keys(buildings));
      
      let foundBuilding = null;
      let foundBuildingId = null;

      // Search through all buildings
      for (const [buildingId, building] of Object.entries(buildings)) {
        console.log(`Checking building ${buildingId}:`, {
          hasAccessCode: !!building.accessCode,
          isActive: building.isActive
        });
        
        if (building.accessCode && building.isActive) {
          try {
            const isMatch = await this.verifyAccessCode(accessCode, building.accessCode);
            console.log(`Access code match for ${buildingId}:`, isMatch);
            
            if (isMatch) {
              foundBuilding = building;
              foundBuildingId = buildingId;
              break;
            }
          } catch (verifyError) {
            console.error(`Error verifying access code for ${buildingId}:`, verifyError);
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
        const buildingRef = ref(this.database, `buildings/${foundBuildingId}`);
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

  // Check if property has access credentials (by mobile number) - FIXED PATH
  async checkPropertyByMobile(mobileNumber) {
    try {
      await this.ensureInitialized();
      
      const buildingsRef = ref(this.database, 'buildings');
      const snapshot = await get(buildingsRef);
      
      if (!snapshot.exists()) return null;

      const buildings = snapshot.val();
      
      for (const [buildingId, building] of Object.entries(buildings)) {
        if (building.mobileNumber === mobileNumber) {
          return { buildingId, ...building };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error checking property:', error);
      return null;
    }
  }

  // Reset access code - FIXED PATH
  async resetAccessCode(mobileNumber, newAccessCode) {
    try {
      await this.ensureInitialized();
      
      const property = await this.checkPropertyByMobile(mobileNumber);
      
      if (!property) {
        return { success: false, error: 'No property found with this mobile number' };
      }

      const hashedAccessCode = await this.hashAccessCode(newAccessCode);
      const buildingRef = ref(this.database, `buildings/${property.buildingId}`);
      
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