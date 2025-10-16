import React, { useState } from 'react';
import { 
  Plus, 
  RotateCcw, 
  Settings, 
  Eye, 
  EyeOff, 
  Copy, 
  Check,
  User,
  Power,
  Shield,
  AlertTriangle
} from 'lucide-react';
import PropertyService from '../../services/propertyService';
import AuthService from '../../services/auth';
import styles from './UnitManagement.module.css';

const UnitManagement = ({ property, buildingId, onPropertyUpdate }) => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showAccessCodes, setShowAccessCodes] = useState({});
  const [copiedCodes, setCopiedCodes] = useState({});
  const [loading, setLoading] = useState({});

  const units = property?.units || {};
  const manager = AuthService.getCurrentUser();

  const resetAccessCode = async (unitId) => {
    setLoading(prev => ({ ...prev, [unitId]: true }));
    
    try {
      const result = await FirebaseService.updateUnitAccessCode(buildingId, unitId, AuthService.generateUnitAccessCode());
      
      if (result.success) {
        // Trigger property update to refresh data
        onPropertyUpdate();
        
        // Show the new access code temporarily
        setShowAccessCodes(prev => ({
          ...prev,
          [unitId]: true
        }));
        
        setTimeout(() => {
          setShowAccessCodes(prev => ({
            ...prev,
            [unitId]: false
          }));
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to reset access code:', error);
    } finally {
      setLoading(prev => ({ ...prev, [unitId]: false }));
    }
  };

  const updateTenantInfo = async (unitId, tenantInfo) => {
    try {
      const result = await FirebaseService.updateUnitTenantInfo(buildingId, unitId, tenantInfo);
      
      if (result.success) {
        onPropertyUpdate();
      }
    } catch (error) {
      console.error('Failed to update tenant info:', error);
    }
  };

  const getUnitStatus = (unit) => {
    if (!unit.isActive) return 'inactive';
    const credit = parseFloat(unit.remainingCredit) || 0;
    if (credit < 500) return 'critical';
    if (credit < 1000) return 'warning';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#84A98C';
      case 'warning': return '#E07A5F';
      case 'critical': return '#DC2626';
      case 'inactive': return '#9CA3AF';
      default: return '#9CA3AF';
    }
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
          const isCopied = copiedCodes[unitId];
          const isResetting = loading[unitId];
          const isDeactivating = loading[`deactivate_${unitId}`];

          return (
            <div key={unitId} className={styles.unitCard}>
              <div className={styles.unitHeader}>
                <div className={styles.unitInfo}>
                  <h3 className={styles.unitName}>{unit.name}</h3>
                  <span 
                    className={styles.unitStatus}
                    style={{ backgroundColor: getStatusColor(status) }}
                  >
                    {status}
                  </span>
                </div>
                
                <div className={styles.unitActions}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => setSelectedUnit(selectedUnit === unitId ? null : unitId)}
                    title="View details"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              <div className={styles.unitMetrics}>
                <div className={styles.metric}>
                  <Power size={16} />
                  <span>{parseFloat(unit.power || 0).toFixed(1)}W</span>
                </div>
                <div className={styles.metric}>
                  <Shield size={16} />
                  <span>₦{parseFloat(unit.remainingCredit || 0).toFixed(2)}</span>
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
                    
                    {isCodeVisible && (
                      <button
                        className={styles.iconBtn}
                        onClick={() => copyAccessCode(unitId, unit.accessCode)}
                        title="Copy code"
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className={styles.accessCodeDisplay}>
                  {isCodeVisible ? (
                    <span className={styles.accessCode}>{unit.accessCode}</span>
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
              </div>

              {selectedUnit === unitId && (
                <div className={styles.unitDetails}>
                  <div className={styles.tenantSection}>
                    <h4 className={styles.sectionTitle}>
                      <User size={16} />
                      Tenant Information
                    </h4>
                    
                    <TenantInfoForm
                      tenantInfo={unit.tenantInfo}
                      onSave={(info) => updateTenantInfo(unitId, info)}
                    />
                  </div>

                  <div className={styles.dangerZone}>
                    <h4 className={styles.dangerTitle}>
                      <AlertTriangle size={16} />
                      Danger Zone
                    </h4>
                    
                    <button
                      className={styles.dangerBtn}
                      onClick={() => deactivateUnit(unitId)}
                      disabled={isDeactivating || !unit.isActive}
                    >
                      {isDeactivating ? 'Deactivating...' : 'Deactivate Unit'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Tenant Information Form Component
const TenantInfoForm = ({ tenantInfo, onSave }) => {
  const [formData, setFormData] = useState({
    name: tenantInfo?.name || '',
    phone: tenantInfo?.phone || '',
    email: tenantInfo?.email || '',
    moveInDate: tenantInfo?.moveInDate || '',
    notes: tenantInfo?.notes || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save tenant info:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: tenantInfo?.name || '',
      phone: tenantInfo?.phone || '',
      email: tenantInfo?.email || '',
      moveInDate: tenantInfo?.moveInDate || '',
      notes: tenantInfo?.notes || ''
    });
    setIsEditing(false);
  };

  if (!isEditing && !tenantInfo?.name) {
    return (
      <div className={styles.emptyTenant}>
        <p>No tenant information added</p>
        <button 
          className={styles.addTenantBtn}
          onClick={() => setIsEditing(true)}
        >
          Add Tenant Info
        </button>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className={styles.tenantDisplay}>
        <div className={styles.tenantInfo}>
          <p><strong>Name:</strong> {tenantInfo.name}</p>
          {tenantInfo.phone && <p><strong>Phone:</strong> {tenantInfo.phone}</p>}
          {tenantInfo.email && <p><strong>Email:</strong> {tenantInfo.email}</p>}
          {tenantInfo.moveInDate && <p><strong>Move-in Date:</strong> {tenantInfo.moveInDate}</p>}
          {tenantInfo.notes && <p><strong>Notes:</strong> {tenantInfo.notes}</p>}
        </div>
        <button 
          className={styles.editBtn}
          onClick={() => setIsEditing(true)}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className={styles.tenantForm}>
      <div className={styles.formRow}>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Tenant name"
          className={styles.formInput}
        />
      </div>
      
      <div className={styles.formRow}>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          placeholder="Phone number"
          className={styles.formInput}
        />
      </div>
      
      <div className={styles.formRow}>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Email address"
          className={styles.formInput}
        />
      </div>
      
      <div className={styles.formRow}>
        <input
          type="date"
          name="moveInDate"
          value={formData.moveInDate}
          onChange={handleInputChange}
          className={styles.formInput}
        />
      </div>
      
      <div className={styles.formRow}>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="Additional notes"
          className={styles.formTextarea}
          rows={3}
        />
      </div>
      
      <div className={styles.formActions}>
        <button 
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button 
          className={styles.cancelBtn}
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default UnitManagement;