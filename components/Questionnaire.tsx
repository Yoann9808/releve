'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AXES, CONTEXTE, QUESTIONS } from '@/lib/score/content.ts';
import { calculerResultat, type Contexte, type Reponse, type Reponses } from '@/lib/score/engine.ts';
import { ecrireBrouillon, effacerBrouillon, lireBrouillon, stockageDisponible } from '@/lib/score/stockage.ts';
import { track } from '@/lib/analytics.ts';
import { Resultat } from './Resultat';

/** Étape 0 : contexte. Étapes 1..26 : questions. Étape 27 : résultat. */
const ETAPE_RESULTAT = QUESTIONS.length + 1;

export function Questionnaire() {
  const [etape, setEtape] = useState(0);
  const [contexte, setContexte] = useState<Contexte>({});
  const [reponses, setReponses] = useState<Reponses>({});
  const [pret, setPret] = useState(false);
  const [stockageOk, setStockageOk] = useState(true);
  const [reprise, setReprise] = useState(false);
  const axesTermines = useRef(new Set<string>());

  // Restauration du brouillon (30 jours), uniquement côté navigateur.
  useEffect(() => {
    const b = lireBrouillon();
    if (b && b.etape > 0) {
      setEtape(Math.min(b.etape, QUESTIONS.length));
      setContexte(b.contexte);
      setReponses(b.reponses);
      setReprise(true);
    } else {
      track('score_started');
    }
    setStockageOk(stockageDisponible());
    setPret(true);
  }, []);

  // Sauvegarde locale à chaque changement.
  useEffect(() => {
    if (!pret || etape >= ETAPE_RESULTAT) return;
    ecrireBrouillon({ etape, contexte, reponses });
  }, [pret, etape, contexte, reponses]);

  // Abandon : si la page se ferme avant le résultat.
  useEffect(() => {
    if (!pret) return;
    const onLeave = () => {
      if (etape > 0 && etape < ETAPE_RESULTAT) track('score_abandoned', { etape });
    };
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, [pret, etape]);

  const question = etape >= 1 && etape <= QUESTIONS.length ? QUESTIONS[etape - 1] : null;
  const axe = question ? AXES.find((a) => a.id === question.axe)! : null;
  const indexDansAxe = question ? QUESTIONS.filter((q) => q.axe === question.axe).indexOf(question) + 1 : 0;
  const totalAxe = question ? QUESTIONS.filter((q) => q.axe === question.axe).length : 0;

  const resultat = useMemo(
    () => (etape >= ETAPE_RESULTAT ? calculerResultat(reponses, contexte) : null),
    [etape, reponses, contexte],
  );

  useEffect(() => {
    if (resultat) {
      track('score_displayed', { score: resultat.scoreGlobal, indice: resultat.dependance.indice });
      effacerBrouillon();
    }
  }, [resultat]);

  function repondre(r: Reponse) {
    if (!question) return;
    setReponses((prev) => ({ ...prev, [question.id]: r }));
  }

  function suivant() {
    if (question) {
      const suivante = QUESTIONS[etape]; // question d'après (index = etape)
      if (!suivante || suivante.axe !== question.axe) {
        if (!axesTermines.current.has(question.axe)) {
          axesTermines.current.add(question.axe);
          track('axe_completed', { axe: question.axe });
        }
      }
    }
    setEtape((e) => Math.min(e + 1, ETAPE_RESULTAT));
    window.scrollTo({ top: 0 });
  }

  function precedent() {
    setEtape((e) => Math.max(e - 1, 0));
    window.scrollTo({ top: 0 });
  }

  function recommencer() {
    effacerBrouillon();
    axesTermines.current.clear();
    setReponses({});
    setContexte({});
    setEtape(0);
    setReprise(false);
    track('score_started');
  }

  if (!pret) return <p className="muted">Chargement…</p>;

  if (resultat) {
    return <Resultat resultat={resultat} contexte={contexte} onRecommencer={recommencer} />;
  }

  // Étape 0 : contexte
  if (etape === 0) {
    const complet = Boolean(contexte.secteur && contexte.effectif && contexte.chiffre);
    return (
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <p className="eyebrow">Avant de commencer</p>
          <h1 style={{ marginTop: 8 }}>Trois repères sur votre entreprise.</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            Des ordres de grandeur suffisent. Ils servent à adapter les questions et le résultat, rien d’autre.
          </p>
        </div>
        {!stockageOk && (
          <p className="banner">Vos réponses seront perdues si vous fermez cette page (stockage du navigateur indisponible).</p>
        )}
        <div className="field">
          <label htmlFor="secteur">Votre secteur</label>
          <select
            id="secteur"
            className="select"
            value={contexte.secteur ?? ''}
            onChange={(e) => setContexte({ ...contexte, secteur: e.target.value || undefined })}
          >
            <option value="">Choisir…</option>
            {CONTEXTE.secteurs.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="effectif">Votre effectif</label>
          <select
            id="effectif"
            className="select"
            value={contexte.effectif ?? ''}
            onChange={(e) => setContexte({ ...contexte, effectif: e.target.value || undefined })}
          >
            <option value="">Choisir…</option>
            {CONTEXTE.effectifs.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="chiffre">Votre chiffre d’affaires annuel</label>
          <select
            id="chiffre"
            className="select"
            value={contexte.chiffre ?? ''}
            onChange={(e) => setContexte({ ...contexte, chiffre: e.target.value || undefined })}
          >
            <option value="">Choisir…</option>
            {CONTEXTE.chiffres.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="q-nav">
          <span className="small muted" style={{ alignSelf: 'center' }}>
            Vos réponses restent sur cet appareil jusqu’à ce que vous décidiez de les enregistrer.
          </span>
          <button className="btn primary" id="btn-commencer" disabled={!complet} onClick={suivant}>
            Commencer
          </button>
        </div>
      </section>
    );
  }

  // Étapes 1..26 : une question par écran
  const valeur = reponses[question!.id];
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {reprise && etape > 1 && (
        <p className="banner no-print">
          Vous reprenez là où vous vous étiez arrêté.{' '}
          <button className="btn ghost" style={{ minHeight: 0, padding: '0 6px' }} onClick={recommencer}>
            Repartir de zéro
          </button>
        </p>
      )}
      <div className="progress">
        <span className="small num">
          {etape} / {QUESTIONS.length}
        </span>
        <div className="track" aria-hidden="true">
          <i style={{ width: `${(etape / QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="axe">
          {axe!.nom} · {indexDansAxe}/{totalAxe}
        </span>
      </div>
      <h2 id={`q-${question!.id}`}>{question!.texte}</h2>
      <div className="options" role="group" aria-labelledby={`q-${question!.id}`}>
        {question!.options.map((o, k) => (
          <button
            key={k}
            className="opt"
            id={`opt-${question!.id}-${k}`}
            aria-pressed={valeur === k}
            onClick={() => repondre(k as Reponse)}
          >
            <span className="k">{String.fromCharCode(65 + k)}</span>
            {o}
          </button>
        ))}
        <button
          className="opt nsp"
          id={`opt-${question!.id}-nsp`}
          aria-pressed={valeur === 'nsp'}
          onClick={() => repondre('nsp')}
        >
          <span className="k">?</span>
          Je ne sais pas
        </button>
      </div>
      <div className="q-nav">
        <button className="btn" id="btn-precedent" onClick={precedent}>
          Précédent
        </button>
        <button className="btn primary" id="btn-suivant" disabled={valeur === undefined} onClick={suivant}>
          {etape === QUESTIONS.length ? 'Voir mon résultat' : 'Suivant'}
        </button>
      </div>
    </section>
  );
}
