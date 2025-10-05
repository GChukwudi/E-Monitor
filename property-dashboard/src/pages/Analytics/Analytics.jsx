// src/pages/Analytics/Analytics.jsx
import React from 'react';
import styles from './Analytics.module.css';

const Analytics = ({ units }) => {
  const unitEntries = Object.entries(units || {});
  
  return (
    <div className={styles.analytics}>
      <div className={styles.header}>
        <h2 className={styles.title}>Detailed Unit Metrics</h2>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Power (W)</th>
                <th>Current (A)</th>
                <th>Voltage (V)</th>
                <th>Credit</th>
                <th>Last Update</th>
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
                  <td>
                    <div className={styles.creditCell}>
                      ₦{parseFloat(unit.remaining_credit || 0).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <div className={styles.timestampCell}>
                      {unit.timestamp || 'N/A'}
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