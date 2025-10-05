import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

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
  // Subscribe to all buildings data
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

  // Subscribe to specific building
  subscribeToBuilding(buildingId, callback) {
    const buildingRef = ref(database, `buildings/${buildingId}`);
    
    const unsubscribe = onValue(buildingRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    });

    return () => off(buildingRef);
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