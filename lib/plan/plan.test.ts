import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALERTES, AXES, QUESTIONS } from '../score/content.ts';
import { calculerResultat, estBloquante, type Reponse, type Reponses } from '../score/engine.ts';
import {
  CATALOGUE,
  CATALOGUE_PAR_ID,
  DEBUTS_PAR_TRIMESTRE,
  DELAI_RESEQUENCEMENT_MS,
  EN_COURS_MAX,
  ETAPE_MINUTES_MAX,
  ETAPE_MINUTES_MIN,
  TRIMESTRES,
} from './catalogue.ts';
import { etatDuTemps, MARGE_TEMPS, MOIS_PAR_HORIZON, moisRestants } from './horizon.ts';
import { dureeEnTrimestres, effetAttendu, genererPlan, peutResequencer, selectionnerActions, type Plan } from './engine.ts';
import { planVisible } from './acces.ts';
import { validerDemandePlan, validerIds } from './validation.ts';

const toutes = (r: Reponse): Reponses => Object.fromEntries(QUESTIONS.map((q) => [q.id, r]));
const JOUR = 24 * 60 * 60 * 1000;
const MOIS = (365.25 / 12) * JOUR;
const T0 = Date.UTC(2026, 10, 13);

/** Trois alertes actives (cli1, dep4 et dep5 au pire, fin3 vieilli), le reste au maximum. */
const TROIS_ALERTES: Reponses = { ...toutes(2), cli1: 0, dep4: 0, dep5: 0, fin3: 0 };

function plan(reponses: Reponses, options: Partial<Parameters<typeof genererPlan>[2]> = {}, ctx = {}): Plan {
  return genererPlan(reponses, ctx, { horizon: '3ans', choisiLe: T0, maintenant: T0, ...options });
}

/* ---------- Catalogue ---------- */

test('le catalogue a entre 20 et 30 actions, une par question, et couvre les 6 axes', () => {
  assert.ok(CATALOGUE.length >= 20 && CATALOGUE.length <= 30, `${CATALOGUE.length} actions`);
  assert.deepEqual(
    [...CATALOGUE.map((e) => e.id)].sort(),
    [...QUESTIONS.map((q) => q.id)].sort(),
  );
  for (const axe of AXES) assert.ok(CATALOGUE.some((e) => QUESTIONS.find((q) => q.id === e.id)!.axe === axe.id), axe.id);
});

test('chaque action a une durée, des micro-étapes de 15 à 30 minutes, des prérequis connus sans cycle', () => {
  for (const e of CATALOGUE) {
    assert.ok(e.dureeMois >= 1 && e.dureeMois <= 36, `${e.id} durée`);
    assert.ok(e.etapes.length >= 2, `${e.id} étapes`);
    for (const et of e.etapes) {
      assert.ok(et.minutes >= ETAPE_MINUTES_MIN && et.minutes <= ETAPE_MINUTES_MAX, `${e.id} : ${et.minutes} min`);
      assert.ok(et.titre.length > 10);
    }
    for (const p of e.prerequis) {
      assert.ok(CATALOGUE_PAR_ID.has(p), `${e.id} prérequis ${p}`);
      assert.notEqual(p, e.id);
    }
    if (!e.sansSalarie && e.remplacement) {
      assert.ok(CATALOGUE_PAR_ID.get(e.remplacement)!.sansSalarie, `${e.id} : le remplacement doit convenir sans salarié`);
    }
  }
  // Pas de cycle de prérequis.
  const visite = (id: string, pile: string[]): void => {
    assert.ok(!pile.includes(id), `cycle : ${[...pile, id].join(' → ')}`);
    for (const p of CATALOGUE_PAR_ID.get(id)!.prerequis) visite(p, [...pile, id]);
  };
  for (const e of CATALOGUE) visite(e.id, []);
});

/* ---------- Horizon et temps restant ---------- */

test('mois restants : compté depuis le choix, jamais négatif, « je ne sais pas » vaut 3 ans', () => {
  assert.equal(moisRestants('2ans', T0, T0), 24);
  assert.equal(moisRestants('2ans', T0, T0 + 6 * MOIS), 18);
  assert.equal(moisRestants('1an', T0, T0 + 20 * MOIS), 0);
  assert.equal(moisRestants('inconnu', T0, T0), 36);
  assert.equal(MOIS_PAR_HORIZON.inconnu, MOIS_PAR_HORIZON['3ans']);
});

