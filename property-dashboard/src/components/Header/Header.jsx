// src/components/Header/Header.jsx
import React from 'react';
import { Bell, Settings, Download, Menu, X } from 'lucide-react';
import styles from './Header.module.css';

const Header = ({ 
  buildingName, 
  alertCount, 
  onDownloadReport, 
  onToggleMobileMenu,
  showMobileMenu 
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.left}>
            {/* <button 
              className={styles.mobileMenuBtn}
              onClick={onToggleMobileMenu}
              aria-label="Toggle menu"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button> */}
            <div className={styles.branding}>
              <h1 className={styles.title}>E Monitor</h1>
              <p className={styles.subtitle}>{buildingName || 'Building'}</p>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.iconBtn} aria-label="Notifications">
              <Bell size={20} />
              {alertCount > 0 && (
                <span className={styles.badge}>{alertCount}</span>
              )}
            </button>

            {/* <button className={styles.iconBtn} aria-label="Settings">
              <Settings size={20} />
            </button> */}

            <button 
              className={styles.primaryBtn}
              onClick={onDownloadReport}
            >
              <Download size={18} />
              <span className={styles.btnText}>Export Report</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;