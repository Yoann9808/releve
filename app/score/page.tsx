import type { Metadata } from 'next';
import { Questionnaire } from '@/components/Questionnaire';

export const metadata: Metadata = {
  title: 'Faire le point sur mon entreprise · Relève',
  robots: { index: false, follow: false },
};

export default function PageScore() {
  return (
    <main className="wrap">
      <div className="brand">
        <span className="mark">Relève</span>
        <span className="tag">Faire le point</span>
      </div>
      <Questionnaire />
    </main>
  );
}
