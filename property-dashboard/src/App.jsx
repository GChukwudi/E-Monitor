// src/App.jsx
import React, { useState, useEffect } from 'react';
import FirebaseService from './services/firebase';
import Header from './components/Header/Header';
import Navigation from './components/Navigation/Navigation';
import Dashboard from './pages/Dashboard/Dashboard';
import UnitsView from './pages/UnitsView/UnitsView';
import Analytics from './pages/Analytics/Analytics';
import {
  calculateBuildingStats,
  collectAlerts,
  prepareChartData,
  preparePieData
} from './utils/calculations';
import { downloadReport } from './utils/reportGenerator';
import { formatBuildingName } from './utils/buildingMapper';
import './App.css';

function App() {
  const [buildingData, setBuildingData] = useState(null);
  const [selectedBuilding] = useState('building_001');
  const [activeView, setActiveView] = useState('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = FirebaseService.subscribeToBuildings((data) => {
      if (data) {
        setBuildingData(data);
        setLoading(false);
        setError(null);
      } else {
        setError('Failed to load building data');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ color: 'var(--charcoal)', fontSize: '1.125rem', fontWeight: 500 }}>
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h2 className="error-title">{error}</h2>
          <p className="error-message">Please check your Firebase configuration in the .env file</p>
        </div>
      </div>
    );
  }

  const building = buildingData?.[selectedBuilding];
  
  if (!building) {
    return (
      <div className="loading">
        <p style={{ color: 'var(--charcoal)', fontSize: '1.125rem' }}>
          No building data available
        </p>
      </div>
    );
  }

  const units = building.units || {};
  const stats = calculateBuildingStats(units);
  const alerts = collectAlerts(units);
  const chartData = prepareChartData(units);
  const pieData = preparePieData(units);

  const handleDownloadReport = () => {
    const displayName = building.name || formatBuildingName(selectedBuilding);
    
    console.log('Building ID:', selectedBuilding);
    console.log('Building Name:', displayName);
    console.log('Stats:', stats);
    
    downloadReport(
      selectedBuilding,    // buildingId
      displayName,          // buildingName  
      building,             // buildingData
      stats,                // stats object
      'pdf'                 // format
    );
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            building={building}
            stats={stats}
            alerts={alerts}
            chartData={chartData}
            pieData={pieData}
          />
        );
      case 'units':
        return <UnitsView units={units} onUnitClick={(id) => console.log('Unit clicked:', id)} />;
      case 'analytics':
        return <Analytics units={units} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Header
        buildingName={building.name || formatBuildingName(selectedBuilding)}
        alertCount={alerts.length}
        onDownloadReport={handleDownloadReport}
        onToggleMobileMenu={() => setShowMobileMenu(!showMobileMenu)}
        showMobileMenu={showMobileMenu}
      />
      
      <Navigation
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="container">
        {renderView()}
      </main>
    </div>
  );
}

export default App;