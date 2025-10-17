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

  const TARIFF_RATE = 209.5;

  const MAX_UNITS = 100;

  const remainingUnits = parseFloat(unit.remaining_credit || 0) / TARIFF_RATE;

  const creditPercentage = Math.min((remainingUnits / MAX_UNITS) * 100, 100);

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

      <div className={styles.creditSection}>
        <div className={styles.creditInfo}>
          <span className={styles.creditLabel}>Credit Remaining</span>
          <span className={styles.creditValue}>₦{parseFloat(unit.remaining_credit || 0).toFixed(2)}</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${creditPercentage}%` }}
          />
        </div>
        <p className={styles.unitsRemaining}>
          {remainingUnits.toFixed(1)} kWh remaining
        </p>
      </div>

      {/* <div className={styles.timestamp}>
        Last update: {unit.timestamp || 'N/A'}
      </div> */}
    </div>
  );
};

export default UnitCard;