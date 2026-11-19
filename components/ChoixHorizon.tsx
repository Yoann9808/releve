'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Contexte, Reponses } from '@/lib/score/engine.ts';
import { HORIZONS, LIBELLES_HORIZON, estHypothese, moisRestants, type Horizon } from '@/lib/plan/horizon.ts';
import { ecrireSuivi, lireSuivi, suiviDepuis } from '@/lib/plan/stockage.ts';
import { track } from '@/lib/analytics.ts';

/**
 * La question d'horizon (spec plan §2.1) : une seule question, posée après l'enregistrement du résultat,
 * modifiable à tout moment. Le choix est gardé sur cet appareil avec le résultat, pour construire le plan.
 */
export function ChoixHorizon({
  contexte,
  reponses,
  horizon,
  onChange,
}: {
  contexte: Contexte;
  reponses: Reponses;
  horizon: { valeur: Horizon; choisiLe: number } | null;
  onChange: (horizon: Horizon, choisiLe: number) => void;
}) {
  const [modification, setModification] = useState(false);
  const [stockageOk, setStockageOk] = useState(true);

  function choisir(h: Horizon) {
    const choisiLe = Date.now();
    const ok = ecrireSuivi(suiviDepuis(contexte, reponses, h, choisiLe, lireSuivi()));
    setStockageOk(ok);
    track('horizon_set', { valeur: h });
    setModification(false);
    onChange(h, choisiLe);
  }

  if (horizon && !modification) {
    const mois = moisRestants(horizon.valeur, horizon.choisiLe, Date.now());
    return (
      <section className="card no-print" aria-live="polite" id="horizon">
        <p className="eyebrow">Votre horizon</p>
        <h3 style={{ marginTop: 6 }}>
          {estHypothese(horizon.valeur)
            ? 'Nous partons sur 3 ans, modifiable à tout moment.'
            : `${LIBELLES_HORIZON[horizon.valeur]} : il vous reste environ ${mois} mois.`}
        </h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Votre plan d’actions séquence, trimestre par trimestre, ce qui rendra l’entreprise plus autonome d’ici là.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <Link href="/plan" className="btn primary" id="btn-voir-plan">
            Voir mon plan à 3 ans
          </Link>
          <button className="btn ghost" type="button" onClick={() => setModification(true)}>
            Modifier l’horizon
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card no-print" id="horizon">
      <p className="eyebrow">Une dernière question</p>
      <h3 style={{ marginTop: 6 }}>À quel horizon voulez-vous que l’entreprise tourne sans vous ?</h3>
      <p className="muted" style={{ marginTop: 8 }}>
        Même approximatif. Il sert à mettre le temps qu’il vous reste en face du temps que prennent les actions.
      </p>
      {!stockageOk && (
        <p className="banner" style={{ marginTop: 12 }}>
          Le stockage du navigateur est indisponible : votre horizon ne sera pas conservé si vous fermez cette page.
        </p>
      )}
      <div className="options" style={{ marginTop: 16 }} role="group" aria-label="Horizon">
        {HORIZONS.map((h) => (
          <button
            key={h}
            type="button"
            className={`opt${h === 'inconnu' ? ' nsp' : ''}`}
            aria-pressed={horizon?.valeur === h}
            onClick={() => choisir(h)}
          >
            {LIBELLES_HORIZON[h]}
          </button>
        ))}
      </div>
      {modification && (
        <div style={{ marginTop: 12 }}>
          <button className="btn ghost" type="button" onClick={() => setModification(false)}>
            Garder l’horizon actuel
          </button>
        </div>
      )}
    </section>
  );
}
