import { Zap, DollarSign, Users, Activity } from 'lucide-react';
import StatCard from '../../components/StatCard/StatCard';
import AlertBanner from '../../components/AlertBanner/AlertBanner';
import ChartSection from '../../components/ChartSection/ChartSection';
import styles from './Dashboard.module.css';

const Dashboard = ({ building, stats, alerts, chartData, pieData }) => {
  return (
    <div className={styles.dashboard}>
      <AlertBanner alerts={alerts} />

      <div className={styles.statsGrid}>
        <StatCard
          title="Active Units"
          value={stats.totalUnits}
          icon={Users}
        />
        <StatCard
          title="Total Power"
          value={`${stats.totalPower}W`}
          icon={Zap}
        />
        <StatCard
          title="Total Credit"
          value={`₦${stats.totalCredit}`}
          icon={DollarSign}
          subtitle={`${stats.totalRemainingUnits} kWh remaining`}
        />
        <StatCard
          title="Shared Voltage"
          value={`${building.shared_voltage || 'N/A'}V`}
          icon={Activity}
          subtitle="System operational"
        />
      </div>

      <ChartSection chartData={chartData} pieData={pieData} />
    </div>
  );
};

export default Dashboard;