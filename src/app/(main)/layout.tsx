import { BottomNav } from '@/components/ui/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="main-layout">
      <div className="main-content">{children}</div>
      <BottomNav />
      <style jsx>{`
        .main-layout {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }
        .main-content {
          flex: 1;
          padding-bottom: calc(72px + env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
