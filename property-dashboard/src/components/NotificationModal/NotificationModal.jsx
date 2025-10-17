import { AlertTriangle, CheckCircle, XCircle, X, Clock } from 'lucide-react';
import styles from './NotificationModal.module.css';

const NotificationModal = ({ notifications, isOpen, onClose, onMarkAsRead, onClearAll }) => {
  if (!isOpen) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'critical':
      case 'disconnected':
        return <XCircle size={16} className={styles.criticalIcon} />;
      case 'warning':
      case 'attention':
        return <AlertTriangle size={16} className={styles.warningIcon} />;
      case 'success':
      case 'operational':
        return <CheckCircle size={16} className={styles.successIcon} />;
      default:
        return <Clock size={16} className={styles.defaultIcon} />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />
      
      {/* Modal */}
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3 className={styles.title}>Notifications</h3>
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount} new</span>
            )}
          </div>
          <div className={styles.headerActions}>
            {notifications.length > 0 && (
              <button 
                className={styles.clearButton}
                onClick={onClearAll}
              >
                Clear all
              </button>
            )}
            <button 
              className={styles.closeButton}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {notifications.length === 0 ? (
            <div className={styles.empty}>
              <CheckCircle size={48} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>All caught up!</p>
              <p className={styles.emptySubtitle}>No new notifications</p>
            </div>
          ) : (
            <div className={styles.notificationList}>
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationMessage}>
                      {notification.message}
                    </p>
                    
                    <div className={styles.notificationMeta}>
                      <span className={styles.notificationTime}>
                        {getTimeAgo(notification.timestamp)}
                      </span>
                      {notification.unitId && (
                        <span className={styles.notificationUnit}>
                          {notification.unitId.replace('unit_', 'House ')}
                        </span>
                      )}
                    </div>
                    
                    {notification.action && (
                      <p className={styles.notificationAction}>
                        Action: {notification.action}
                      </p>
                    )}
                  </div>

                  {!notification.read && (
                    <div className={styles.unreadDot} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 5 && (
          <div className={styles.footer}>
            <button className={styles.viewAllButton}>
              View all notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationModal;