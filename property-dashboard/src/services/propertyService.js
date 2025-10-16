import { getDatabase, ref, get, set, update, remove } from 'firebase/database';
import AuthService from './auth';
import FirebaseService from './firebase';

class PropertyService {
  constructor() {
    this.database = getDatabase();
  }

  // Get manager's assigned buildings
  async getManagerBuildings(managerId) {
    try {
      return await FirebaseService.getBuildingsForManager(managerId);
    } catch (error) {
      console.error('Error getting manager buildings:', error);
      return { success: false, error: error.message };
    }
  }

  // Assign existing building to manager
  async assignExistingBuilding(managerId, buildingId) {
    try {
      // Check if building exists
      const buildingResult = await FirebaseService.getBuilding(buildingId);
      if (!buildingResult.success) {
        return { success: false, error: 'Building not found' };
      }

      // Assign building to manager
      const assignResult = await FirebaseService.assignBuildingToManager(managerId, buildingId);
      if (!assignResult.success) {
        return assignResult;
      }

      // Generate access codes for units that don't have them
      const building = buildingResult.data;
      const units = building.units || {};
      const unitAccessCodes = {};
      
      Object.keys(units).forEach(unitId => {
        if (!units[unitId].accessCode) {
          unitAccessCodes[unitId] = AuthService.generateUnitAccessCode();
        }
      });

      if (Object.keys(unitAccessCodes).length > 0) {
        await FirebaseService.addUnitAccessCodes(buildingId, unitAccessCodes);
      }

      return { success: true, building: buildingResult.data };
    } catch (error) {
      console.error('Error assigning building:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup manager with existing building
  async setupManagerWithBuilding(managerId, buildingId, managerData = {}) {
    try {
      // Update manager record
      const managerRef = ref(this.database, `property_managers/${managerId}`);
      await update(managerRef, {
        ...managerData,
        assignedBuildings: [buildingId],
        setupCompletedAt: Date.now(),
        updatedAt: Date.now()
      });

      // Assign the building
      const result = await this.assignExistingBuilding(managerId, buildingId);
      return result;
    } catch (error) {
      console.error('Error setting up manager with building:', error);
      return { success: false, error: error.message };
    }
  }

  // Get primary building for manager (for single building managers)
  async getPrimaryBuilding(managerId) {
    try {
      const buildingsResult = await this.getManagerBuildings(managerId);
      
      if (!buildingsResult.success) {
        return buildingsResult;
      }

      const buildings = buildingsResult.buildings;
      const buildingIds = Object.keys(buildings);
      
      if (buildingIds.length === 0) {
        return { success: false, error: 'No buildings assigned' };
      }

      // Return first building for now (you can implement primary building logic later)
      const primaryBuildingId = buildingIds[0];
      return { 
        success: true, 
        building: buildings[primaryBuildingId],
        buildingId: primaryBuildingId
      };
    } catch (error) {
      console.error('Error getting primary building:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset unit access code
  async resetUnitAccessCode(buildingId, unitId) {
    try {
      const newAccessCode = AuthService.generateUnitAccessCode();
      const result = await FirebaseService.updateUnitAccessCode(buildingId, unitId, newAccessCode);
      
      if (result.success) {
        return { success: true, accessCode: newAccessCode };
      }
      
      return result;
    } catch (error) {
      console.error('Error resetting unit access code:', error);
      return { success: false, error: error.message };
    }
  }

  // Update unit tenant information
  async updateUnitTenantInfo(buildingId, unitId, tenantInfo) {
    try {
      return await FirebaseService.updateUnitTenantInfo(buildingId, unitId, tenantInfo);
    } catch (error) {
      console.error('Error updating tenant info:', error);
      return { success: false, error: error.message };
    }
  }

  // Get unit by access code (for tenant login)
  async getUnitByAccessCode(accessCode) {
    try {
      // Search through all buildings to find matching access code
      const buildingsRef = ref(this.database, 'buildings');
      const snapshot = await get(buildingsRef);
      
      if (!snapshot.exists()) {
        return { success: false, error: 'No buildings found' };
      }
      
      const buildings = snapshot.val();
      
      for (const [buildingId, building] of Object.entries(buildings)) {
        if (building.units) {
          for (const [unitId, unit] of Object.entries(building.units)) {
            if (unit.accessCode === accessCode) {
              return { 
                success: true, 
                unit: { 
                  ...unit, 
                  buildingId, 
                  buildingName: building.name 
                } 
              };
            }
          }
        }
      }
      
      return { success: false, error: 'Invalid access code' };
    } catch (error) {
      console.error('Error finding unit by access code:', error);
      return { success: false, error: error.message };
    }
  }

  // Subscribe to building updates
  subscribeToBuilding(buildingId, callback) {
    return FirebaseService.subscribeToBuilding(buildingId, callback);
  }

  // Get building statistics
  getBuildingStats(building) {
    const units = building.units || {};
    const unitEntries = Object.entries(units);
    
    if (unitEntries.length === 0) {
      return {
        totalUnits: 0,
        activeUnits: 0,
        totalPower: 0,
        totalCredit: 0,
        avgCurrent: 0,
        avgVoltage: 0,
        totalRemainingUnits: 0,
        lowCreditUnits: 0,
        criticalUnits: 0
      };
    }
    
    const totalPower = unitEntries.reduce((sum, [_, unit]) => {
      return sum + (parseFloat(unit.power) || 0);
    }, 0);

    const totalCredit = unitEntries.reduce((sum, [_, unit]) => {
      return sum + (parseFloat(unit.remaining_credit) || 0);
    }, 0);

    const totalRemainingUnits = unitEntries.reduce((sum, [_, unit]) => {
      return sum + (parseFloat(unit.remaining_units) || 0);
    }, 0);

    const avgCurrent = unitEntries.reduce((sum, [_, unit]) => {
      return sum + (parseFloat(unit.current) || 0);
    }, 0) / unitEntries.length;

    const avgVoltage = unitEntries.reduce((sum, [_, unit]) => {
      return sum + (parseFloat(unit.voltage) || 0);
    }, 0) / unitEntries.length;

    const lowCreditUnits = unitEntries.filter(([_, unit]) => 
      parseFloat(unit.remaining_credit || 0) < 1000
    ).length;

    const criticalUnits = unitEntries.filter(([_, unit]) => 
      parseFloat(unit.remaining_credit || 0) < 500
    ).length;

    return {
      totalUnits: unitEntries.length,
      activeUnits: unitEntries.filter(([_, unit]) => 
        parseFloat(unit.power || 0) > 0
      ).length,
      totalPower: totalPower.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      avgCurrent: avgCurrent.toFixed(2),
      avgVoltage: avgVoltage.toFixed(2),
      totalRemainingUnits: totalRemainingUnits.toFixed(2),
      lowCreditUnits,
      criticalUnits
    };
  }
}

export default new PropertyService();