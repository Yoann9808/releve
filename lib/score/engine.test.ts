import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALERTES, AXES, QUESTIONS } from './content.ts';
import {
  actionsRecommandees,
  alertes,
  alertesBloquantes,
  calculerResultat,
  comparerAuHorizon,
  estSecteurServices,
  incoherenceAlertes,
  incoherenceDependance,
  indiceDependance,
  palierDecote,
  premiereActionDependance,
  scoreAxe,
  scoreGlobal,
  seuilAucunRelais,
  seuilConcentrationClients,
  seuilOutilVieilli,
  type Reponse,
  type Reponses,
} from './engine.ts';

const toutes = (r: Reponse): Reponses => Object.fromEntries(QUESTIONS.map((q) => [q.id, r]));

test('le questionnaire a 26 questions : 6 en dépendance, 4 par autre axe', () => {
  assert.equal(QUESTIONS.length, 26);
  assert.equal(QUESTIONS.filter((q) => q.axe === 'dep').length, 6);
  for (const a of AXES.filter((a) => a.id !== 'dep'))
    assert.equal(QUESTIONS.filter((q) => q.axe === a.id).length, 4, a.id);
  assert.ok(Math.abs(AXES.reduce((t, a) => t + a.poids, 0) - 1) < 1e-9, 'poids = 1');
});

test('toutes les réponses au maximum : score 100, indice 0, aucune action ni alerte', () => {
  const r = calculerResultat(toutes(2));
  assert.equal(r.scoreGlobal, 100);
  assert.equal(r.libelleGlobal, 'transmissible');
  assert.equal(r.dependance.indice, 0);
  assert.equal(r.dependance.decote.niveau, 'faible');
  assert.equal(r.actions.length, 0);
  assert.equal(r.alertes.length, 0);
});

test('toutes les réponses au minimum : score 0, indice 100, décote très forte', () => {
  const r = calculerResultat(toutes(0));
  assert.equal(r.scoreGlobal, 0);
  assert.equal(r.libelleGlobal, 'fragile');
  assert.equal(r.dependance.indice, 100);
  assert.equal(r.dependance.decote.fourchette, '25 à 30 % et plus');
  assert.equal(r.actions.length, 3);
});

test('« je ne sais pas » vaut 0 point et apparaît dans les points à éclaircir', () => {
  const r = calculerResultat({ ...toutes(2), dep1: 'nsp', fin2: 'nsp' });
  assert.equal(scoreAxe('dep', { ...toutes(2), dep1: 'nsp' }), Math.round((10 / 12) * 100));
  assert.equal(r.pointsAEclaircir.length, 2);
});

test('une réponse absente vaut 0 point', () => {
  const partiel: Reponses = { dep1: 2 };
  assert.equal(scoreAxe('dep', partiel), Math.round((2 / 12) * 100));
});

test('indice de dépendance = 100 − autonomie (spec 2.2)', () => {
  const r = { ...toutes(2), dep1: 0, dep2: 1, dep3: 1, dep4: 2, dep5: 0, dep6: 2 }; // 6/12
  assert.equal(indiceDependance(r), 50);
});

test('paliers de décote aux frontières', () => {
  assert.equal(palierDecote(0).niveau, 'faible');
  assert.equal(palierDecote(25).niveau, 'faible');
  assert.equal(palierDecote(26).niveau, 'modérée');
  assert.equal(palierDecote(50).niveau, 'modérée');
  assert.equal(palierDecote(51).niveau, 'forte');
  assert.equal(palierDecote(75).niveau, 'forte');
  assert.equal(palierDecote(76).niveau, 'très forte');
  assert.equal(palierDecote(100).niveau, 'très forte');
});

test('première action de dépendance : ordre de priorité Q4, Q5, Q1, Q2, Q3, Q6', () => {
  // dep1 et dep4 à 0 : dep4 doit primer
  const a = premiereActionDependance({ ...toutes(2), dep1: 0, dep4: 0 });
  assert.equal(a?.questionId, 'dep4');
  // dep2 et dep6 à 0 : dep2 avant dep6
  const b = premiereActionDependance({ ...toutes(2), dep2: 0, dep6: 0 });
  assert.equal(b?.questionId, 'dep2');
  // à égalité de points (tous 1) on prend le premier de la liste de priorité
  const c = premiereActionDependance({ ...toutes(2), dep1: 1, dep5: 1 });
  assert.equal(c?.questionId, 'dep5');
});

