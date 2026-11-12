'use client';

import { useEffect } from 'react';
import {
  comparerAuHorizon,
  estAEclaircir,
  estBloquante,
  type Alerte,
  type Contexte,
  type Reponses,
  type Resultat as ResultatType,
} from '@/lib/score/engine.ts';
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

function titreBloquants(n: number): string {
  if (n === 1) return 'Le point qui freine le plus la valeur de votre entreprise';
  return `Les ${n} points qui freinent le plus la valeur de votre entreprise`;
}

/**
 * Bloc des alertes à seuil (spec « Repérer les points qui bloqueront une reprise », §2.2 et §3).
 * `moisRestants` vient de l'horizon du dirigeant (feature Plan à 3 ans) ; absent, seul le délai est affiché.
 */
function Alertes({
  alertes,
  axesLesPlusFaibles,
  incoherence,
  moisRestants,
  lectureSeule,
}: {
  alertes: Alerte[];
  axesLesPlusFaibles: ResultatType['axesLesPlusFaibles'];
  incoherence: boolean;
  moisRestants?: number;
  lectureSeule: boolean;
}) {
  const bloquantes = alertes.filter(estBloquante);
  const aEclaircir = alertes.filter(estAEclaircir);

  return (
    <section className="card" aria-labelledby="titre-alertes">
      <p className="eyebrow">Ce qui freine la valeur</p>
      {bloquantes.length > 0 ? (
        <>
          <h2 id="titre-alertes" style={{ marginTop: 6 }}>
            {titreBloquants(bloquantes.length)}
          </h2>
          {incoherence && (
            <p className="small muted" style={{ marginTop: 8 }}>
              Vos réponses sur l’équipe et sur votre présence ne vont pas dans le même sens.
            </p>
          )}
          <div className="list" style={{ marginTop: 14 }}>
            {bloquantes.map((al) => {
              const horizon = moisRestants !== undefined ? comparerAuHorizon(al, moisRestants) : null;
              return (
                <article key={al.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-alerte={al.id}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="pill crit">Bloquant</span>
                    {horizon?.aLancerMaintenant && <span className="pill warn">À lancer maintenant</span>}
                    <h3 style={{ margin: 0 }}>{al.titre}</h3>
                  </div>
                  <p>{al.fait}</p>
                  <p className="muted">{al.pourquoi}</p>
                  <p className="small">
                    <span className="muted">Délai réaliste pour corriger :</span> {al.delaiTexte}
                    <span className="muted"> · ordre de grandeur</span>
                  </p>
                  {horizon && <p className="small">{horizon.texte}</p>}
                  <details
                    onToggle={(e) => {
                      if (!lectureSeule && (e.currentTarget as HTMLDetailsElement).open)
                        track('alert_action_opened', { type: al.id });
                    }}
                  >
                    <summary>Par où commencer</summary>
                    <p>
                      <b>{al.action.titre}</b> · {al.action.duree}
                    </p>
                    {al.action.pourquoi && <p className="muted">{al.action.pourquoi}</p>}
                    <p className="muted">{al.action.detail}</p>
                    {al.action.premiereEtape && (
                      <p>
                        <span className="muted">Première étape :</span> {al.action.premiereEtape}
                      </p>
                    )}
                  </details>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <h2 id="titre-alertes" style={{ marginTop: 6 }}>
            Aucun point bloquant repéré
          </h2>
          {axesLesPlusFaibles.length > 0 && (
            <p className="muted" style={{ marginTop: 8 }}>
              Vos deux axes les plus faibles restent{' '}
              {axesLesPlusFaibles.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ' et '}
                  <b>{a.nom.toLowerCase()}</b> ({a.score} / 100)
                </span>
              ))}
              . C’est là que votre score progressera le plus vite.
            </p>
          )}
        </>
      )}

      {aEclaircir.length > 0 && (
        <div
          className="list"
          style={bloquantes.length > 0 ? { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' } : { marginTop: 14 }}
        >
          {aEclaircir.map((al) => (
            <article key={al.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-alerte={al.id}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="pill warn">À éclaircir</span>
                <h3 style={{ margin: 0 }}>{al.titre}</h3>
              </div>
              <p className="muted">{al.question}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Écran de résultat. Sans `onRecommencer` (page /r/<token>), il est en lecture seule :
 * ni formulaire d'enregistrement, ni bouton « Refaire le point », ni événement analytics.
 * `moisRestants` : temps restant avant l'horizon du dirigeant, quand il est connu (feature Plan à 3 ans).
 */
export function Resultat({
  resultat,
  contexte,
  reponses,
  onRecommencer,
  moisRestants,
}: {
  resultat: ResultatType;
  contexte: Contexte;
  reponses?: Reponses;
  onRecommencer?: () => void;
  moisRestants?: number;
}) {
  const { dependance: dep } = resultat;
  const lectureSeule = !onRecommencer;

  useEffect(() => {
    if (!lectureSeule) track('dependency_block_viewed', { indice: dep.indice });
  }, [dep.indice, lectureSeule]);

  useEffect(() => {
    if (lectureSeule) return;
    const bloquantes = resultat.alertes.filter(estBloquante);
    if (bloquantes.length === 0) track('alerts_none');
    for (const al of bloquantes) track('alert_displayed', { type: al.id, delai: al.delaiTexte });
  }, [resultat.alertes, lectureSeule]);

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

      {/* Alertes à seuil : après l'indice de dépendance, avant le score global (spec alertes §2.2) */}
      <Alertes
        alertes={resultat.alertes}
        axesLesPlusFaibles={resultat.axesLesPlusFaibles ?? []}
        incoherence={resultat.incoherenceAlertes}
        moisRestants={moisRestants}
        lectureSeule={lectureSeule}
      />

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
              {a.pourquoi && <p className="muted">{a.pourquoi}</p>}
              <p className="muted">{a.detail}</p>
              {a.premiereEtape && (
                <p>
                  <span className="muted">Première étape :</span> {a.premiereEtape}
                </p>
              )}
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
