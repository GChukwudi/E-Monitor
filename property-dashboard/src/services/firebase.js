import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, get, set, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export const FirebaseService = {
  // Subscribe to building using buildingId under buildings/ path
  subscribeToBuilding(buildingId, callback) {
    const buildingRef = ref(database, `buildings/${buildingId}`);
    
    const unsubscribe = onValue(buildingRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }, (error) => {
      console.error('Firebase subscription error:', error);
      callback(null);
    });

    return () => off(buildingRef);
  },

  // Get building data once
  async getBuilding(buildingId) {
    try {
      const buildingRef = ref(database, `buildings/${buildingId}`);
      const snapshot = await get(buildingRef);
      
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      } else {
        return { success: false, error: 'Building not found' };
      }
    } catch (error) {
      console.error('Error getting building:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate access code for units
  generateUnitAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Update unit access code - FIXED PATH
  async updateUnitAccessCode(buildingId, unitId, newAccessCode) {
    try {
      const unitRef = ref(database, `buildings/${buildingId}/units/${unitId}`);
      await update(unitRef, {
        accessCode: newAccessCode,
        updatedAt: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating access code:', error);
      return { success: false, error: error.message };
    }
  },

  // Update tenant information for a unit - FIXED PATH
  async updateUnitTenantInfo(buildingId, unitId, tenantInfo) {
    try {
      const unitRef = ref(database, `buildings/${buildingId}/units/${unitId}`);
      await update(unitRef, {
        tenantInfo: tenantInfo,
        updatedAt: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating tenant info:', error);
      return { success: false, error: error.message };
    }
  },

  // Add new unit to building - FIXED PATH
  async addUnit(buildingId, unitName) {
    try {
      // Get current units to determine next unit number - FIXED PATH
      const buildingRef = ref(database, `buildings/${buildingId}/units`);
      const snapshot = await get(buildingRef);
      
      let unitNumber = 1;
      if (snapshot.exists()) {
        const units = snapshot.val();
        const unitNumbers = Object.keys(units)
          .map(key => parseInt(key.replace('unit_', '')))
          .filter(num => !isNaN(num));
        
        if (unitNumbers.length > 0) {
          unitNumber = Math.max(...unitNumbers) + 1;
        }
      }
      
      const unitId = `unit_${String(unitNumber).padStart(3, '0')}`;
      const unitRef = ref(database, `buildings/${buildingId}/units/${unitId}`);
      
      const unitData = {
        name: unitName,
        current: 0,
        voltage: 0,
        power: 0,
        remaining_credit: 0,
        remaining_units: 0,
        timestamp: new Date().toISOString(),
        isActive: true,
        accessCode: this.generateUnitAccessCode(),
        createdAt: Date.now()
      };
      
      await set(unitRef, unitData);
      return { success: true, unitId, data: unitData };
    } catch (error) {
      console.error('Error adding unit:', error);
      return { success: false, error: error.message };
    }
  },

  // Deactivate unit - FIXED PATH
  async deactivateUnit(buildingId, unitId) {
    try {
      const unitRef = ref(database, `buildings/${buildingId}/units/${unitId}`);
      await update(unitRef, {
        isActive: false,
        deactivatedAt: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deactivating unit:', error);
      return { success: false, error: error.message };
    }
  },

  // Subscribe to specific unit - FIXED PATH
  subscribeToUnit(buildingId, unitId, callback) {
    const unitRef = ref(database, `buildings/${buildingId}/units/${unitId}`);
    
    const unsubscribe = onValue(unitRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    });

    return () => off(unitRef);
  },

  // Get all units for a building - FIXED PATH
  async getUnits(buildingId) {
    try {
      const unitsRef = ref(database, `buildings/${buildingId}/units`);
      const snapshot = await get(unitsRef);
      
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      } else {
        return { success: true, data: {} }; // Empty units object
      }
    } catch (error) {
      console.error('Error getting units:', error);
      return { success: false, error: error.message };
    }
  },

  // Update building information - FIXED PATH
  async updateBuilding(buildingId, updates) {
    try {
      const buildingRef = ref(database, `buildings/${buildingId}`);
      await update(buildingRef, {
        ...updates,
        updatedAt: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating building:', error);
      return { success: false, error: error.message };
    }
  }
};

export default FirebaseService;