test('dirigeant seul : première action orientée documentation (dep3)', () => {
  const a = premiereActionDependance(toutes(0), true);
  assert.equal(a?.questionId, 'dep3');
  const r = calculerResultat(toutes(0), { effectif: 'Moi seul' });
  assert.ok(r.dependance.phrase.includes('savoir-faire'));
  assert.equal(r.dirigeantSeul, true);
});

test('incohérence : activité continue sans moi mais je suis seul à tout connaître', () => {
  assert.equal(incoherenceDependance({ ...toutes(2), dep4: 2, dep1: 0, dep2: 0 }), true);
  assert.equal(incoherenceDependance({ ...toutes(2), dep4: 1, dep1: 0, dep2: 0 }), false);
  assert.equal(incoherenceDependance({ ...toutes(2), dep4: 2, dep1: 0 }), false);
});

test('3 actions sans alerte : la première vient de la dépendance, les suivantes des axes les plus faibles', () => {
  const r: Reponses = { ...toutes(2), dep4: 0, cli2: 0, cli3: 0, jur4: 0 };
  const acts = actionsRecommandees(r);
  assert.equal(acts.length, 3);
  assert.equal(acts[0].questionId, 'dep4');
  assert.equal(acts[1].axe, 'cli'); // axe cli à 50, jur à 87 : cli d'abord
  assert.equal(acts[2].axe, 'jur');
  assert.equal(new Set(acts.map((a) => a.questionId)).size, 3, 'pas de doublon');
});

/* ---------- Alertes à seuil (spec « Repérer les points qui bloqueront une reprise ») ---------- */

const avec = (r: Record<string, Reponse>, base: Reponse = 2): Reponses => ({ ...toutes(base), ...r });
const bloquantes = (r: Reponses, ctx = {}) => alertesBloquantes(r, ctx).map((a) => a.id);

test('A1 seule : 3 premiers clients > 40 % (cli1 = 0), délai 18 à 36 mois', () => {
  const r = avec({ cli1: 0 });
  assert.equal(seuilConcentrationClients(r), true);
  assert.deepEqual(bloquantes(r), ['concentration-clients']);
  const [a] = alertesBloquantes(r);
  assert.equal(a.titre, 'Trois clients font votre chiffre');
  assert.deepEqual(a.delai, { min: 18, max: 36 });
  assert.equal(a.delaiTexte, '18 à 36 mois');
  assert.equal(a.action.questionId, 'cli1');
  assert.ok(a.action.premiereEtape && a.action.pourquoi, 'quoi, pourquoi, combien de temps, première micro-étape');
  // 20 à 40 % et moins de 20 % ne déclenchent pas
  assert.equal(seuilConcentrationClients(avec({ cli1: 1 })), false);
  assert.equal(seuilConcentrationClients(avec({ cli1: 2 })), false);
});

test('A2 seule : Q4 « s’arrête » ou « au ralenti » ET Q5 « non » ou « pas encore formée », délai 12 à 24 mois', () => {
  for (const q4 of [0, 1] as const)
    for (const q5 of [0, 1] as const) assert.equal(seuilAucunRelais(avec({ dep4: q4, dep5: q5 })), true, `dep4=${q4} dep5=${q5}`);
  assert.equal(seuilAucunRelais(avec({ dep4: 0, dep5: 2 })), false, 'Q5 en situation : pas d’alerte');
  assert.equal(seuilAucunRelais(avec({ dep4: 2, dep5: 0 })), false, 'Q4 continue normalement : pas d’alerte');
  assert.equal(seuilAucunRelais(avec({ dep4: 'nsp', dep5: 0 })), false, '« je ne sais pas » ne déclenche pas');
  const r = avec({ dep4: 1, dep5: 0 });
  assert.deepEqual(bloquantes(r), ['aucun-relais']);
  const [a] = alertesBloquantes(r);
  assert.equal(a.titre, 'Personne ne peut tenir la barre sans vous');
  assert.deepEqual(a.delai, { min: 12, max: 24 });
  assert.equal(a.action.questionId, 'dep5', 'l’action porte la pire des deux questions');
  assert.equal(alertesBloquantes(avec({ dep4: 0, dep5: 0 }))[0].action.questionId, 'dep4', 'à égalité, Q4 d’abord');
});

