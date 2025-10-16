import React from 'react';
import { LayoutDashboard, Zap, TrendingUp, Settings } from 'lucide-react';
import styles from './Navigation.module.css';

const Navigation = ({ activeView, onViewChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'units', label: 'Units', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'management', label: 'Management', icon: Settings }
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.navList}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={() => onViewChange(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;