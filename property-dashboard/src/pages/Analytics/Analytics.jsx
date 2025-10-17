// src/pages/Analytics/Analytics.jsx
import React from 'react';
import styles from './Analytics.module.css';

const Analytics = ({ units }) => {
  const unitEntries = Object.entries(units || {});
  
  // Privacy-focused: Only show operational status
  const getOperationalStatus = (unit) => {
    const credit = parseFloat(unit.remaining_credit || 0);
    
    if (credit === 0) return "Disconnected";
    if (credit < 500) return "Critical";
    if (credit < 1000) return "Attention Required";
    return "Operational";
  };
  
  return (
    <div className={styles.analytics}>
      <div className={styles.header}>
        <h2 className={styles.title}>Unit Status Overview</h2>
        <p className={styles.subtitle}>Operational status and power metrics</p>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Status</th>
                <th>Power (W)</th>
                <th>Current (A)</th>
                <th>Voltage (V)</th>
              </tr>
            </thead>
            <tbody>
              {unitEntries.map(([unitId, unit]) => (
                <tr key={unitId}>
                  <td>
                    <div className={styles.unitCell}>
                      {unitId.replace('unit_', 'House ')}
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.statusCell} ${styles[getOperationalStatus(unit).toLowerCase().replace(' ', '')]}`}>
                      {getOperationalStatus(unit)}
                    </div>
                  </td>
                  <td>
                    <div className={styles.valueCell}>
                      {parseFloat(unit.power || 0).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <div className={styles.valueCell}>
                      {parseFloat(unit.current || 0).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <div className={styles.valueCell}>
                      {parseFloat(unit.voltage || 0).toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;