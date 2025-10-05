import html2pdf from 'html2pdf.js';

export const generateJSONReport = (buildingId, buildingData, stats) => {
  const report = {
    reportType: 'Energy Monitoring Report',
    generatedAt: new Date().toISOString(),
    buildingId: buildingId,
    summary: {
      totalUnits: stats.totalUnits,
      totalPowerConsumption: `${stats.totalPower}W`,
      averageCurrent: `${stats.avgCurrent}A`,
      totalRemainingCredit: `₦${stats.totalCredit}`,
      totalRemainingUnits: `${stats.totalRemainingUnits} kWh`,
      sharedVoltage: `${buildingData.shared_voltage}V`
    },
    units: Object.entries(buildingData.units || {}).map(([unitId, unit]) => ({
      unitId,
      measurements: {
        current: `${unit.current}A`,
        voltage: `${unit.voltage}V`,
        power: `${unit.power}W`
      },
      billing: {
        remainingCredit: `₦${unit.remaining_credit || 'N/A'}`,
        remainingUnits: `${unit.remaining_units || 'N/A'} kWh`
      },
      timestamp: unit.timestamp,
      lastReading: new Date(unit.timestamp).toLocaleString()
    }))
  };

  return report;
};

export const downloadJSONReport = (buildingId, buildingData, stats) => {
  const report = generateJSONReport(buildingId, buildingData, stats);
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `energy-report-${buildingId}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const generateReportHTML = (buildingId, buildingName, buildingData, stats) => {
  const currentDate = new Date().toLocaleString();
  
  const unitRows = Object.entries(buildingData.units || {})
    .map(([unitId, unit]) => `
      <tr>
        <td>${unitId.replace('unit_', 'House ')}</td>
        <td>${parseFloat(unit.power || 0).toFixed(2)}W</td>
        <td>${parseFloat(unit.current || 0).toFixed(2)}A</td>
        <td>${parseFloat(unit.voltage || 0).toFixed(2)}V</td>
        <td style="color: #84A98C; font-weight: 600;">₦${parseFloat(unit.remaining_credit || 0).toFixed(2)}</td>
        <td style="font-size: 12px;">${unit.timestamp || 'N/A'}</td>
      </tr>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          color: #3D405B;
          line-height: 1.6;
          padding: 30px;
        }
        
        .header {
          background: linear-gradient(135deg, #84A98C 0%, #52796F 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 8px;
        }
        
        .header .building-name {
          font-size: 16px;
          opacity: 0.95;
        }
        
        .meta {
          background: #F5F5F4;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          font-size: 14px;
          color: #6B7280;
        }
        
        .section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #3D405B;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .summary-item {
          background: #FAFAFA;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
        }
        
        .summary-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        
        .summary-value {
          font-size: 20px;
          font-weight: 700;
          color: #3D405B;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        
        thead {
          background: #F5F5F4;
        }
        
        th {
          padding: 12px 15px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #E5E7EB;
        }
        
        td {
          padding: 12px 15px;
          border-bottom: 1px solid #E5E7EB;
          font-size: 14px;
        }
        
        tbody tr:hover {
          background: #FAFAFA;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #E5E7EB;
          text-align: center;
          font-size: 12px;
          color: #9CA3AF;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Energy Monitoring Report</h1>
        <div class="building-name">${buildingName || buildingId}</div>
      </div>
      
      <div class="meta">
        Generated: ${currentDate}
      </div>
      
      <div class="section">
        <h2 class="section-title">Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Total Units</div>
            <div class="summary-value">${stats.totalUnits}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Power</div>
            <div class="summary-value">${stats.totalPower}W</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Average Current</div>
            <div class="summary-value">${stats.avgCurrent}A</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Credit</div>
            <div class="summary-value">₦${stats.totalCredit}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Remaining Units</div>
            <div class="summary-value">${stats.totalRemainingUnits} kWh</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Shared Voltage</div>
            <div class="summary-value">${buildingData.shared_voltage || 'N/A'}V</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">Unit Details</h2>
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Power</th>
              <th>Current</th>
              <th>Voltage</th>
              <th>Credit</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            ${unitRows}
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        Energy Monitor Pro - Property Management System
      </div>
    </body>
    </html>
  `;
};

export const downloadPDFReport = (buildingId, buildingName, buildingData, stats) => {
  const htmlContent = generateReportHTML(buildingId, buildingName, buildingData, stats);
  
  const options = {
    margin: 10,
    filename: `energy-report-${buildingId}-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(options).from(htmlContent).save();
};

export const downloadReport = (buildingId, buildingName, buildingData, stats, format = 'pdf') => {
  if (format === 'json') {
    downloadJSONReport(buildingId, buildingData, stats);
  } else {
    downloadPDFReport(buildingId, buildingName, buildingData, stats);
  }
};