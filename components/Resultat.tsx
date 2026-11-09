'use client';

import { useEffect } from 'react';
import type { Contexte, Reponses, Resultat as ResultatType } from '@/lib/score/engine.ts';
import { track } from '@/lib/analytics.ts';
import { EnregistrerResultat } from './EnregistrerResultat';

function Jauge({ valeur, legende, brass = false }: { valeur: number; legende: string; brass?: boolean }) {
  const c = 2 * Math.PI * 52;
  return (
    <div className="gauge" role="img" aria-label={`${legende} : ${valeur} sur 100`}>
      <svg viewBox="0 0 120 120">
        <circle className="track" cx="60" cy="60" r="52" />
        <circle className={`fill${brass ? ' brass' : ''}`} cx="60" cy="60" r="52" strokeDasharray={`${(c * valeur) / 100} ${c}`} />
      </svg>
      <div className="val">
        <b className="num">{valeur}</b>
        <span>{legende}</span>
      </div>
    </div>
  );
}

/**
 * Écran de résultat. Sans `onRecommencer` (page /r/<token>), il est en lecture seule :
 * ni formulaire d'enregistrement, ni bouton « Refaire le point », ni événement analytics.
 */
export function Resultat({
  resultat,
  contexte,
  reponses,
  onRecommencer,
}: {
  resultat: ResultatType;
  contexte: Contexte;
  reponses?: Reponses;
  onRecommencer?: () => void;
}) {
  const { dependance: dep } = resultat;
  const lectureSeule = !onRecommencer;

  useEffect(() => {
    if (!lectureSeule) track('dependency_block_viewed', { indice: dep.indice });
  }, [dep.indice, lectureSeule]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {resultat.horsCible && (
        <p className="banner">
          Relève est conçu pour les entreprises de 3 à 30 personnes ; certaines recommandations peuvent ne pas
          s’appliquer.
        </p>
      )}

      {/* Bloc dépendance, en tête (spec 2.4) */}
      <section className="card" aria-labelledby="titre-dep">
        <p className="eyebrow">À quel point l’entreprise repose sur vous</p>
        <div className="hero" style={{ marginTop: 16 }}>
          <Jauge valeur={dep.indice} legende="Dépendance" brass />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 id="titre-dep">{dep.libelle}</h2>
            {dep.indice > 0 && !resultat.dirigeantSeul && (
              <p className="big">
                Décote de valeur estimée : {dep.decote.fourchette}
                <span className="small muted" style={{ display: 'block', fontFamily: 'var(--font-body)', color: 'var(--fg-2)' }}>
                  dépendance {dep.decote.niveau} · ordre de grandeur constaté par les experts-comptables, à confirmer
                  avec le vôtre
                </span>
              </p>
            )}
            <p className="muted">{dep.phrase}</p>
            {dep.incoherence && (
              <p className="small muted">Vos réponses suggèrent que l’activité tient plus à vous que vous ne le pensez.</p>
            )}
          </div>
        </div>
        {resultat.actions[0]?.axe === 'dep' && (
          <details
            style={{ marginTop: 18 }}
            onToggle={(e) => {
              if (!lectureSeule && (e.currentTarget as HTMLDetailsElement).open)
                track('dependency_action_opened', { indice: dep.indice });
            }}
          >
            <summary>Comment réduire cette dépendance</summary>
            <p>
              <b>{resultat.actions[0].titre}</b> · {resultat.actions[0].duree}
            </p>
            <p className="muted">{resultat.actions[0].detail}</p>
          </details>
        )}
      </section>

      {/* Score global et axes */}
      <section className="card">
        <div className="hero">
          <Jauge valeur={resultat.scoreGlobal} legende="Transmissibilité" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="eyebrow">Votre score global</p>
            <h2>
              Votre entreprise est <span style={{ color: 'var(--ink)' }}>{resultat.libelleGlobal}</span>.
            </h2>
            <p className="muted small">
              Score sur 100, pondéré selon les six axes. Il mesure la capacité de l’entreprise à fonctionner et à
              garder sa valeur indépendamment de vous.
            </p>
          </div>
        </div>
        <div className="axes" style={{ marginTop: 24 }}>
          {resultat.axes.map((a) => {
            const cls = a.score < 45 ? 'low' : a.score < 65 ? 'mid' : '';
            return (
              <div className="axis" key={a.id}>
                <span style={{ fontWeight: 500 }}>{a.nom}</span>
                <span className="sc">{a.score} / 100</span>
                <div className="bar" aria-hidden="true">
                  <i className={cls} style={{ width: `${a.score}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Alertes */}
      {resultat.alertes.length > 0 && (
        <section className="card">
          <p className="eyebrow">Les points qui bloqueraient un tiers</p>
          <div className="list" style={{ marginTop: 14 }}>
            {resultat.alertes.map((al) => (
              <div key={al.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="pill crit">Bloquant</span>
                  <b>{al.titre}</b>
                </div>
                <p className="muted small">{al.explication}</p>
                <p className="small">
                  <span className="muted">Délai pour corriger :</span> {al.delai}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3 actions gratuites */}
      <section className="card">
        <p className="eyebrow">Par où commencer</p>
        <h3 style={{ marginTop: 6 }}>Les trois premières actions</h3>
        <div className="list" style={{ marginTop: 14 }}>
          {resultat.actions.map((a, i) => (
            <details key={a.questionId}>
              <summary>
                {i + 1}. {a.titre} <span className="muted small">· {a.duree}</span>
              </summary>
              <p className="muted">{a.detail}</p>
            </details>
          ))}
          {resultat.actions.length === 0 && <p className="muted">Rien à signaler : votre entreprise fonctionne sans vous.</p>}
        </div>
      </section>

      {resultat.pointsAEclaircir.length > 0 && (
        <section className="card">
          <p className="eyebrow">Points à éclaircir</p>
          <p className="muted small" style={{ marginTop: 6 }}>
            Vous avez répondu « je ne sais pas » à ces questions. Elles ont été comptées défavorablement ; les
            éclaircir fera monter votre score.
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
            {resultat.pointsAEclaircir.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {!lectureSeule && reponses && <EnregistrerResultat contexte={contexte} reponses={reponses} />}

      <div className="q-nav no-print">
        {onRecommencer ? (
          <button className="btn" id="btn-recommencer" onClick={onRecommencer}>
            Refaire le point
          </button>
        ) : (
          <span className="small muted">Pour l’imprimer ou l’enregistrer en PDF, utilisez le menu de votre navigateur.</span>
        )}
        <span className="small muted" style={{ alignSelf: 'center' }}>
          {contexte.secteur} · {contexte.effectif}
        </span>
      </div>
    </div>
  );
}
