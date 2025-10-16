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
  // Subscribe to all buildings data (your existing structure)
  subscribeToBuildings(callback) {
    const buildingsRef = ref(database, 'buildings');
    
    const unsubscribe = onValue(buildingsRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }, (error) => {
      console.error('Firebase error:', error);
      callback(null);
    });

    return () => off(buildingsRef);
  },

  // Subscribe to specific building (your existing structure)
  subscribeToBuilding(buildingId, callback) {
    const buildingRef = ref(database, `buildings/${buildingId}`);
    
    const unsubscribe = onValue(buildingRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
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

  // Get all buildings for a property manager
  async getBuildingsForManager(managerId) {
    try {
      // Get manager's building assignments
      const managerRef = ref(database, `property_managers/${managerId}`);
      const managerSnapshot = await get(managerRef);
      
      if (!managerSnapshot.exists()) {
        return { success: false, error: 'Manager not found' };
      }
      
      const managerData = managerSnapshot.val();
      const assignedBuildings = managerData.assignedBuildings || [];
      
      // Get building data for assigned buildings
      const buildings = {};
      for (const buildingId of assignedBuildings) {
        const buildingResult = await this.getBuilding(buildingId);
        if (buildingResult.success) {
          buildings[buildingId] = buildingResult.data;
        }
      }
      
      return { success: true, buildings };
    } catch (error) {
      console.error('Error getting buildings for manager:', error);
      return { success: false, error: error.message };
    }
  },

  // Assign building to property manager
  async assignBuildingToManager(managerId, buildingId) {
    try {
      const managerRef = ref(database, `property_managers/${managerId}`);
      const snapshot = await get(managerRef);
      
      if (!snapshot.exists()) {
        return { success: false, error: 'Manager not found' };
      }
      
      const managerData = snapshot.val();
      const assignedBuildings = managerData.assignedBuildings || [];
      
      if (!assignedBuildings.includes(buildingId)) {
        assignedBuildings.push(buildingId);
        
        await update(managerRef, {
          assignedBuildings: assignedBuildings,
          updatedAt: Date.now()
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error assigning building:', error);
      return { success: false, error: error.message };
    }
  },

  // Add unit access codes to existing units
  async addUnitAccessCodes(buildingId, unitAccessCodes) {
    try {
      const updates = {};
      
      Object.entries(unitAccessCodes).forEach(([unitId, accessCode]) => {
        updates[`buildings/${buildingId}/units/${unitId}/accessCode`] = accessCode;
        updates[`buildings/${buildingId}/units/${unitId}/updatedAt`] = Date.now();
      });
      
      await update(ref(database), updates);
      return { success: true };
    } catch (error) {
      console.error('Error adding access codes:', error);
      return { success: false, error: error.message };
    }
  },

  // Update unit access code
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

  // Update tenant information for a unit
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

  // Subscribe to specific unit
  subscribeToUnit(buildingId, unitId, callback) {
    const unitRef = ref(database, `buildings/${buildingId}/units/${unitId}`);
    
    const unsubscribe = onValue(unitRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    });

    return () => off(unitRef);
  }
};

export default FirebaseService;