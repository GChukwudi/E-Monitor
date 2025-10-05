export const calculateBuildingStats = (units) => {
  if (!units || Object.keys(units).length === 0) {
    return {
      totalPower: 0,
      avgCurrent: 0,
      totalUnits: 0,
      totalCredit: 0,
      totalRemainingUnits: 0
    };
  }

  const unitEntries = Object.entries(units);
  
  const totalPower = unitEntries.reduce((sum, [_, unit]) => {
    return sum + (parseFloat(unit.power) || 0);
  }, 0);

  const avgCurrent = unitEntries.reduce((sum, [_, unit]) => {
    return sum + (parseFloat(unit.current) || 0);
  }, 0) / unitEntries.length;

  const totalCredit = unitEntries.reduce((sum, [_, unit]) => {
    return sum + (parseFloat(unit.remaining_credit) || 0);
  }, 0);

  const totalRemainingUnits = unitEntries.reduce((sum, [_, unit]) => {
    return sum + (parseFloat(unit.remaining_units) || 0);
  }, 0);

  return {
    totalPower: totalPower.toFixed(2),
    avgCurrent: avgCurrent.toFixed(2),
    totalUnits: unitEntries.length,
    totalCredit: totalCredit.toFixed(2),
    totalRemainingUnits: totalRemainingUnits.toFixed(2)
  };
};

export const getUnitStatus = (unit) => {
  if (!unit) return 'inactive';
  
  const remainingCredit = parseFloat(unit.remaining_credit) || 0;
  const power = parseFloat(unit.power) || 0;
  
  if (remainingCredit < 500) return 'critical';

  // Warning: less than ₦1000 remaining OR high power consumption (>1500W)
  if (remainingCredit < 1000 || power > 1500) return 'warning';
  
  return 'active';
};

export const collectAlerts = (units) => {
  const alerts = [];
  
  if (!units) return alerts;
  
  Object.entries(units).forEach(([unitId, unit]) => {
    const remainingCredit = parseFloat(unit.remaining_credit) || 0;
    const power = parseFloat(unit.power) || 0;
    
    if (remainingCredit < 500) {
      alerts.push(`${unitId}: Critical - Low credit (₦${remainingCredit})`);
    } else if (remainingCredit < 1000) {
      alerts.push(`${unitId}: Warning - Low credit (₦${remainingCredit})`);
    }
    
    if (power > 1500) {
      alerts.push(`${unitId}: High consumption detected (${power.toFixed(2)}W)`);
    }
  });
  
  return alerts;
};

export const prepareChartData = (units) => {
  if (!units) return [];
  
  return Object.entries(units).map(([unitId, unit]) => ({
    name: unitId.replace('unit_', 'Unit '),
    power: parseFloat(unit.power) || 0,
    current: parseFloat(unit.current) || 0,
    credit: parseFloat(unit.remaining_credit) || 0
  }));
};

export const preparePieData = (units) => {
  if (!units) return [];
  
  return Object.entries(units).map(([unitId, unit]) => ({
    name: unitId.replace('unit_', 'Unit '),
    value: parseFloat(unit.power) || 0
  }));
};