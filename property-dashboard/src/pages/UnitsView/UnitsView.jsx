import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import UnitCard from '../../components/UnitCard/UnitCard';
import styles from './UnitsView.module.css';

const UnitsView = ({ units, onUnitClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const unitEntries = Object.entries(units || {});
  
  const filteredUnits = unitEntries.filter(([id]) =>
    id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.unitsView}>
      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <Search className={styles.searchIcon} size={20} />
          <input
            type="text"
            placeholder="Search units..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.input}
          />
        </div>
        <button className={styles.filterBtn}>
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </div>

      <div className={styles.header}>
        <h2 className={styles.title}>All Units ({filteredUnits.length})</h2>
      </div>

      {filteredUnits.length > 0 ? (
        <div className={styles.unitsGrid}>
          {filteredUnits.map(([unitId, unit]) => (
            <UnitCard
              key={unitId}
              unitId={unitId}
              unit={unit}
              onClick={() => onUnitClick(unitId)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>No units found matching your search</p>
        </div>
      )}
    </div>
  );
};

export default UnitsView;