test('A3 seule : dernier investissement il y a 3 ans ou plus (fin3 = 0 ou 1), délai 12 à 36 mois', () => {
  assert.equal(seuilOutilVieilli(avec({ fin3: 0 })), true);
  assert.equal(seuilOutilVieilli(avec({ fin3: 1 })), true);
  assert.equal(seuilOutilVieilli(avec({ fin3: 2 })), false);
  assert.equal(seuilOutilVieilli(avec({ fin3: 'nsp' })), false);
  const r = avec({ fin3: 1 });
  assert.deepEqual(bloquantes(r), ['outil-vieilli']);
  const [a] = alertesBloquantes(r);
  assert.equal(a.titre, 'L’outil de travail prend de l’âge');
  assert.deepEqual(a.delai, { min: 12, max: 36 });
  assert.equal(a.action.questionId, 'fin3');
});

test('les trois alertes, triées par délai décroissant : A1 (18-36), A3 (12-36), A2 (12-24)', () => {
  const r = avec({ cli1: 0, dep4: 0, dep5: 0, fin3: 0 });
  assert.deepEqual(bloquantes(r), ['concentration-clients', 'outil-vieilli', 'aucun-relais']);
  assert.deepEqual(
    alertes(r).map((a) => a.niveau),
    ['bloquant', 'bloquant', 'bloquant'],
  );
});

test('aucune alerte : liste vide, et rappel des deux axes les plus faibles', () => {
  const r = calculerResultat(avec({ jur1: 0, jur2: 0, proc1: 0 }));
  assert.equal(r.alertes.length, 0);
  assert.deepEqual(
    r.axesLesPlusFaibles.map((a) => a.id),
    ['jur', 'proc'],
  );
  assert.equal(r.axesLesPlusFaibles[0].score, 50);
});

test('« je ne sais pas » sur A1 ou A3 : point à éclaircir orange, pas d’alerte bloquante', () => {
  const r = alertes(avec({ cli1: 'nsp', fin3: 'nsp' }));
  assert.deepEqual(
    r.map((a) => [a.id, a.niveau]),
    [
      ['concentration-clients', 'a-eclaircir'],
      ['outil-vieilli', 'a-eclaircir'],
    ],
  );
  for (const a of r) {
    assert.equal(a.niveau, 'a-eclaircir');
    if (a.niveau === 'a-eclaircir') assert.match(a.question, /expert-comptable/);
  }
  assert.equal(alertesBloquantes(avec({ cli1: 'nsp' })).length, 0);
  // les points à éclaircir viennent après les bloquantes
  const mixte = alertes(avec({ cli1: 'nsp', fin3: 0 }));
  assert.deepEqual(
    mixte.map((a) => a.niveau),
    ['bloquant', 'a-eclaircir'],
  );
});

test('dirigeant seul : A2 reformulée « votre activité, c’est vous », action de documentation (dep3)', () => {
  const seul = { effectif: 'Moi seul' };
  const [a] = alertesBloquantes(avec({ dep4: 0, dep5: 0 }), seul);
  assert.equal(a.id, 'aucun-relais');
  assert.equal(a.titre, 'Votre activité, c’est vous');
  assert.equal(a.action.questionId, 'dep3');
  assert.match(a.action.titre, /[Dd]ocumenter/);
  // fusion avec la première action de dépendance (dep3 pour un dirigeant seul) : une seule action dep3
  const acts = actionsRecommandees({ ...toutes(0) }, seul);
  assert.equal(acts.filter((x) => x.questionId === 'dep3').length, 1);
  assert.equal(acts[0].questionId, 'dep3');
  assert.ok(acts[0].premiereEtape, 'c’est l’action de l’alerte qui l’emporte');
});

test('co-dirigeants : A2 évaluée hors vous et votre associé(e)', () => {
  const [a] = alertesBloquantes(avec({ dep4: 1, dep5: 1 }), { coDirigeants: true });
  assert.match(a.fait, /associé/);
  assert.equal(a.titre, 'Personne ne peut tenir la barre sans vous');
  const [b] = alertesBloquantes(avec({ dep4: 1, dep5: 1 }), { coDirigeants: false });
  assert.doesNotMatch(b.fait, /associé/);
});

test('activité de services : A3 porte sur les outils numériques, sans parler de machines', () => {
  const services = { secteur: 'Services aux entreprises' };
  assert.equal(estSecteurServices(services), true);
  assert.equal(estSecteurServices({ secteur: 'Bâtiment et travaux' }), false);
  const [a] = alertesBloquantes(avec({ fin3: 0 }), services);
  assert.match(a.fait, /logiciels/);
  assert.doesNotMatch(`${a.fait} ${a.pourquoi} ${a.action.titre} ${a.action.detail}`, /machine/i);
  assert.equal(a.delaiTexte, '12 à 36 mois', 'le seuil et le délai restent les mêmes');
  const q = QUESTIONS.find((x) => x.id === 'fin3')!;
  assert.ok(q.texteServices && !/machine|véhicule/i.test(q.texteServices));
});

