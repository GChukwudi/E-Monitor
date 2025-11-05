import { 
  calculateBuildingStats, 
  getUnitStatus, 
  collectAlerts,
  prepareChartData,
  preparePieData
} from './calculations';

const mockUnits = {
  unit_001: { power: 250, current: 2.0, remaining_credit: 3000, voltage: 230 },
  unit_002: { power: 150, current: 1.5, remaining_credit: 450, voltage: 230 },
  unit_003: { power: 350, current: 2.5, remaining_credit: 0, voltage: 230 }
};

describe('calculateBuildingStats', () => {
  test('calculates total power correctly', () => {
    const stats = calculateBuildingStats(mockUnits);
    expect(parseFloat(stats.totalPower)).toBe(750);
  });

  test('calculates average current', () => {
    const stats = calculateBuildingStats(mockUnits);
    expect(parseFloat(stats.avgCurrent)).toBe(2.0);
  });

  test('counts total units', () => {
    const stats = calculateBuildingStats(mockUnits);
    expect(stats.totalUnits).toBe(3);
  });

  test('calculates total credit', () => {
    const stats = calculateBuildingStats(mockUnits);
    expect(parseFloat(stats.totalCredit)).toBe(3450);
  });

  test('handles empty units object', () => {
    const stats = calculateBuildingStats({});
    expect(stats.totalPower).toBe(0);
    expect(stats.totalUnits).toBe(0);
  });

  test('handles null units', () => {
    const stats = calculateBuildingStats(null);
    expect(stats.totalPower).toBe(0);
  });
});

describe('getUnitStatus', () => {
  test('returns active for sufficient credit', () => {
    const unit = { remaining_credit: 2000, power: 100 };
    expect(getUnitStatus(unit)).toBe('active');
  });

  test('returns critical for very low credit', () => {
    const unit = { remaining_credit: 400, power: 100 };
    expect(getUnitStatus(unit)).toBe('critical');
  });

  test('returns warning for low credit', () => {
    const unit = { remaining_credit: 800, power: 100 };
    expect(getUnitStatus(unit)).toBe('warning');
  });

  test('returns warning for high power consumption', () => {
    const unit = { remaining_credit: 5000, power: 1600 };
    expect(getUnitStatus(unit)).toBe('warning');
  });

  test('returns inactive for null unit', () => {
    expect(getUnitStatus(null)).toBe('inactive');
  });
});

describe('collectAlerts', () => {
  test('generates low credit warning', () => {
    const units = { unit_001: { remaining_credit: 800, power: 100 } };
    const alerts = collectAlerts(units);
    
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toMatch(/low credit/i);
  });

  test('generates critical credit alert', () => {
    const units = { unit_001: { remaining_credit: 300, power: 100 } };
    const alerts = collectAlerts(units);
    
    expect(alerts[0]).toMatch(/critical/i);
  });

  test('generates high consumption alert', () => {
    const units = { unit_001: { remaining_credit: 5000, power: 1600 } };
    const alerts = collectAlerts(units);
    
    expect(alerts[0]).toMatch(/high consumption/i);
  });

  test('returns no alerts for operational units', () => {
    const units = { unit_001: { remaining_credit: 5000, power: 500 } };
    const alerts = collectAlerts(units);
    expect(alerts.length).toBe(0);
  });

  test('collects multiple alerts', () => {
    const units = {
      unit_001: { remaining_credit: 400, power: 100 },
      unit_002: { remaining_credit: 800, power: 1700 }
    };
    const alerts = collectAlerts(units);
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });

  test('handles null units', () => {
    const alerts = collectAlerts(null);
    expect(alerts).toEqual([]);
  });
});

describe('prepareChartData', () => {
  test('formats data for bar chart', () => {
    const data = prepareChartData(mockUnits);
    
    expect(data).toHaveLength(3);
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('power');
    expect(data[0]).toHaveProperty('current');
  });

  test('converts unit IDs to readable names', () => {
    const data = prepareChartData(mockUnits);
    expect(data[0].name).toMatch(/Unit \d+/);
  });

  test('handles undefined units', () => {
    expect(prepareChartData(undefined)).toEqual([]);
  });

  test('handles null units', () => {
    expect(prepareChartData(null)).toEqual([]);
  });
});

describe('preparePieData', () => {
  test('formats data for pie chart', () => {
    const data = preparePieData(mockUnits);
    
    expect(data).toHaveLength(3);
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('value');
  });

  test('uses power as value', () => {
    const data = preparePieData(mockUnits);
    expect(data[0].value).toBe(250);
  });

  test('handles undefined units', () => {
    expect(preparePieData(undefined)).toEqual([]);
  });
});
