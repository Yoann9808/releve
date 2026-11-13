'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionVisible, PlanVisible } from '@/lib/plan/acces.ts';
import { TRIMESTRES } from '@/lib/plan/catalogue.ts';
import { peutResequencer } from '@/lib/plan/engine.ts';
import { HORIZONS, LIBELLES_HORIZON, PHRASE_ACCELERE, TEXTES_ETAT, type Horizon } from '@/lib/plan/horizon.ts';
import { ecrireSuivi, lireSuivi, type SuiviPlan } from '@/lib/plan/stockage.ts';
import { track } from '@/lib/analytics.ts';

type Etat =
  | { t: 'chargement' }
  | { t: 'vide' }
  | { t: 'erreur'; message: string }
  | { t: 'pret'; plan: PlanVisible; suivi: SuiviPlan };

const MOIS_COURT = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

/** « nov. 2026 – janv. 2027 » pour le trimestre n (1 = en cours), compté depuis aujourd'hui. */
function periodeDuTrimestre(n: number, depuis: number): string {
  const d = new Date(depuis);
  const debut = new Date(d.getFullYear(), d.getMonth() + (n - 1) * 3, 1);
  const fin = new Date(d.getFullYear(), d.getMonth() + n * 3 - 1, 1);
  return `${MOIS_COURT.format(debut)} – ${MOIS_COURT.format(fin)}`;
}

function texteDuree(mois: number): string {
  if (mois === 12) return '1 an';
  if (mois === 24) return '2 ans';
  if (mois === 36) return '3 ans';
  return `${mois} mois`;
}

function texteTrimestres(a: ActionVisible): string {
  if (a.trimestreDebut === null || a.trimestreFin === null) return '';
  if (a.trimestreFin > TRIMESTRES) return `du trimestre ${a.trimestreDebut} à après les 3 ans`;
  if (a.trimestreDebut === a.trimestreFin) return `trimestre ${a.trimestreDebut}`;
  return `trimestres ${a.trimestreDebut} à ${a.trimestreFin}`;
}

function Paywall() {
  useEffect(() => {
    track('paywall_viewed');
  }, []);
  return (
    <section className="card ink no-print" id="debloquer" aria-labelledby="titre-debloquer">
      <p className="eyebrow">Plan complet</p>
      <h3 id="titre-debloquer" style={{ color: '#fff', marginTop: 6 }}>
        Débloquer mon plan complet et le suivi trimestriel
      </h3>
      <p className="muted" style={{ marginTop: 8 }}>
        Le détail de chaque action et ses micro-étapes, trimestre par trimestre, et chaque trimestre un point de
        15 minutes pour refaire le score et voir ce qui a progressé. L’abonnement en ligne ouvre bientôt : les trois
        premières actions restent ouvertes et cochables en attendant.
      </p>
      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled aria-describedby="debloquer-aide" id="btn-debloquer">
          Débloquer mon plan complet
        </button>
        <p id="debloquer-aide" className="muted small" style={{ marginTop: 8 }}>
          Bientôt disponible.
        </p>
      </div>
    </section>
  );
}

