'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics.ts';

/** Lien de partage affiché en lecture seule, avec un bouton « Copier ». */
export function CopierLien({ lien, nouveau = false }: { lien: string; nouveau?: boolean }) {
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    if (nouveau) track('share_link_created');
  }, [nouveau]);

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        className="input"
        readOnly
        value={lien}
        aria-label="Lien de partage"
        onFocus={(e) => e.currentTarget.select()}
        style={{ flex: '1 1 260px', minWidth: 0 }}
      />
      <button className="btn" type="button" onClick={copier} aria-live="polite">
        {copie ? 'Copié' : 'Copier'}
      </button>
    </div>
  );
}
