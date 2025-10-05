import { AlertTriangle } from 'lucide-react';
import styles from './AlertBanner.module.css';

const AlertBanner = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <AlertTriangle className={styles.icon} size={20} />
        <div className={styles.info}>
          <h3 className={styles.title}>Active Alerts ({alerts.length})</h3>
          <ul className={styles.list}>
            {alerts.map((alert, idx) => (
              <li key={idx} className={styles.item}>{alert}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;