function CarteAction({
  action,
  coches,
  onEtape,
  onFaite,
}: {
  action: ActionVisible;
  coches: number[];
  onEtape: (index: number, fait: boolean) => void;
  onFaite: (faite: boolean) => void;
}) {
  const toutesCochees = action.etapes.length > 0 && action.etapes.every((_, i) => coches.includes(i));
  return (
    <article className={`action${action.faite ? ' faite' : ''}`} data-action={action.id} data-verrouillee={action.verrouillee}>
      <div className="entete">
        {action.gratuite && <span className="pill good">Ouverte</span>}
        {action.origine === 'alerte' && <span className="pill crit">Point bloquant</span>}
        {action.faite && <span className="pill neutral">Faite</span>}
        <h3 style={{ margin: 0 }}>
          {action.rang}. {action.titre}
        </h3>
      </div>
      <p className="muted small">
        {action.axeNom} · {texteDuree(action.dureeMois)}
        {texteTrimestres(action) && <> · {texteTrimestres(action)}</>}
        {action.effet.axe > 0 && (
          <>
            {' '}
            · jusqu’à +{action.effet.axe} points sur l’axe, +{action.effet.global} sur le score
          </>
        )}
      </p>
      {action.verrouillee ? (
        <>
          <div className="flou" aria-hidden="true">
            <i style={{ width: '92%' }} />
            <i style={{ width: '78%' }} />
            <i style={{ width: '85%' }} />
          </div>
          <p className="muted small">Le détail et les micro-étapes font partie du plan complet.</p>
        </>
      ) : (
        <>
          {action.pourquoi && <p className="muted">{action.pourquoi}</p>}
          {action.detail && <p>{action.detail}</p>}
          <div className="etapes" role="group" aria-label={`Micro-étapes : ${action.titre}`}>
            {action.etapes.map((e, i) => {
              const fait = action.faite || coches.includes(i);
              const id = `etape-${action.id}-${i}`;
              return (
                <label key={id} htmlFor={id} className={`etape${fait ? ' faite' : ''}`}>
                  <input
                    id={id}
                    type="checkbox"
                    className="check"
                    checked={fait}
                    disabled={action.faite}
                    onChange={(ev) => onEtape(i, ev.target.checked)}
                  />
                  <span>{e.titre}</span>
                  <span className="duree">{e.minutes} min</span>
                </label>
              );
            })}
          </div>
          <div style={{ marginTop: 8 }}>
            {action.faite ? (
              <button className="btn ghost" type="button" onClick={() => onFaite(false)}>
                Rouvrir cette action
              </button>
            ) : (
              <button className={`btn${toutesCochees ? ' primary' : ''}`} type="button" onClick={() => onFaite(true)}>
                Marquer l’action comme faite
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

/**
 * Écran /plan (spec « Transformer mon score en plan d'actions à 3 ans », §2.2 à §2.4).
 * Le plan vient du serveur (POST /api/plan) : le navigateur ne reçoit jamais le détail d'une action
 * verrouillée. Le suivi (horizon, cases cochées) reste sur cet appareil tant qu'il n'y a pas de compte.
 */
export function Plan() {
  const [etat, setEtat] = useState<Etat>({ t: 'chargement' });
  const [modifHorizon, setModifHorizon] = useState(false);
  const planVu = useRef(false);

  const charger = useCallback(async (suivi: SuiviPlan) => {
    const maintenant = Date.now();
    // Pas de re-séquencement plus d'une fois par semaine (spec §3) : on renvoie l'ordre précédent.
    const garderOrdre = suivi.sequenceLe !== null && !peutResequencer(suivi.sequenceLe, maintenant);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contexte: suivi.contexte,
          reponses: suivi.reponses,
          horizon: suivi.horizon,
          choisiLe: suivi.choisiLe,
          faites: suivi.faites,
          ordrePrecedent: garderOrdre ? suivi.ordre : [],
          actionsConnues: suivi.actionsConnues,
        }),
      });
      const corps = (await res.json().catch(() => ({}))) as { ok?: boolean; plan?: PlanVisible; erreur?: string };
      if (!res.ok || !corps.ok || !corps.plan) {
        setEtat({ t: 'erreur', message: corps.erreur ?? 'Une erreur est survenue. Merci de réessayer.' });
        return;
      }
      const plan = corps.plan;
      const ids = plan.actions.map((a) => a.id);
      const suiviAJour: SuiviPlan = {
        ...suivi,
        ordre: garderOrdre ? suivi.ordre : ids,
        sequenceLe: garderOrdre ? suivi.sequenceLe : maintenant,
        actionsConnues: [...new Set([...ids, ...plan.archivees.map((a) => a.id)])],
      };
      ecrireSuivi(suiviAJour);
      setEtat({ t: 'pret', plan, suivi: suiviAJour });
      if (!planVu.current) {
        planVu.current = true;
        track('plan_viewed', { horizon: plan.horizon, etat: plan.etat ?? 'aucune-alerte', actions: ids.length });
      }
    } catch {
      setEtat({ t: 'erreur', message: 'La connexion a échoué. Vérifiez votre accès à internet et réessayez.' });
    }
  }, []);

  useEffect(() => {
    const s = lireSuivi();
    if (!s) {
      setEtat({ t: 'vide' });
      return;
    }
    void charger(s);
  }, [charger]);

  const suivi = etat.t === 'pret' ? etat.suivi : null;

  function majSuivi(modif: Partial<SuiviPlan>, recharger = false) {
    if (!suivi) return;
    const s: SuiviPlan = { ...suivi, ...modif };
    ecrireSuivi(s);
    if (recharger) {
      setEtat({ t: 'chargement' });
      void charger(s);
    } else if (etat.t === 'pret') {
      setEtat({ ...etat, suivi: s });
    }
  }

  function cocherEtape(id: string, index: number, fait: boolean) {
    if (!suivi) return;
    const actuelles = suivi.coches[id] ?? [];
    const coches = fait ? [...new Set([...actuelles, index])] : actuelles.filter((i) => i !== index);
    majSuivi({ coches: { ...suivi.coches, [id]: coches } });
    if (fait) track('action_step_done', { action: id, etape: index + 1 });
  }

  function marquerFaite(id: string, faite: boolean) {
    if (!suivi) return;
    const faites = faite ? [...new Set([...suivi.faites, id])] : suivi.faites.filter((x) => x !== id);
    majSuivi({ faites }, true);
  }

  function changerHorizon(h: Horizon) {
    setModifHorizon(false);
    track('horizon_set', { valeur: h });
    majSuivi({ horizon: h, choisiLe: Date.now() }, true);
  }

  const parTrimestre = useMemo(() => {
    if (etat.t !== 'pret') return [];
    const parId = new Map(etat.plan.actions.map((a) => [a.id, a]));
    return etat.plan.trimestres
      .filter((t) => t.commencent.length > 0)
      .map((t) => ({ ...t, actions: t.commencent.map((id) => parId.get(id)!) }));
  }, [etat]);

  if (etat.t === 'chargement') return <p className="muted">Préparation de votre plan…</p>;

  if (etat.t === 'vide') {
    return (
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1>Aucun résultat sur cet appareil.</h1>
        <p className="muted">
          Le plan se construit à partir de votre score et de l’horizon que vous choisissez après l’avoir enregistré.
          Faire le point prend 20 minutes environ.
        </p>
        <p>
          <Link className="btn primary" href="/score">
            Faire le point sur mon entreprise
          </Link>
        </p>
      </section>
    );
  }

  if (etat.t === 'erreur') {
    return (
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1>Votre plan n’a pas pu être préparé.</h1>
        <p role="alert" className="muted">
          {etat.message}
        </p>
        <p>
          <button className="btn primary" type="button" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </p>
      </section>
    );
  }

  const { plan } = etat;
  const parId = new Map(plan.actions.map((a) => [a.id, a]));
  const texteEtat = plan.etat ? TEXTES_ETAT[plan.etat] : null;
  const premiereVerrouillee = plan.actions.find((a) => a.verrouillee && !a.faite);
  const trimestrePaywall = premiereVerrouillee?.trimestreDebut ?? null;
  const faites = plan.actions.filter((a) => a.faite);
  const maxBarre = Math.max(plan.moisRestants, plan.delaiMax ?? 0, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="eyebrow">Plan d’actions</p>
        <h1>Trois ans pour que l’entreprise tourne sans vous.</h1>
        <p className="muted">
          Une à deux actions par trimestre, jamais plus de trois en même temps. Chaque action est découpée en
          étapes de 15 à 30 minutes.
        </p>
      </section>

      {/* Ligne de temps (spec §2.2) */}
      <section className="card" aria-labelledby="titre-temps" id="temps">
        <p className="eyebrow">Le temps qu’il vous reste</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          {texteEtat && (
            <span className={`pill ${plan.etat === 'temps' ? 'good' : plan.etat === 'moment' ? 'warn' : 'crit'}`}>
              {texteEtat.titre}
            </span>
          )}
          <h2 id="titre-temps" style={{ margin: 0 }}>
            {plan.hypothese
              ? `Nous partons sur 3 ans : environ ${plan.moisRestants} mois.`
              : `Environ ${plan.moisRestants} mois d’ici votre horizon.`}
          </h2>
        </div>
        {plan.hypothese && <p className="muted" style={{ marginTop: 8 }}>C’est une hypothèse, pas un compte à rebours : vous pouvez la changer quand vous voulez.</p>}
        <div className="ligne-temps" style={{ marginTop: 16 }}>
          <div className="barre">
            <span style={{ fontWeight: 500 }}>Aujourd’hui → votre horizon</span>
            <span className="num muted small">{plan.moisRestants} mois</span>
            <div className="track" aria-hidden="true">
              <i style={{ width: `${(plan.moisRestants / maxBarre) * 100}%` }} />
            </div>
          </div>
          {plan.delaiMax !== null && (
            <div className="barre">
              <span style={{ fontWeight: 500 }}>Le point le plus long à corriger</span>
              <span className="num muted small">{plan.delaiMax} mois</span>
              <div className="track" aria-hidden="true">
                <i className={plan.etat === 'maintenant' ? 'crit' : 'brass'} style={{ width: `${(plan.delaiMax / maxBarre) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
        {texteEtat && <p style={{ marginTop: 14 }}>{texteEtat.phrase}</p>}
        {plan.accelere && <p className="banner" style={{ marginTop: 12 }}>{PHRASE_ACCELERE}</p>}
        <div style={{ marginTop: 16 }}>
          {modifHorizon ? (
            <div className="field">
              <label htmlFor="horizon">À quel horizon voulez-vous que l’entreprise tourne sans vous ?</label>
              <select
                id="horizon"
                className="select"
                value={plan.horizon}
                onChange={(e) => changerHorizon(e.target.value as Horizon)}
              >
                {HORIZONS.map((h) => (
                  <option key={h} value={h}>
                    {LIBELLES_HORIZON[h]}
                  </option>
                ))}
              </select>
              <button className="btn ghost" type="button" onClick={() => setModifHorizon(false)}>
                Garder {LIBELLES_HORIZON[plan.horizon].toLowerCase()}
              </button>
            </div>
          ) : (
            <button className="btn ghost no-print" type="button" onClick={() => setModifHorizon(true)}>
              Modifier l’horizon ({LIBELLES_HORIZON[plan.horizon].toLowerCase()})
            </button>
          )}
        </div>
      </section>

      {plan.actions.length === 0 && (
        <section className="card">
          <h2>Rien à planifier.</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Votre entreprise fonctionne sans vous. Refaites le point dans un trimestre pour vérifier que cela tient.
          </p>
        </section>
      )}

      {parTrimestre.length > 0 && (
        <nav className="chips no-print" aria-label="Trimestres">
          {parTrimestre.map((t) => (
            <a key={t.numero} className="chip" href={`#trimestre-${t.numero}`}>
              T{t.numero}
            </a>
          ))}
        </nav>
      )}

      {parTrimestre.map((t) => (
        <section key={t.numero} className="card trimestre" id={`trimestre-${t.numero}`} aria-labelledby={`titre-t${t.numero}`}>
          <p className="eyebrow">
            Trimestre {t.numero} · {periodeDuTrimestre(t.numero, plan.genereLe)}
          </p>
          <h2 id={`titre-t${t.numero}`} style={{ marginTop: 6 }}>
            {t.actions.length === 1 ? 'Une action à commencer' : `${t.actions.length} actions à commencer`}
          </h2>
          {t.enCours.length > t.commencent.length && (
            <p className="muted small" style={{ marginTop: 6 }}>
              En parallèle, vous poursuivez : {t.enCours.filter((id) => !t.commencent.includes(id)).map((id) => parId.get(id)!.titre).join(' ; ')}.
            </p>
          )}
          <div className="list" style={{ marginTop: 14 }}>
            {t.actions.map((a) => (
              <CarteAction
                key={a.id}
                action={a}
                coches={suivi?.coches[a.id] ?? []}
                onEtape={(i, fait) => cocherEtape(a.id, i, fait)}
                onFaite={(f) => marquerFaite(a.id, f)}
              />
            ))}
          </div>
          {trimestrePaywall === t.numero && !plan.complet && (
            <div style={{ marginTop: 20 }}>
              <Paywall />
            </div>
          )}
        </section>
      ))}

      {!plan.complet && premiereVerrouillee && trimestrePaywall === null && <Paywall />}

      {plan.auDela.length > 0 && (
        <section className="card" aria-labelledby="titre-audela">
          <p className="eyebrow">Après les trois ans</p>
          <h2 id="titre-audela" style={{ marginTop: 6 }}>
            {plan.auDela.length === 1 ? 'Une action viendra ensuite' : `${plan.auDela.length} actions viendront ensuite`}
          </h2>
          <p className="muted small" style={{ marginTop: 6 }}>
            Elles ne tiennent pas dans les douze trimestres sans dépasser trois actions en même temps. Elles
            remonteront dans le plan au fur et à mesure que les autres seront faites.
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
            {plan.auDela.map((id) => (
              <li key={id}>
                {parId.get(id)!.titre} <span className="muted small">· {parId.get(id)!.axeNom}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {faites.length > 0 && (
        <section className="card" aria-labelledby="titre-faites">
          <p className="eyebrow">Fait</p>
          <h2 id="titre-faites" style={{ marginTop: 6 }}>
            {faites.length === 1 ? 'Une action faite' : `${faites.length} actions faites`}
          </h2>
          <div className="list" style={{ marginTop: 14 }}>
            {faites.map((a) => (
              <CarteAction
                key={a.id}
                action={a}
                coches={suivi?.coches[a.id] ?? []}
                onEtape={(i, fait) => cocherEtape(a.id, i, fait)}
                onFaite={(f) => marquerFaite(a.id, f)}
              />
            ))}
          </div>
        </section>
      )}

      {plan.archivees.length > 0 && (
        <section className="card" aria-labelledby="titre-archivees">
          <p className="eyebrow">Archivées</p>
          <h2 id="titre-archivees" style={{ marginTop: 6 }}>
            Ces actions n’ont plus lieu d’être
          </h2>
          <p className="muted small" style={{ marginTop: 6 }}>
            Votre dernier score les a rendues inutiles. Elles restent visibles, rien n’est supprimé.
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
            {plan.archivees.map((a) => (
              <li key={a.id} className="muted" style={{ textDecoration: 'line-through' }}>
                {a.titre}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="q-nav no-print">
        <Link href="/score" className="btn">
          Refaire le point
        </Link>
        <span className="small muted" style={{ alignSelf: 'center' }}>
          Votre suivi reste sur cet appareil.
        </span>
      </div>
    </div>
  );
}
