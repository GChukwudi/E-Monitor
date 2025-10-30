
import html2pdf from 'html2pdf.js';

// Helper function to get operational status
const getOperationalStatus = (unit) => {
  const credit = parseFloat(unit.remaining_credit || 0);
  
  if (credit === 0) return { status: "Disconnected", color: "#6B7280", priority: 3 };
  if (credit < 500) return { status: "Critical", color: "#DC2626", priority: 2 };
  if (credit < 1000) return { status: "Attention Required", color: "#E07A5F", priority: 1 };
  return { status: "Operational", color: "#84A98C", priority: 0 };
};

// Helper function to get disconnection info
const getDisconnectionInfo = (unit) => {
  const credit = parseFloat(unit.remaining_credit || 0);
  if (credit === 0 && unit.timestamp) {
    return new Date(unit.timestamp).toLocaleString();
  }
  return null;
};

// Calculate historical averages (mock data - would come from Firebase in production)
const calculateHistoricalData = (units) => {
  const currentPower = Object.values(units).reduce((sum, unit) => sum + parseFloat(unit.power || 0), 0);
  
  // Mock historical data - in production this would come from Firebase history
  return {
    today: currentPower,
    yesterday: currentPower * 0.92,
    lastWeek: currentPower * 0.88,
    lastMonth: currentPower * 0.85,
    trend: currentPower > (currentPower * 0.92) ? "increasing" : "decreasing"
  };
};

// Get actionable insights
const getActionableInsights = (units) => {
  const insights = {
    immediate: [],
    attention: [],
    operational: 0,
    recommendations: []
  };
  
  Object.entries(units).forEach(([unitId, unit]) => {
    const statusInfo = getOperationalStatus(unit);
    const power = parseFloat(unit.power || 0);
    const unitName = unitId.replace('unit_', 'House ');
    
    if (statusInfo.status === "Disconnected") {
      const disconnectedSince = getDisconnectionInfo(unit);
      insights.immediate.push({
        unit: unitName,
        issue: "Service Interruption",
        action: "Immediate restoration required",
        since: disconnectedSince
      });
    } else if (statusInfo.status === "Critical") {
      insights.immediate.push({
        unit: unitName,
        issue: "Critical Low Credit",
        action: "Contact tenant immediately for credit top-up"
      });
    } else if (statusInfo.status === "Attention Required") {
      insights.attention.push({
        unit: unitName,
        issue: "Low Credit Warning",
        action: "Send notification to tenant for credit top-up"
      });
    } else {
      insights.operational++;
    }
    
    // High consumption warning
    if (power > 1500) {
      insights.attention.push({
        unit: unitName,
        issue: `High Power Consumption (${power.toFixed(2)}W)`,
        action: "Monitor for potential issues or anomalies"
      });
    }
  });
  
  // Generate recommendations
  if (insights.immediate.length > 0) {
    insights.recommendations.push("Priority: Address disconnected units immediately to restore service");
  }
  if (insights.immediate.length + insights.attention.length > 3) {
    insights.recommendations.push("Consider implementing automated credit alerts for tenants");
  }
  if (insights.operational === Object.keys(units).length) {
    insights.recommendations.push("All units operational - maintain regular monitoring schedule");
  }
  
  return insights;
};

