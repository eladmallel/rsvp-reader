import { BottomNav } from '@/components/ui/BottomNav';
import styles from './layout.module.css';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.mainLayout}>
      <div className={styles.mainContent}>{children}</div>
      <BottomNav />
    </div>
  );
}
