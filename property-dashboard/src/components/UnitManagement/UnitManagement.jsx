import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Copy, 
  Check,
  Power,
  Shield,
  AlertTriangle,
  Clock
} from 'lucide-react';
import FirebaseService from '../../services/firebase';
import AuthService from '../../services/auth';
import styles from './UnitManagement.module.css';

const UnitManagement = ({ property, buildingId, onPropertyUpdate }) => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showAccessCodes, setShowAccessCodes] = useState({});
  const [temporaryAccessCodes, setTemporaryAccessCodes] = useState({}); // Store plain codes temporarily
  const [copiedCodes, setCopiedCodes] = useState({});
  const [loading, setLoading] = useState({});
  const [newUnitName, setNewUnitName] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [codeTimers, setCodeTimers] = useState({}); // Track countdown timers

  const units = property?.units || {};
  const currentUser = AuthService.getCurrentUser();

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(codeTimers).forEach(clearInterval);
    };
  }, [codeTimers]);

  // Auto-hide access codes after 60 seconds
  const startCodeTimer = (unitId, plainCode) => {
    // Clear existing timer if any
    if (codeTimers[unitId]) {
      clearInterval(codeTimers[unitId]);
    }

    // Store the plain code temporarily
    setTemporaryAccessCodes(prev => ({
      ...prev,
      [unitId]: {
        code: plainCode,
        expiresAt: Date.now() + 60000 // 60 seconds from now
      }
    }));

    // Show the code
    setShowAccessCodes(prev => ({
      ...prev,
      [unitId]: true
    }));

    // Set timer to hide after 60 seconds
    const timer = setTimeout(() => {
      setShowAccessCodes(prev => ({
        ...prev,
        [unitId]: false
      }));
      
      setTemporaryAccessCodes(prev => {
        const newCodes = { ...prev };
        delete newCodes[unitId];
        return newCodes;
      });
      
      setCodeTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[unitId];
        return newTimers;
      });
    }, 60000);

    setCodeTimers(prev => ({
      ...prev,
      [unitId]: timer
    }));
  };

  // Toggle showing access code
  const toggleShowAccessCode = (unitId) => {
    const isCurrentlyVisible = showAccessCodes[unitId];
    
    if (isCurrentlyVisible) {
      // Hide the code
      setShowAccessCodes(prev => ({
        ...prev,
        [unitId]: false
      }));
      
      // Clear timer if exists
      if (codeTimers[unitId]) {
        clearTimeout(codeTimers[unitId]);
        setCodeTimers(prev => {
          const newTimers = { ...prev };
          delete newTimers[unitId];
          return newTimers;
        });
      }
      
      // Clear temporary code
      setTemporaryAccessCodes(prev => {
        const newCodes = { ...prev };
        delete newCodes[unitId];
        return newCodes;
      });
    } else {
      // Check if we have a temporary code
      const tempCode = temporaryAccessCodes[unitId];
      if (tempCode && tempCode.expiresAt > Date.now()) {
        // Still valid, just show it
        setShowAccessCodes(prev => ({
          ...prev,
          [unitId]: true
        }));
      } else {
        alert('Access code is hidden for security. Use "Reset Code" to generate and view a new one.');
      }
    }
  };

  // Copy access code to clipboard
  const copyAccessCode = async (unitId) => {
    const tempCode = temporaryAccessCodes[unitId];
    if (!tempCode || tempCode.expiresAt <= Date.now()) {
      alert('No access code available to copy. Reset the code first.');
      return;
    }

    try {
      await navigator.clipboard.writeText(tempCode.code);
      setCopiedCodes(prev => ({ ...prev, [unitId]: true }));
      
      setTimeout(() => {
        setCopiedCodes(prev => ({ ...prev, [unitId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy access code:', err);
    }
  };

  // Reset access code for a unit
  const resetAccessCode = async (unitId) => {
    setLoading(prev => ({ ...prev, [unitId]: true }));
    
    try {
      const newAccessCode = FirebaseService.generateUnitAccessCode();
      const result = await FirebaseService.updateUnitAccessCode(buildingId, unitId, newAccessCode);
      
      if (result.success) {
        // Start the 60-second timer with the new plain code
        startCodeTimer(unitId, result.plainAccessCode || newAccessCode);
        
        // Trigger property update to refresh data
        onPropertyUpdate();
      } else {
        alert('Failed to reset access code: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to reset access code:', error);
      alert('Failed to reset access code. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [unitId]: false }));
    }
  };

  // Add new unit
  const addNewUnit = async () => {
    if (!newUnitName.trim()) return;
    
    setAddingUnit(true);
    
    try {
      const result = await FirebaseService.addUnit(buildingId, newUnitName.trim());
      
      if (result.success) {
        setNewUnitName('');
        
        // Start timer for the new unit's access code
        if (result.plainAccessCode) {
          startCodeTimer(result.unitId, result.plainAccessCode);
        }
        
        onPropertyUpdate(); // Refresh the property data
      } else {
        console.error('Failed to add unit:', result.error);
        alert('Failed to add unit: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to add unit:', error);
      alert('Failed to add unit. Please try again.');
    } finally {
      setAddingUnit(false);
    }
  };

  // Deactivate unit
  const deactivateUnit = async (unitId) => {
    if (!confirm('Are you sure you want to deactivate this unit? This action cannot be undone.')) {
      return;
    }
    
    setLoading(prev => ({ ...prev, [`deactivate_${unitId}`]: true }));
    
    try {
      const result = await FirebaseService.deactivateUnit(buildingId, unitId);
      
      if (result.success) {
        onPropertyUpdate(); // Refresh the property data
        setSelectedUnit(null); // Close details panel
      } else {
        console.error('Failed to deactivate unit:', result.error);
        alert('Failed to deactivate unit: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to deactivate unit:', error);
      alert('Failed to deactivate unit. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [`deactivate_${unitId}`]: false }));
    }
  };

  // Get unit status
  const getUnitStatus = (unit) => {
    if (!unit.isActive) return 'inactive';
    const credit = parseFloat(unit.remaining_credit) || 0;
    if (credit < 500) return 'critical';
    if (credit < 1000) return 'warning';
    return 'active';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#84A98C';
      case 'warning': return '#E07A5F';
      case 'critical': return '#DC2626';
      case 'inactive': return '#9CA3AF';
      default: return '#9CA3AF';
    }
  };

  // Get remaining time for access code visibility
  const getRemainingTime = (unitId) => {
    const tempCode = temporaryAccessCodes[unitId];
    if (!tempCode) return 0;
    
    const remaining = Math.max(0, tempCode.expiresAt - Date.now());
    return Math.ceil(remaining / 1000); // Convert to seconds
  };

  return (
    <div className={styles.unitManagement}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>Unit Management</h2>
          <p className={styles.subtitle}>
            Manage access codes and tenant information for your units
          </p>
        </div>
        
        <div className={styles.headerActions}>
          <div className={styles.addUnitForm}>
            <input
              type="text"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="Unit name (e.g., House 5)"
              className={styles.addUnitInput}
              onKeyPress={(e) => e.key === 'Enter' && addNewUnit()}
            />
            <button
              onClick={addNewUnit}
              className={styles.addUnitBtn}
              disabled={addingUnit || !newUnitName.trim()}
            >
              <Plus size={18} />
              {addingUnit ? 'Adding...' : 'Add Unit'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.unitsGrid}>
        {Object.entries(units).map(([unitId, unit]) => {
          const status = getUnitStatus(unit);
          const isCodeVisible = showAccessCodes[unitId];
          const tempCode = temporaryAccessCodes[unitId];
          const isCopied = copiedCodes[unitId];
          const isResetting = loading[unitId];
          const isDeactivating = loading[`deactivate_${unitId}`];
          const remainingTime = getRemainingTime(unitId);

          return (
            <div key={unitId} className={styles.unitCard}>
              <div className={styles.unitHeader}>
                <div className={styles.unitInfo}>
                  <h3 className={styles.unitName}>{unit.name || unitId.replace('unit_', 'Unit ')}</h3>
                  <span 
                    className={styles.unitStatus}
                    style={{ backgroundColor: getStatusColor(status) }}
                  >
                    {status}
                  </span>
                </div>
              </div>

              <div className={styles.unitMetrics}>
                <div className={styles.metric}>
                  <Power size={16} />
                  <span>{parseFloat(unit.power || 0).toFixed(1)}W</span>
                </div>
              </div>

              <div className={styles.accessCodeSection}>
                <div className={styles.accessCodeHeader}>
                  <span className={styles.accessCodeLabel}>Access Code</span>
                  <div className={styles.accessCodeActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => toggleShowAccessCode(unitId)}
                      title={isCodeVisible ? 'Hide code' : 'Show code'}
                    >
                      {isCodeVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    
                    {isCodeVisible && tempCode && (
                      <button
                        className={styles.iconBtn}
                        onClick={() => copyAccessCode(unitId)}
                        title="Copy code"
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className={styles.accessCodeDisplay}>
                  {isCodeVisible && tempCode && tempCode.expiresAt > Date.now() ? (
                    <div className={styles.codeWithTimer}>
                      <span className={styles.accessCode}>{tempCode.code}</span>
                      <div className={styles.timer}>
                        <Clock size={12} />
                        <span>{remainingTime}s</span>
                      </div>
                    </div>
                  ) : (
                    <span className={styles.hiddenCode}>••••••••</span>
                  )}
                </div>
                
                <button
                  className={styles.resetBtn}
                  onClick={() => resetAccessCode(unitId)}
                  disabled={isResetting}
                >
                  <RotateCcw size={14} />
                  {isResetting ? 'Resetting...' : 'Reset Code'}
                </button>
                
                {isCodeVisible && tempCode && (
                  <div className={styles.securityNote}>
                    <small>🔒 Code visible for {remainingTime}s for security</small>
                  </div>
                )}
              </div>

              {selectedUnit === unitId && (
                <div className={styles.unitDetails}>
                  {unit.isActive && (
                    <div className={styles.dangerZone}>
                      <h4 className={styles.dangerTitle}>
                        <AlertTriangle size={16} />
                        Danger Zone
                      </h4>
                      
                      <button
                        className={styles.dangerBtn}
                        onClick={() => deactivateUnit(unitId)}
                        disabled={isDeactivating}
                      >
                        {isDeactivating ? 'Deactivating...' : 'Deactivate Unit'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UnitManagement;