const generateReportHTML = (buildingId, buildingName, buildingData, stats) => {
  const currentDate = new Date().toLocaleString();
  const units = buildingData.units || {};
  const insights = getActionableInsights(units);
  const historical = calculateHistoricalData(units);
    
  // Unit rows with operational status
  const unitRows = Object.entries(units)
    .map(([unitId, unit]) => {
      const statusInfo = getOperationalStatus(unit);
      const disconnectedSince = getDisconnectionInfo(unit);
      
      return `
        <tr>
          <td>${unitId.replace('unit_', 'House ')}</td>
          <td>
            <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${statusInfo.color}15; color: ${statusInfo.color};">
              ${statusInfo.status}
            </span>
          </td>
          <td>${parseFloat(unit.power || 0).toFixed(2)}W</td>
          <td>${parseFloat(unit.current || 0).toFixed(2)}A</td>
          <td>${parseFloat(unit.voltage || 0).toFixed(2)}V</td>
          <td style="font-size: 12px;">${unit.timestamp || 'N/A'}</td>
          ${disconnectedSince ? `<td style="font-size: 11px; color: #DC2626;">${disconnectedSince}</td>` : '<td>-</td>'}
        </tr>
      `;
    }).join('');
  
  // Immediate action items
  const immediateActionsHTML = insights.immediate.length > 0 ? `
    <div class="section alert-section">
      <h2 class="section-title" style="color: #DC2626;">⚠️ Immediate Action Required</h2>
      <div class="alert-list">
        ${insights.immediate.map(item => `
          <div class="alert-item critical">
            <div class="alert-header">
              <strong>${item.unit}</strong>
              <span class="alert-badge critical">Priority</span>
            </div>
            <div class="alert-body">
              <div class="alert-issue">${item.issue}</div>
              <div class="alert-action">Action: ${item.action}</div>
              ${item.since ? `<div class="alert-since">Disconnected since: ${item.since}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';
  
  // Attention required items
  const attentionItemsHTML = insights.attention.length > 0 ? `
    <div class="section">
      <h2 class="section-title" style="color: #E07A5F;">⚡ Requires Attention</h2>
      <div class="alert-list">
        ${insights.attention.map(item => `
          <div class="alert-item warning">
            <div class="alert-header">
              <strong>${item.unit}</strong>
              <span class="alert-badge warning">Monitor</span>
            </div>
            <div class="alert-body">
              <div class="alert-issue">${item.issue}</div>
              <div class="alert-action">Action: ${item.action}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';
  
  // Recommendations
  const recommendationsHTML = insights.recommendations.length > 0 ? `
    <div class="recommendations">
      <h3 style="font-size: 14px; color: #6B7280; margin-bottom: 10px;">📋 Recommendations</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${insights.recommendations.map(rec => `<li style="margin-bottom: 8px; color: #3D405B;">${rec}</li>`).join('')}
      </ul>
    </div>
  ` : '';

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
          page-break-inside: avoid;
        }
        
        .alert-section {
          background: #FFF5F5;
          padding: 20px;
          border-radius: 12px;
          border-left: 4px solid #DC2626;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #3D405B;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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
        
        .status-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .status-card {
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        
        .status-card.operational {
          background: rgba(132, 169, 140, 0.1);
          border: 1px solid #84A98C;
        }
        
        .status-card.attention {
          background: rgba(224, 122, 95, 0.1);
          border: 1px solid #E07A5F;
        }
        
        .status-card.critical {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid #DC2626;
        }
        
        .status-card.disconnected {
          background: rgba(107, 114, 128, 0.1);
          border: 1px solid #6B7280;
        }
        
        .status-count {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .status-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        
        .alert-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .alert-item {
          background: white;
          border-radius: 8px;
          padding: 15px;
          border: 1px solid #E5E7EB;
        }
        
        .alert-item.critical {
          border-left: 4px solid #DC2626;
        }
        
        .alert-item.warning {
          border-left: 4px solid #E07A5F;
        }
        
        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .alert-badge {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .alert-badge.critical {
          background: #DC2626;
          color: white;
        }
        
        .alert-badge.warning {
          background: #E07A5F;
          color: white;
        }
        
        .alert-body {
          font-size: 13px;
        }
        
        .alert-issue {
          color: #3D405B;
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .alert-action {
          color: #6B7280;
          font-size: 12px;
        }
        
        .alert-since {
          color: #DC2626;
          font-size: 11px;
          margin-top: 4px;
          font-style: italic;
        }
        
        .historical-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .historical-item {
          background: #F9FAFB;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        
        .historical-label {
          font-size: 11px;
          color: #6B7280;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        
        .historical-value {
          font-size: 18px;
          font-weight: 700;
          color: #3D405B;
        }
        
        .trend {
          font-size: 11px;
          margin-top: 4px;
        }
        
        .trend.increasing {
          color: #DC2626;
        }
        
        .trend.decreasing {
          color: #84A98C;
        }
        
        .recommendations {
          background: rgba(132, 169, 140, 0.1);
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
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
          padding: 12px 10px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #E5E7EB;
        }
        
        td {
          padding: 12px 10px;
          border-bottom: 1px solid #E5E7EB;
          font-size: 13px;
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
        <h1>Energy Monitor Report</h1>
        <div class="building-name">${buildingName || buildingId}</div>
      </div>
      
      <div class="meta">
        Generated: ${currentDate}
      </div>
      
      ${immediateActionsHTML}
      ${attentionItemsHTML}
      
      <div class="section">
        <h2 class="section-title">Power Metrics</h2>
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
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">Unit Details</h2>
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Status</th>
              <th>Power</th>
              <th>Current</th>
              <th>Voltage</th>
              <th>Last Update</th>
              <th>Disconnected</th>
            </tr>
          </thead>
          <tbody>
            ${unitRows}
          </tbody>
        </table>
      </div>
      
      ${recommendationsHTML}
      
      <div class="footer">
        E Monitor - Property Management System
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
  downloadPDFReport(buildingId, buildingName, buildingData, stats);
};