test('état du temps : temps / moment / maintenant, et rien sans alerte', () => {
  const delai = 36;
  assert.equal(etatDuTemps(60, delai), 'temps');
  assert.equal(etatDuTemps(delai + MARGE_TEMPS, delai), 'temps');
  assert.equal(etatDuTemps(delai + MARGE_TEMPS - 1, delai), 'moment');
  assert.equal(etatDuTemps(delai, delai), 'moment');
  assert.equal(etatDuTemps(delai - 1, delai), 'maintenant');
  assert.equal(etatDuTemps(12, delai), 'maintenant');
  assert.equal(etatDuTemps(12, null), null);
});

test('chaque état du temps dans un plan : le délai max vient de l’alerte la plus longue', () => {
  // Trois alertes : délai max = 36 mois (A1 et A3).
  assert.equal(plan(TROIS_ALERTES, { horizon: '5ans' }).etat, 'temps');
  assert.equal(plan(TROIS_ALERTES, { horizon: '3ans' }).etat, 'moment');
  assert.equal(plan(TROIS_ALERTES, { horizon: '1an' }).etat, 'maintenant');
  assert.equal(plan(TROIS_ALERTES).delaiMax, Math.max(...Object.values(ALERTES).map((a) => a.delai.max)));
  // Une seule alerte à 24 mois : 3 ans laisse de la marge.
  const relais: Reponses = { ...toutes(2), dep4: 0, dep5: 0 };
  assert.equal(plan(relais).delaiMax, ALERTES['aucun-relais'].delai.max);
  assert.equal(plan(relais).etat, 'temps');
});

test('aucune alerte : pas d’état, seul le temps restant, pas de mode accéléré', () => {
  const p = plan({ ...toutes(1), cli1: 2, dep4: 2, fin3: 2 }, { horizon: '1an' });
  assert.equal(p.delaiMax, null);
  assert.equal(p.etat, null);
  assert.equal(p.accelere, false);
  assert.equal(p.moisRestants, 12);
});

test('horizon inconnu : hypothèse de 3 ans, affichée comme telle', () => {
  const p = plan(TROIS_ALERTES, { horizon: 'inconnu' });
  assert.equal(p.hypothese, true);
  assert.equal(p.moisRestants, 36);
  assert.equal(plan(TROIS_ALERTES, { horizon: '3ans' }).hypothese, false);
});

/* ---------- Sélection ---------- */

test('les trois premières actions du plan sont celles du résultat, dans le même ordre', () => {
  for (const [reponses, ctx] of [
    [toutes(0), {}],
    [TROIS_ALERTES, {}],
    [toutes(0), { effectif: 'Moi seul' }],
    [{ ...toutes(1), cli1: 0 }, { secteur: 'Services aux entreprises' }],
  ] as const) {
    const r = calculerResultat(reponses, ctx);
    const p = plan(reponses, {}, ctx);
    const gratuites = p.actions.filter((a) => a.gratuite);
    assert.equal(gratuites.length, r.actions.length);
    assert.deepEqual(
      gratuites.map((a) => [a.id, a.titre, a.detail]),
      r.actions.map((a) => [a.questionId, a.titre, a.detail]),
    );
    assert.deepEqual(gratuites.map((a) => a.rang), r.actions.map((_, i) => i + 1));
  }
});

test('toutes les réponses au maximum : aucune action, aucune alerte, plan vide', () => {
  const p = plan(toutes(2));
  assert.equal(p.actions.length, 0);
  assert.equal(p.auDela.length, 0);
  assert.equal(p.trimestres.length, TRIMESTRES);
});

test('une question au maximum n’appelle pas d’action ; les autres oui, sans doublon', () => {
  const r: Reponses = { ...toutes(0), proc3: 2, jur4: 2 };
  const ids = selectionnerActions(r).map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes('proc3') && !ids.includes('jur4'));
  assert.equal(ids.length, QUESTIONS.length - 2);
});

