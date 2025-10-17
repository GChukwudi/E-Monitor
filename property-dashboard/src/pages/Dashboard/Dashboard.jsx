import { Zap, Users, Activity, AlertTriangle } from 'lucide-react';
import StatCard from '../../components/StatCard/StatCard';
import AlertBanner from '../../components/AlertBanner/AlertBanner';
import ChartSection from '../../components/ChartSection/ChartSection';
import styles from './Dashboard.module.css';

const Dashboard = ({ building, stats, alerts, chartData, pieData }) => {
  // Calculate actionable units (those requiring attention)
  const getActionableStats = (units) => {
    if (!units) return { operational: 0, requiresAttention: 0, disconnected: 0 };
    
    const unitEntries = Object.entries(units);
    let operational = 0;
    let requiresAttention = 0; 
    let disconnected = 0;
    
    unitEntries.forEach(([_, unit]) => {
      const credit = parseFloat(unit.remaining_credit || 0);
      
      if (credit === 0) {
        disconnected++;
      } else if (credit < 1000) {
        requiresAttention++;
      } else {
        operational++;
      }
    });
    
    return { operational, requiresAttention, disconnected };
  };

  const actionableStats = getActionableStats(building.units);

  return (
    <div className={styles.dashboard}>
      <AlertBanner alerts={alerts} />

      <div className={styles.statsGrid}>
        <StatCard
          title="Total Units"
          value={stats.totalUnits}
          icon={Users}
          subtitle="Units in building"
        />
        <StatCard
          title="Operational Units"
          value={actionableStats.operational}
          icon={Activity}
          subtitle="No action required"
        />
        <StatCard
          title="Require Attention"
          value={actionableStats.requiresAttention}
          icon={AlertTriangle}
          subtitle="Low credit notifications needed"
        />
        <StatCard
          title="Total Power"
          value={`${stats.totalPower}W`}
          icon={Zap}
          subtitle="Current consumption"
        />
      </div>

      <ChartSection chartData={chartData} pieData={pieData} />
    </div>
  );
};

export default Dashboard;