test('réponses incohérentes : A2 active mais indice de dépendance faible', () => {
  // dep4 = 1, dep5 = 1, le reste à 2 : indice 17 (palier faible), A2 active
  const r = avec({ dep4: 1, dep5: 1 });
  assert.equal(seuilAucunRelais(r), true);
  assert.equal(incoherenceAlertes(r), true);
  assert.equal(calculerResultat(r).incoherenceAlertes, true);
  // A2 active avec un indice fort : cohérent
  assert.equal(incoherenceAlertes({ ...toutes(0) }), false);
  // A2 inactive : jamais incohérent
  assert.equal(incoherenceAlertes(avec({ dep4: 1 })), false);
});

test('hors cible : les alertes sont calculées quand même', () => {
  const r = calculerResultat(avec({ cli1: 0 }), { effectif: 'Plus de 30 salariés' });
  assert.equal(r.horsCible, true);
  assert.equal(r.alertes.length, 1);
});

test('composition des 3 actions gratuites (§2.4) : dépendance, puis alertes par délai décroissant, sans doublon', () => {
  // A2 active (dep4 = 0, dep5 = 1) : l’action dépendance est dep4 et fusionne avec l’action de A2
  const r: Reponses = avec({ dep4: 0, dep5: 1, cli1: 0, fin3: 0 });
  const acts = actionsRecommandees(r);
  assert.deepEqual(
    acts.map((a) => a.questionId),
    ['dep4', 'cli1', 'fin3'],
  );
  assert.ok(acts[0].premiereEtape, 'l’action fusionnée porte la micro-étape de l’alerte');
  assert.equal(acts[0].duree, '12 à 24 mois');
  assert.equal(new Set(acts.map((a) => a.questionId)).size, 3, 'pas de doublon');

  // l’action dépendance est dep1 (pire réponse), A2 ajoute la sienne, puis A1 : fin3 à 2 donc pas d’A3
  const r2: Reponses = avec({ dep1: 0, dep4: 1, dep5: 1, cli1: 0 });
  assert.deepEqual(
    actionsRecommandees(r2).map((a) => a.questionId),
    ['dep1', 'cli1', 'dep4'],
  );
  // trois alertes + action dépendance distincte : on garde trois actions, l’alerte au délai le plus court sort
  const r3: Reponses = avec({ dep1: 0, dep4: 1, dep5: 1, cli1: 0, fin3: 0 });
  assert.deepEqual(
    actionsRecommandees(r3).map((a) => a.questionId),
    ['dep1', 'cli1', 'fin3'],
  );
});

test('comparaison au temps restant (§2.3) : texte et marqueur « à lancer maintenant »', () => {
  const [a] = alertesBloquantes(avec({ cli1: 0 }));
  const h = comparerAuHorizon(a, 18);
  assert.equal(h.texte, 'Il vous reste environ 18 mois, ce point demande 18 à 36 mois.');
  assert.equal(h.aLancerMaintenant, true);
  assert.equal(comparerAuHorizon(a, 36).aLancerMaintenant, true);
  assert.equal(comparerAuHorizon(a, 48).aLancerMaintenant, false);
  assert.equal(comparerAuHorizon(a, -3).texte, 'Il vous reste environ 0 mois, ce point demande 18 à 36 mois.');
});

test('les délais sont en configuration, marqués en mois', () => {
  for (const d of Object.values(ALERTES)) {
    assert.ok(d.delai.min >= 12 && d.delai.max <= 36 && d.delai.min < d.delai.max, d.id);
    assert.ok(d.action.premiereEtape.length > 10, 'première micro-étape renseignée');
  }
});

test('hors cible : bandeau, mais le score se calcule quand même', () => {
  const r = calculerResultat(toutes(1), { effectif: 'Plus de 30 salariés' });
  assert.equal(r.horsCible, true);
  assert.equal(r.scoreGlobal, 50);
  assert.equal(calculerResultat(toutes(1), { effectif: '3 à 9 salariés', chiffre: '300 k€ à 1 M€' }).horsCible, false);
});

test('score global = somme pondérée des axes, arrondi', () => {
  const r: Reponses = avec({ ...Object.fromEntries(QUESTIONS.filter((q) => q.axe === 'dep').map((q) => [q.id, 0])) });
  // dep = 0 (poids .25), le reste 100
  assert.equal(scoreGlobal(r), 75);
});
