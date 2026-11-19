import type { Metadata } from 'next';
import { Plan } from '@/components/Plan';

export const metadata: Metadata = {
  title: 'Mon plan d’actions à 3 ans · Relève',
  robots: { index: false, follow: false, nocache: true },
};

export default function PagePlan() {
  return (
    <main className="wrap">
      <div className="brand">
        <span className="mark">Relève</span>
        <span className="tag">Mon plan</span>
      </div>
      <Plan />
    </main>
  );
}
