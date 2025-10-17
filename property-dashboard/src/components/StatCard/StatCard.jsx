import styles from './StatCard.module.css';

const StatCard = ({ title, value, icon: Icon, subtitle }) => {
  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.info}>
          <p className={styles.title}>{title}</p>
          <p className={styles.value}>{value}</p>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.iconWrapper}>
          <Icon size={24} className={styles.icon} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;