// property-dashboard/src/services/historicalDataService.js
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { getDatabase, ref as dbRef, onValue, off } from 'firebase/database';

class HistoricalDataService {
  constructor() {
    this.storage = getStorage();
    this.database = getDatabase();
    this.dataBuffer = new Map(); // Buffer for collecting real-time data
    this.aggregationTimers = new Map(); // Timers for periodic aggregation
    this.isInitialized = false;
  }

  // Initialize the service
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('Historical Data Service initialized');
  }

  // Start monitoring a building for historical data collection
  startHistoricalDataCollection(buildingId) {
    console.log(`Starting historical data collection for ${buildingId}`);
    
    // Stop any existing collection for this building
    this.stopHistoricalDataCollection(buildingId);
    
    const buildingRef = dbRef(this.database, `buildings/${buildingId}/units`);
    
    // Listen to real-time changes
    const unsubscribe = onValue(buildingRef, (snapshot) => {
      if (snapshot.exists()) {
        const units = snapshot.val();
        this.processRealtimeData(buildingId, units);
      }
    }, (error) => {
      console.error('Error listening to building data:', error);
    });

    // Set up periodic aggregation (every 10 minutes for testing, hourly for production)
    const aggregationInterval = process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 10 * 60 * 1000;
    const hourlyTimer = setInterval(() => {
      this.aggregateHourlyData(buildingId);
    }, aggregationInterval);

    // Set up daily aggregation (at midnight or every hour for testing)
    const dailyInterval = process.env.NODE_ENV === 'production' ? this.getTimeUntilMidnight() : 60 * 60 * 1000;
    const dailyTimer = setTimeout(() => {
      this.aggregateDailyData(buildingId);
      
      // Set up recurring daily timer
      const recurringDaily = setInterval(() => {
        this.aggregateDailyData(buildingId);
      }, 24 * 60 * 60 * 1000);

      this.aggregationTimers.set(`${buildingId}_recurring_daily`, recurringDaily);
    }, dailyInterval);

    // Store timers and listener for cleanup
    this.aggregationTimers.set(`${buildingId}_hourly`, hourlyTimer);
    this.aggregationTimers.set(`${buildingId}_daily`, dailyTimer);
    this.aggregationTimers.set(`${buildingId}_listener`, unsubscribe);
    
    console.log(`Historical data collection started for ${buildingId}`);
  }

  // Get time until midnight for daily aggregation
  getTimeUntilMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  // Process incoming real-time data
  processRealtimeData(buildingId, units) {
    const timestamp = new Date();
    const hour = timestamp.getHours();
    const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourKey = `${dateKey}-${hour.toString().padStart(2, '0')}`;

    Object.entries(units).forEach(([unitId, unitData]) => {
      if (!(unitData.isActive ?? true)) return;

      const bufferKey = `${buildingId}_${unitId}`;
      
      if (!this.dataBuffer.has(bufferKey)) {
        this.dataBuffer.set(bufferKey, {
          hourly: new Map(),
          daily: new Map()
        });
      }

      const buffer = this.dataBuffer.get(bufferKey);

      // Create data point
      const dataPoint = {
        timestamp: timestamp.toISOString(),
        power: parseFloat(unitData.power || 0),
        current: parseFloat(unitData.current || 0),
        voltage: parseFloat(unitData.voltage || 0),
        remainingCredit: parseFloat(unitData.remaining_credit || 0),
        remainingUnits: parseFloat(unitData.remaining_units || 0)
      };

      // Store hourly data point
      if (!buffer.hourly.has(hourKey)) {
        buffer.hourly.set(hourKey, []);
      }
      buffer.hourly.get(hourKey).push(dataPoint);

      // Store daily data point
      if (!buffer.daily.has(dateKey)) {
        buffer.daily.set(dateKey, []);
      }
      buffer.daily.get(dateKey).push(dataPoint);

      // Keep buffer size manageable (last 48 hours only)
      this.cleanupBuffer(buffer, timestamp);
    });
  }

  // Clean up old buffer data
  cleanupBuffer(buffer, currentTime) {
    const twoDaysAgo = new Date(currentTime.getTime() - 48 * 60 * 60 * 1000);
    const cutoffDate = twoDaysAgo.toISOString().split('T')[0];
    const cutoffHour = `${cutoffDate}-${twoDaysAgo.getHours().toString().padStart(2, '0')}`;

    // Clean hourly buffer
    for (const hourKey of buffer.hourly.keys()) {
      if (hourKey < cutoffHour) {
        buffer.hourly.delete(hourKey);
      }
    }

    // Clean daily buffer
    for (const dateKey of buffer.daily.keys()) {
      if (dateKey < cutoffDate) {
        buffer.daily.delete(dateKey);
      }
    }
  }

  // Aggregate and save hourly data
  async aggregateHourlyData(buildingId) {
    console.log(`Aggregating hourly data for ${buildingId}`);
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const hourKey = `${oneHourAgo.toISOString().split('T')[0]}-${oneHourAgo.getHours().toString().padStart(2, '0')}`;
    
    for (const [bufferKey, buffer] of this.dataBuffer.entries()) {
      if (!bufferKey.startsWith(buildingId)) continue;
      
      const unitId = bufferKey.split('_')[1];
      
      if (buffer.hourly.has(hourKey)) {
        const hourlyData = buffer.hourly.get(hourKey);
        if (hourlyData.length === 0) continue;
        
        const aggregated = this.aggregateDataPoints(hourlyData);
        await this.saveHourlyData(buildingId, unitId, hourKey, aggregated);
        
        // Remove processed data from buffer
        buffer.hourly.delete(hourKey);
        console.log(`Processed hourly data for ${unitId}: ${hourKey}`);
      }
    }
  }

  // Aggregate and save daily data
  async aggregateDailyData(buildingId) {
    console.log(`Aggregating daily data for ${buildingId}`);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split('T')[0];
    
    for (const [bufferKey, buffer] of this.dataBuffer.entries()) {
      if (!bufferKey.startsWith(buildingId)) continue;
      
      const unitId = bufferKey.split('_')[1];
      
      if (buffer.daily.has(dateKey)) {
        const dailyData = buffer.daily.get(dateKey);
        if (dailyData.length === 0) continue;
        
        const aggregated = this.aggregateDataPoints(dailyData);
        await this.saveDailyData(buildingId, unitId, dateKey, aggregated);
        
        // Remove processed data from buffer
        buffer.daily.delete(dateKey);
        console.log(`Processed daily data for ${unitId}: ${dateKey}`);
      }
    }
  }

  // Aggregate data points (calculate averages, min, max, etc.)
  aggregateDataPoints(dataPoints) {
    if (dataPoints.length === 0) return null;

    const powers = dataPoints.map(d => d.power);
    const currents = dataPoints.map(d => d.current);
    const voltages = dataPoints.map(d => d.voltage);
    const credits = dataPoints.map(d => d.remainingCredit);
    const units = dataPoints.map(d => d.remainingUnits);

    return {
      dataPoints: dataPoints.length,
      power: {
        avg: this.average(powers),
        min: Math.min(...powers),
        max: Math.max(...powers),
        sum: this.sum(powers)
      },
      current: {
        avg: this.average(currents),
        min: Math.min(...currents),
        max: Math.max(...currents)
      },
      voltage: {
        avg: this.average(voltages),
        min: Math.min(...voltages),
        max: Math.max(...voltages)
      },
      credit: {
        start: credits[0],
        end: credits[credits.length - 1],
        consumed: Math.max(0, credits[0] - credits[credits.length - 1])
      },
      units: {
        start: units[0],
        end: units[units.length - 1],
        consumed: Math.max(0, units[0] - units[units.length - 1])
      },
      period: {
        start: dataPoints[0].timestamp,
        end: dataPoints[dataPoints.length - 1].timestamp
      }
    };
  }

  // Save hourly data to Firebase Storage
  async saveHourlyData(buildingId, unitId, hourKey, data) {
    try {
      const date = hourKey.split('-').slice(0, 3).join('-'); // YYYY-MM-DD
      const year = date.split('-')[0];
      const month = date.split('-')[1];
      
      const path = `historical-data/${buildingId}/${unitId}/${year}/${month}/hourly-${date}.json`;
      const fileRef = storageRef(this.storage, path);
      
      // Load existing data if it exists
      let existingData = {};
      try {
        const url = await getDownloadURL(fileRef);
        const response = await fetch(url);
        existingData = await response.json();
      } catch (error) {
        // File doesn't exist yet, start fresh
      }
      
      // Add new hour data
      existingData[hourKey] = data;
      
      // Upload updated data
      const blob = new Blob([JSON.stringify(existingData, null, 2)], { type: 'application/json' });
      await uploadBytes(fileRef, blob);
      
      console.log(`✅ Saved hourly data: ${buildingId}/${unitId}/${hourKey}`);
    } catch (error) {
      console.error('❌ Error saving hourly data:', error);
    }
  }

  // Save daily data to Firebase Storage
  async saveDailyData(buildingId, unitId, dateKey, data) {
    try {
      const year = dateKey.split('-')[0];
      const month = dateKey.split('-')[1];
      
      const path = `historical-data/${buildingId}/${unitId}/${year}/${month}/daily-${dateKey}.json`;
      const fileRef = storageRef(this.storage, path);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      await uploadBytes(fileRef, blob);
      
      console.log(`✅ Saved daily data: ${buildingId}/${unitId}/${dateKey}`);
      
      // Also update monthly summary
      await this.updateMonthlySummary(buildingId, unitId, year, month, dateKey, data);
    } catch (error) {
      console.error('❌ Error saving daily data:', error);
    }
  }

  // Update monthly summary
  async updateMonthlySummary(buildingId, unitId, year, month, dateKey, dailyData) {
    try {
      const path = `historical-data/${buildingId}/${unitId}/${year}/monthly-${year}-${month}.json`;
      const fileRef = storageRef(this.storage, path);
      
      // Load existing monthly data
      let monthlyData = { days: {}, summary: {} };
      try {
        const url = await getDownloadURL(fileRef);
        const response = await fetch(url);
        monthlyData = await response.json();
      } catch (error) {
        // File doesn't exist yet
      }
      
      // Add daily data
      monthlyData.days[dateKey] = dailyData;
      
      // Recalculate monthly summary
      const dailyValues = Object.values(monthlyData.days);
      if (dailyValues.length > 0) {
        monthlyData.summary = {
          totalDays: dailyValues.length,
          avgDailyPower: this.average(dailyValues.map(d => d.power.avg)),
          totalEnergyConsumed: this.sum(dailyValues.map(d => d.units.consumed)),
          totalCreditConsumed: this.sum(dailyValues.map(d => d.credit.consumed)),
          peakPower: Math.max(...dailyValues.map(d => d.power.max)),
          minPower: Math.min(...dailyValues.map(d => d.power.min))
        };
      }
      
      const blob = new Blob([JSON.stringify(monthlyData, null, 2)], { type: 'application/json' });
      await uploadBytes(fileRef, blob);
      
      console.log(`✅ Updated monthly summary: ${buildingId}/${unitId}/${year}-${month}`);
    } catch (error) {
      console.error('❌ Error updating monthly summary:', error);
    }
  }

  // Get historical data for display
  async getHistoricalData(buildingId, unitId, timeRange) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      let path;
      
      switch (timeRange) {
        case '24h':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const dateKey = yesterday.toISOString().split('T')[0];
          path = `historical-data/${buildingId}/${unitId}/${year}/${month}/hourly-${dateKey}.json`;
          break;
          
        case '7d':
        case '30d':
          path = `historical-data/${buildingId}/${unitId}/${year}/monthly-${year}-${month}.json`;
          break;
          
        default:
          throw new Error('Invalid time range');
      }
      
      const fileRef = storageRef(this.storage, path);
      const url = await getDownloadURL(fileRef);
      const response = await fetch(url);
      const data = await response.json();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error getting historical data:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility functions
  average(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
  }

  // Stop historical data collection
  stopHistoricalDataCollection(buildingId) {
    const timers = this.aggregationTimers;
    
    // Clear timers and listener
    const keys = [`${buildingId}_hourly`, `${buildingId}_daily`, `${buildingId}_recurring_daily`, `${buildingId}_listener`];
    
    keys.forEach(key => {
      const timer = timers.get(key);
      if (timer) {
        if (typeof timer === 'function') {
          // This is the database listener unsubscribe function
          timer();
        } else {
          // This is a timer
          clearInterval(timer);
          clearTimeout(timer);
        }
        timers.delete(key);
      }
    });
    
    // Clear buffer for this building
    for (const [bufferKey] of this.dataBuffer.entries()) {
      if (bufferKey.startsWith(buildingId)) {
        this.dataBuffer.delete(bufferKey);
      }
    }
    
    console.log(`🛑 Stopped historical data collection for ${buildingId}`);
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeBuildings: [...new Set(Array.from(this.aggregationTimers.keys()).map(key => key.split('_')[0]))],
      bufferSize: this.dataBuffer.size,
      timers: this.aggregationTimers.size
    };
  }
}

export default new HistoricalDataService();