test('trois alertes : leurs actions sont en tête, avec le texte et le délai de l’alerte', () => {
  const p = plan(TROIS_ALERTES);
  const alertes = calculerResultat(TROIS_ALERTES).alertes.filter(estBloquante);
  const idsAlertes = alertes.map((a) => a.action.questionId);
  assert.equal(alertes.length, 3);
  // Les trois actions des alertes ouvrent le plan, dans l'ordre du résultat (dépendance d'abord, puis délai décroissant).
  assert.deepEqual(p.actions.slice(0, 3).map((a) => a.id).sort(), [...idsAlertes].sort());
  assert.deepEqual(p.actions.slice(0, 3).map((a) => a.id), calculerResultat(TROIS_ALERTES).actions.map((a) => a.questionId));
  for (const al of alertes) {
    const a = p.actions.find((x) => x.id === al.action.questionId)!;
    assert.equal(a.origine, 'alerte');
    assert.equal(a.titre, al.action.titre);
    assert.equal(a.pourquoi, al.action.pourquoi);
    assert.ok(a.dureeMois >= al.delai.min, `${a.id} dure au moins le délai minimal`);
  }
});

test('dirigeant seul : les actions de délégation sont remplacées par de la documentation ou de la formalisation', () => {
  const ctx = { effectif: 'Moi seul' };
  const p = plan(toutes(0), {}, ctx);
  const r = calculerResultat(toutes(0), ctx);
  const gratuites = new Set(r.actions.map((a) => a.questionId));
  for (const a of p.actions) {
    if (gratuites.has(a.id)) continue;
    assert.ok(CATALOGUE_PAR_ID.get(a.id)!.sansSalarie, `${a.id} suppose des salariés`);
  }
  // Les remplacements (ex. dep5 → dep3) sont bien présents, une seule fois.
  assert.ok(p.actions.some((a) => a.id === 'dep3'));
  assert.equal(p.actions.filter((a) => a.id === 'dep3').length, 1);
  assert.ok(p.actions.some((a) => a.origine === 'remplacement'));
});

/* ---------- Séquencement ---------- */

function verifierContraintes(p: Plan) {
  for (const t of p.trimestres) {
    assert.ok(t.commencent.length <= DEBUTS_PAR_TRIMESTRE, `T${t.numero} : ${t.commencent.length} débuts`);
    assert.ok(t.enCours.length <= EN_COURS_MAX, `T${t.numero} : ${t.enCours.length} en cours`);
  }
  for (const a of p.actions) {
    if (a.trimestreDebut === null) continue;
    assert.equal(a.trimestreFin, a.trimestreDebut + dureeEnTrimestres(a.dureeMois) - 1);
    if (a.gratuite) continue;
    for (const pre of a.prerequis) {
      const pr = p.actions.find((x) => x.id === pre)!;
      assert.ok(pr.faite || (pr.trimestreFin !== null && pr.trimestreFin < a.trimestreDebut), `${a.id} avant son prérequis ${pre}`);
    }
  }
  const placees = p.actions.filter((a) => a.trimestreDebut !== null).map((a) => a.id);
  assert.deepEqual([...placees, ...p.auDela].sort(), p.actions.filter((a) => !a.faite).map((a) => a.id).sort());
}

test('séquencement : 1 à 2 débuts par trimestre, jamais plus de 3 en cours, prérequis respectés', () => {
  for (const [r, ctx] of [
    [toutes(0), {}],
    [toutes(1), {}],
    [TROIS_ALERTES, {}],
    [toutes(0), { effectif: 'Moi seul' }],
    [{ ...toutes(2), proc2: 0, proc1: 0, team3: 0, team4: 0 }, {}],
  ] as const) {
    verifierContraintes(plan(r, {}, ctx));
    verifierContraintes(plan(r, { horizon: '1an' }, ctx));
  }
});

test('les trois actions du résultat commencent dès le premier trimestre quand elles tiennent en même temps', () => {
  const p = plan(TROIS_ALERTES);
  const t1 = p.trimestres[0];
  assert.equal(t1.commencent.length, 2); // 1 à 2 par trimestre
  assert.deepEqual(t1.commencent, p.actions.slice(0, 2).map((a) => a.id));
  assert.equal(p.actions[2].trimestreDebut, 2);
});

