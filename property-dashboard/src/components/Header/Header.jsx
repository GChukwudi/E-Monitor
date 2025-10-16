// src/components/Header/Header.jsx - Updated with user management
import React, { useState } from 'react';
import { Bell, Download, Menu, X, User, LogOut, Settings } from 'lucide-react';
import styles from './Header.module.css';

const Header = ({ 
  buildingName, 
  alertCount, 
  onDownloadReport, 
  onToggleMobileMenu,
  showMobileMenu,
  currentUser,
  onLogout
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout();
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.branding}>
              <h1 className={styles.title}>E Monitor</h1>
              <p className={styles.subtitle}>{buildingName || 'Property Dashboard'}</p>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.iconBtn} aria-label="Notifications">
              <Bell size={20} />
              {alertCount > 0 && (
                <span className={styles.badge}>{alertCount}</span>
              )}
            </button>

            <button 
              className={styles.primaryBtn}
              onClick={onDownloadReport}
            >
              <Download size={18} />
              <span className={styles.btnText}>Export Report</span>
            </button>

            {/* User Menu */}
            <div className={styles.userMenu}>
              <button 
                className={styles.userBtn}
                onClick={handleUserMenuToggle}
                aria-label="User menu"
              >
                <User size={20} />
                <span className={styles.userName}>
                  {currentUser?.propertyName || 'Property Manager'}
                </span>
              </button>

              {showUserMenu && (
                <div className={styles.userDropdown}>
                  <div className={styles.userInfo}>
                    <div className={styles.userDetails}>
                      <p className={styles.userNameFull}>{currentUser?.propertyName}</p>
                      <p className={styles.userPhone}>{currentUser?.mobileNumber}</p>
                    </div>
                  </div>
                  
                  <div className={styles.menuDivider}></div>
                  
                  <button className={styles.menuItem}>
                    <Settings size={16} />
                    Account Settings
                  </button>
                  
                  <button 
                    className={`${styles.menuItem} ${styles.logoutItem}`}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className={styles.overlay}
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};

export default Header;