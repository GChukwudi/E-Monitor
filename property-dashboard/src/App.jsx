import { useState, useEffect } from 'react';
import './services/firebase'; // This will initialize Firebase
import { Login, Register, ForgotPassword } from './components/Auth/Login';
import UnitManagement from './components/UnitManagement/UnitManagement';
import Header from './components/Header/Header';
import Navigation from './components/Navigation/Navigation';
import Dashboard from './pages/Dashboard/Dashboard';
import UnitsView from './pages/UnitsView/UnitsView';
import Analytics from './pages/Analytics/Analytics';
import AuthService from './services/auth';
import FirebaseService from './services/firebase';
import {
  calculateBuildingStats,
  collectAlerts,
  prepareChartData,
  preparePieData
} from './utils/calculations';
import { downloadReport } from './utils/reportGenerator';
import './App.css';

function App() {
  // Authentication state
  const [authState, setAuthState] = useState('checking'); // 'checking', 'login', 'register', 'forgot', 'authenticated'
  const [currentUser, setCurrentUser] = useState(null);
  const [property, setProperty] = useState(null);
  
  // App state
  const [activeView, setActiveView] = useState('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscriptionCleanup, setSubscriptionCleanup] = useState(null);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = AuthService.getCurrentUser();
        
        if (user && user.buildingId) {
          setCurrentUser(user);
          
          // Get fresh building data
          const buildingResult = await FirebaseService.getBuilding(user.buildingId);
          if (buildingResult.success) {
            setProperty(buildingResult.data);
            setAuthState('authenticated');
            
            // Start real-time subscription
            const unsubscribe = FirebaseService.subscribeToBuilding(user.buildingId, (data) => {
              if (data) {
                setProperty(data);
                setError(null);
              }
            });
            setSubscriptionCleanup(() => unsubscribe);
          } else {
            setError('Failed to load building data');
            setAuthState('login');
          }
        } else {
          setAuthState('login');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setError('Authentication failed');
        setAuthState('login');
      }
    };

    checkAuth();
    
    // Cleanup subscription on unmount
    return () => {
      if (subscriptionCleanup) {
        subscriptionCleanup();
      }
    };
  }, []);

  // Set up notification listener
  useEffect(() => {
    if (authState === 'authenticated') {
      try {
        const unsubscribe = AuthService.onMessageListener();
        return unsubscribe;
      } catch (err) {
        console.warn('Failed to set up message listener:', err);
      }
    }
  }, [authState]);

  // Handle successful login - building data comes with login
  const handleLoginSuccess = (user, building, buildingId) => {
    setCurrentUser(user);
    setProperty(building);
    setAuthState('authenticated');
    
    // Start real-time subscription to building data
    if (buildingId) {
      try {
        const unsubscribe = FirebaseService.subscribeToBuilding(buildingId, (data) => {
          if (data) {
            setProperty(data);
            setError(null);
          } else {
            setError('Failed to load building data');
          }
        });
        
        // Store unsubscribe function for cleanup
        setSubscriptionCleanup(() => unsubscribe);
      } catch (err) {
        console.error('Failed to set up building subscription:', err);
        setError('Failed to connect to building data');
      }
    }
  };

  // Handle successful registration
  const handleRegisterSuccess = () => {
    setAuthState('login');
  };

  // Handle logout
  const handleLogout = () => {
    // Cleanup subscription
    if (subscriptionCleanup) {
      subscriptionCleanup();
      setSubscriptionCleanup(null);
    }
    
    try {
      AuthService.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
    
    setCurrentUser(null);
    setProperty(null);
    setAuthState('login');
    setActiveView('dashboard');
  };

  // Handle property updates (for unit management)
  const handlePropertyUpdate = () => {
    if (currentUser?.buildingId) {
      FirebaseService.getBuilding(currentUser.buildingId).then(result => {
        if (result.success) {
          setProperty(result.data);
        }
      }).catch(err => {
        console.error('Failed to update property:', err);
        setError('Failed to update building data');
      });
    }
  };

  // Generate and download report
  const handleDownloadReport = () => {
    if (!property || !currentUser) return;
    
    try {
      const units = property.units || {};
      const stats = calculateBuildingStats(units);
      
      downloadReport(
        currentUser.buildingId,
        property.name,
        property,
        stats,
        'pdf'
      );
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report');
    }
  };

  // Loading screen during auth check
  if (authState === 'checking') {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ color: 'var(--charcoal)', fontSize: '1.125rem', fontWeight: 500 }}>
          Loading...
        </p>
      </div>
    );
  }

  // Auth screens
  if (authState === 'login') {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => setAuthState('register')}
        onForgotPassword={() => setAuthState('forgot')}
      />
    );
  }

  if (authState === 'register') {
    return (
      <Register
        onRegisterSuccess={handleRegisterSuccess}
        onSwitchToLogin={() => setAuthState('login')}
      />
    );
  }

  if (authState === 'forgot') {
    return (
      <ForgotPassword
        onBackToLogin={() => setAuthState('login')}
      />
    );
  }

  // Main application (authenticated)
  if (authState === 'authenticated') {
    if (error) {
      return (
        <div className="error-container">
          <div className="error-card">
            <h2 className="error-title">{error}</h2>
            <p className="error-message">
              Please check your internet connection or contact support
            </p>
            <button 
              className="error-retry-btn"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!property) {
      return (
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ color: 'var(--charcoal)', fontSize: '1.125rem', fontWeight: 500 }}>
            Loading building data...
          </p>
        </div>
      );
    }

    const units = property.units || {};
    const stats = calculateBuildingStats(units);
    const alerts = collectAlerts(units);
    const chartData = prepareChartData(units);
    const pieData = preparePieData(units);

    const renderView = () => {
      switch (activeView) {
        case 'dashboard':
          return (
            <Dashboard
              building={property}
              stats={stats}
              alerts={alerts}
              chartData={chartData}
              pieData={pieData}
            />
          );
        case 'units':
          return (
            <UnitsView 
              units={units} 
              onUnitClick={(id) => console.log('Unit clicked:', id)} 
            />
          );
        case 'analytics':
          return <Analytics units={units} />;
        case 'management':
          return (
            <UnitManagement
              property={property}
              buildingId={currentUser.buildingId}
              onPropertyUpdate={handlePropertyUpdate}
            />
          );
        default:
          return null;
      }
    };

    return (
      <div>
        <Header
          buildingName={property.name}
          alertCount={alerts.length}
          onDownloadReport={handleDownloadReport}
          onToggleMobileMenu={() => setShowMobileMenu(!showMobileMenu)}
          showMobileMenu={showMobileMenu}
          currentUser={currentUser}
          onLogout={handleLogout}
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

  // Fallback
  return (
    <div className="loading">
      <p>Something went wrong. Please refresh the page.</p>
    </div>
  );
}

export default App;