test('un prérequis force l’attente : proc2 commence après la fin de proc1', () => {
  const r: Reponses = { ...toutes(2), proc1: 0, proc2: 0 };
  const p = plan(r);
  const proc1 = p.actions.find((a) => a.id === 'proc1')!;
  const proc2 = p.actions.find((a) => a.id === 'proc2')!;
  assert.deepEqual(proc2.prerequis, ['proc1']);
  // proc2 fait partie des trois actions du résultat ici : le prérequis ne la retient pas.
  if (!proc2.gratuite) assert.ok(proc2.trimestreDebut! > proc1.trimestreFin!);
  // Hors gratuité : proc2 attend proc1.
  const p2 = plan({ ...toutes(0), proc1: 1, proc2: 0 });
  const a1 = p2.actions.find((a) => a.id === 'proc1')!;
  const a2 = p2.actions.find((a) => a.id === 'proc2')!;
  if (!a2.gratuite && a2.trimestreDebut !== null) assert.ok(a2.trimestreDebut > a1.trimestreFin!);
});

test('tout au minimum : les 26 actions ne tiennent pas en 12 trimestres, le surplus est listé « au-delà »', () => {
  const p = plan(toutes(0));
  assert.equal(p.actions.length, QUESTIONS.length);
  assert.ok(p.auDela.length > 0);
  assert.equal(p.actions.filter((a) => a.trimestreDebut !== null).length + p.auDela.length, QUESTIONS.length);
});

test('horizon 1 an avec alertes longues : mode accéléré, les actions les plus courtes d’abord après les trois gratuites', () => {
  const p = plan(toutes(0), { horizon: '1an' });
  assert.equal(p.accelere, true);
  assert.equal(p.etat, 'maintenant');
  const reste = p.actions.filter((a) => !a.gratuite).map((a) => a.dureeMois);
  for (let i = 1; i < reste.length; i++) assert.ok(reste[i] >= reste[i - 1], 'durées croissantes');
  // Sans mode accéléré, l'ordre suit les alertes, la dépendance puis les axes faibles : pas les durées.
  const normal = plan(toutes(0), { horizon: '5ans' });
  assert.equal(normal.accelere, false);
  assert.notDeepEqual(normal.actions.map((a) => a.id), p.actions.map((a) => a.id));
});

/* ---------- Score refait, suivi ---------- */

test('score refait : actions faites conservées et non séquencées, actions disparues archivées, visibles', () => {
  const avant = plan(toutes(0));
  const faites = avant.actions.slice(0, 2).map((a) => a.id);
  // Nouveau score : deux questions passent au maximum, dont une action faite et une autre.
  const apres = genererPlan({ ...toutes(0), [faites[0]]: 2, jur4: 2 }, {}, {
    horizon: '3ans',
    choisiLe: T0,
    maintenant: T0 + 90 * JOUR,
    faites,
    actionsConnues: avant.actions.map((a) => a.id),
  });
  const encore = apres.actions.find((a) => a.id === faites[1])!;
  assert.equal(encore.faite, true);
  assert.equal(encore.trimestreDebut, null);
  assert.ok(!apres.trimestres.some((t) => t.enCours.includes(encore.id)));
  assert.deepEqual(apres.archivees.map((a) => a.id).sort(), [faites[0], 'jur4'].sort());
  assert.ok(apres.archivees.every((a) => a.titre.length > 0));
  assert.ok(!apres.actions.some((a) => a.id === 'jur4'));
});

test('ordre précédent : les actions déjà séquencées gardent leur ordre, les nouvelles s’ajoutent après', () => {
  const avant = plan({ ...toutes(2), dep4: 0, cli1: 1, fin1: 1, proc1: 1, jur1: 1, team2: 1, cli4: 1 });
  const ordre = avant.actions.map((a) => a.id);
  assert.ok(ordre.length > 3);
  const apres = plan({ ...toutes(0), dep4: 0 }, { ordrePrecedent: ordre });
  const gratuites = apres.actions.filter((a) => a.gratuite).map((a) => a.id);
  const reste = apres.actions.filter((a) => !a.gratuite).map((a) => a.id);
  const connues = reste.filter((id) => ordre.includes(id));
  assert.deepEqual(connues, ordre.filter((id) => connues.includes(id)));
  const nouvelles = reste.filter((id) => !ordre.includes(id));
  assert.equal(reste.length, connues.length + nouvelles.length);
  assert.ok(reste.indexOf(nouvelles[0]) > reste.indexOf(connues[connues.length - 1]));
  assert.equal(gratuites.length, 3);
});

