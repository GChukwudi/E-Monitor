import { getDatabase, ref, set, get } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

class NotificationService {
  constructor() {
    this.database = getDatabase();
    this.functions = getFunctions();
  }

  // Send alert notification
  async sendAlert(managerId, alertType, message, unitId = null) {
    try {
      const alertData = {
        managerId,
        alertType, // 'low_credit', 'high_consumption', 'unit_offline', etc.
        message,
        unitId,
        timestamp: Date.now(),
        read: false,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Save to database
      const alertRef = ref(this.database, `alerts/${managerId}/${alertData.id}`);
      await set(alertRef, alertData);

      // Send push notification if enabled
      await this.sendPushNotification(managerId, {
        title: 'Energy Monitor Alert',
        body: message,
        data: {
          alertType,
          unitId,
          managerId
        }
      });

      return { success: true, alertId: alertData.id };
    } catch (error) {
      console.error('Error sending alert:', error);
      return { success: false, error: error.message };
    }
  }

  // Send push notification via Firebase Cloud Functions
  async sendPushNotification(managerId, notificationData) {
    try {
      const sendNotification = httpsCallable(this.functions, 'sendNotification');
      const result = await sendNotification({
        managerId,
        notification: notificationData
      });

      return result.data;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification (for critical alerts)
  async sendSMSAlert(phoneNumber, message) {
    try {
      const sendSMS = httpsCallable(this.functions, 'sendSMS');
      const result = await sendSMS({
        phoneNumber,
        message
      });

      return result.data;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Get alerts for manager
  async getAlerts(managerId, limit = 50) {
    try {
      const alertsRef = ref(this.database, `alerts/${managerId}`);
      const snapshot = await get(alertsRef);
      
      if (!snapshot.exists()) {
        return { success: true, alerts: [] };
      }

      const alertsData = snapshot.val();
      const alerts = Object.values(alertsData)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return { success: true, alerts };
    } catch (error) {
      console.error('Error getting alerts:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark alert as read
  async markAlertAsRead(managerId, alertId) {
    try {
      const alertRef = ref(this.database, `alerts/${managerId}/${alertId}`);
      await set(alertRef, { read: true });
      
      return { success: true };
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Auto-generate alerts based on unit data
  async checkAndGenerateAlerts(managerId, units) {
    const alerts = [];

    for (const [unitId, unit] of Object.entries(units)) {
      const credit = parseFloat(unit.remainingCredit) || 0;
      const power = parseFloat(unit.power) || 0;
      
      // Critical low credit alert
      if (credit < 500 && credit > 0) {
        alerts.push({
          type: 'critical_low_credit',
          message: `${unit.name}: Critical low credit - ₦${credit.toFixed(2)} remaining`,
          unitId
        });
      }
      
      // Low credit warning
      else if (credit < 1000 && credit >= 500) {
        alerts.push({
          type: 'low_credit',
          message: `${unit.name}: Low credit warning - ₦${credit.toFixed(2)} remaining`,
          unitId
        });
      }
      
      // High power consumption
      if (power > 1500) {
        alerts.push({
          type: 'high_consumption',
          message: `${unit.name}: High power consumption detected - ${power.toFixed(2)}W`,
          unitId
        });
      }
      
      // Unit offline (no recent data)
      const lastUpdate = new Date(unit.timestamp);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > 2) {
        alerts.push({
          type: 'unit_offline',
          message: `${unit.name}: No data received for ${Math.floor(hoursSinceUpdate)} hours`,
          unitId
        });
      }
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(managerId, alert.type, alert.message, alert.unitId);
    }

    return alerts;
  }

  // Store FCM token for manager
  async storeFCMToken(managerId, token) {
    try {
      const tokenRef = ref(this.database, `fcm_tokens/${managerId}`);
      await set(tokenRef, {
        token,
        updatedAt: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error storing FCM token:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationService();