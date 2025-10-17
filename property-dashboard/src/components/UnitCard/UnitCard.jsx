import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { getUnitStatus } from '../../utils/calculations';
import styles from './UnitCard.module.css';

const UnitCard = ({ unitId, unit, onClick }) => {
  const status = getUnitStatus(unit);
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <CheckCircle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'critical': return <XCircle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  // Privacy-focused: Only show actionable status
  const getActionableStatus = (unit) => {
    const credit = parseFloat(unit.remaining_credit || 0);
    
    if (credit === 0) {
      return {
        status: "Unit disconnected",
        action: "Service interruption - requires intervention",
        priority: "critical"
      };
    } else if (credit < 500) {
      return {
        status: "Unit requires attention", 
        action: "Contact tenant for credit top-up",
        priority: "critical"
      };
    } else if (credit < 1000) {
      return {
        status: "Unit requires attention",
        action: "Low credit notification recommended", 
        priority: "warning"
      };
    } else {
      return {
        status: "Unit operational",
        action: "No action required",
        priority: "good"
      };
    }
  };

  const actionableStatus = getActionableStatus(unit);

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>{unitId.replace('unit_', 'House ')}</h3>
        </div>
        <span className={`${styles.status} ${styles[status]}`}>
          {getStatusIcon(status)}
          <span>{status}</span>
        </span>
      </div>
      
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Power</p>
          <p className={styles.metricValue}>{parseFloat(unit.power || 0).toFixed(1)}W</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Current</p>
          <p className={styles.metricValue}>{parseFloat(unit.current || 0).toFixed(2)}A</p>
        </div>
      </div>

      {/* Privacy-focused: Only show actionable information */}
      <div className={styles.actionableSection}>
        <div className={styles.statusInfo}>
          <span className={styles.statusLabel}>Service Status</span>
          <span className={`${styles.statusValue} ${styles[actionableStatus.priority]}`}>
            {actionableStatus.status}
          </span>
        </div>
        
        {actionableStatus.priority !== 'good' && (
          <div className={styles.actionRequired}>
            <p className={styles.actionText}>{actionableStatus.action}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitCard;