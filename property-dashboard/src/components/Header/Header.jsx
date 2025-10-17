import { useState, useEffect } from 'react';
import { Bell, Download, User, LogOut, Settings } from 'lucide-react';
import NotificationModal from '../NotificationModal/NotificationModal';
import styles from './Header.module.css';

const Header = ({ 
  buildingName, 
  alertCount, 
  onDownloadReport, 
  currentUser,
  onLogout,
  units
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Generate notifications from unit data
  useEffect(() => {
    if (!units) return;
    
    const generateNotifications = () => {
      const newNotifications = [];
      
      Object.entries(units).forEach(([unitId, unit]) => {
        const credit = parseFloat(unit.remaining_credit || 0);
        const power = parseFloat(unit.power || 0);
        const timestamp = Date.now() - Math.random() * 3600000; // Random time within last hour
        
        if (credit === 0) {
          newNotifications.push({
            id: `${unitId}_disconnected_${timestamp}`,
            type: 'critical',
            message: `${unitId.replace('unit_', 'House ')} has been disconnected due to no credit`,
            action: 'Immediate service restoration required',
            unitId,
            timestamp,
            read: false
          });
        } else if (credit < 500) {
          newNotifications.push({
            id: `${unitId}_critical_${timestamp}`,
            type: 'critical', 
            message: `${unitId.replace('unit_', 'House ')} requires immediate attention - critical low credit`,
            action: 'Contact tenant for urgent credit top-up',
            unitId,
            timestamp,
            read: false
          });
        } else if (credit < 1000) {
          newNotifications.push({
            id: `${unitId}_warning_${timestamp}`,
            type: 'warning',
            message: `${unitId.replace('unit_', 'House ')} requires attention - low credit notification recommended`,
            action: 'Send low credit notification to tenant',
            unitId,
            timestamp,
            read: false
          });
        }
        
        // High power consumption notifications
        if (power > 1500) {
          newNotifications.push({
            id: `${unitId}_highpower_${timestamp}`,
            type: 'warning',
            message: `${unitId.replace('unit_', 'House ')} showing high power consumption`,
            action: 'Monitor for potential issues',
            unitId,
            timestamp: timestamp + 1000,
            read: false
          });
        }
      });
      
      // Sort by timestamp (newest first)
      newNotifications.sort((a, b) => b.timestamp - a.timestamp);
      
      setNotifications(newNotifications);
    };
    
    generateNotifications();
  }, [units]);

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false); // Close notifications when opening user menu
  };

  const handleNotificationToggle = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false); // Close user menu when opening notifications
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout();
  };

  const handleMarkAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-container') && !event.target.closest('.user-menu-container')) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

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
            {/* Notification Button */}
            <div className="notification-container" style={{ position: 'relative' }}>
              <button 
                className={styles.iconBtn} 
                onClick={handleNotificationToggle}
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount}</span>
                )}
              </button>

              <NotificationModal
                notifications={notifications}
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                onMarkAsRead={handleMarkAsRead}
                onClearAll={handleClearAll}
              />
            </div>

            <button 
              className={styles.primaryBtn}
              onClick={onDownloadReport}
            >
              <Download size={18} />
              <span className={styles.btnText}>Export Report</span>
            </button>

            {/* User Menu */}
            <div className={`${styles.userMenu} user-menu-container`}>
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
    </header>
  );
};

export default Header;