test('pas de re-séquencement plus d’une fois par semaine', () => {
  assert.equal(peutResequencer(null, T0), true);
  assert.equal(peutResequencer(T0, T0 + DELAI_RESEQUENCEMENT_MS - 1), false);
  assert.equal(peutResequencer(T0, T0 + DELAI_RESEQUENCEMENT_MS), true);
});

/* ---------- Effet attendu ---------- */

test('effet attendu : passer une question de 0 à 2 points vaut sa part de l’axe, pondérée pour le global', () => {
  const r = toutes(0);
  assert.deepEqual(effetAttendu('cli1', r), { axe: 25, global: 4 }); // 2/8 de l'axe, poids 0,15
  assert.deepEqual(effetAttendu('dep1', r), { axe: 17, global: 4 }); // 2/12 de l'axe, poids 0,25
  assert.deepEqual(effetAttendu('cli1', { ...r, cli1: 1 }), { axe: 13, global: 2 });
  assert.deepEqual(effetAttendu('cli1', { ...r, cli1: 2 }), { axe: 0, global: 0 });
});

/* ---------- Gratuit / payant ---------- */

test('sans abonnement : aucune 4e action n’a de détail ni d’étapes ; les trois premières sont complètes', () => {
  const v = planVisible(plan(toutes(0)), false);
  assert.equal(v.complet, false);
  assert.ok(v.actions.length > 3);
  for (const a of v.actions) {
    if (a.gratuite) {
      assert.equal(a.verrouillee, false);
      assert.ok(a.detail && a.detail.length > 0);
      assert.ok(a.etapes.length >= 2);
    } else {
      assert.equal(a.verrouillee, true);
      assert.equal(a.detail, undefined);
      assert.equal(a.pourquoi, undefined);
      assert.equal(a.premiereEtape, undefined);
      assert.deepEqual(a.etapes, []);
      assert.ok(a.titre.length > 0 && a.trimestreDebut !== null || a.trimestreDebut === null);
    }
  }
  // Rien ne fuit dans la sérialisation envoyée au navigateur.
  const json = JSON.stringify(v);
  for (const e of CATALOGUE) {
    const a = v.actions.find((x) => x.id === e.id);
    if (a && a.verrouillee) for (const et of e.etapes) assert.ok(!json.includes(et.titre), `${e.id} : étape visible`);
  }
});

test('avec abonnement : toutes les actions sont ouvertes', () => {
  const v = planVisible(plan(toutes(0)), true);
  assert.equal(v.complet, true);
  assert.ok(v.actions.every((a) => !a.verrouillee && a.etapes.length >= 2));
});

/* ---------- Validation ---------- */

test('validation de la demande de plan', () => {
  const base = { contexte: { effectif: '3 à 9 salariés' }, reponses: toutes(1), horizon: '2ans', choisiLe: T0 };
  const ok = validerDemandePlan(base, T0);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.demande.horizon, '2ans');
    assert.deepEqual(ok.demande.faites, []);
  }
  assert.equal(validerDemandePlan({ ...base, horizon: 'demain' }, T0).ok, false);
  assert.equal(validerDemandePlan({ ...base, choisiLe: T0 + 3 * JOUR }, T0).ok, false);
  assert.equal(validerDemandePlan({ ...base, choisiLe: Date.UTC(2020, 0, 1) }, T0).ok, false);
  assert.equal(validerDemandePlan({ ...base, reponses: { dep1: 2 } }, T0).ok, false);
  assert.equal(validerDemandePlan({ ...base, faites: ['inconnue'] }, T0).ok, false);
  assert.equal(validerDemandePlan({ ...base, faites: ['dep1', 'dep1'] }, T0).ok, false);
  assert.equal(validerDemandePlan({ ...base, faites: ['dep1'], ordrePrecedent: ['cli1', 'dep1'] }, T0).ok, true);
  assert.deepEqual(validerIds(undefined), []);
  assert.equal(validerIds('dep1'), null);
});
