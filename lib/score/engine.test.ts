import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXES, QUESTIONS } from './content.ts';
import {
  actionsRecommandees,
  alertes,
  calculerResultat,
  incoherenceDependance,
  indiceDependance,
  palierDecote,
  premiereActionDependance,
  scoreAxe,
  scoreGlobal,
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

test('3 actions, la première vient de la dépendance, les suivantes des axes les plus faibles', () => {
  const r: Reponses = { ...toutes(2), dep4: 0, cli1: 0, cli2: 0, jur4: 0 };
  const acts = actionsRecommandees(r);
  assert.equal(acts.length, 3);
  assert.equal(acts[0].questionId, 'dep4');
  assert.equal(acts[1].axe, 'cli'); // axe cli à 50, jur à 87 : cli d'abord
  assert.equal(acts[2].axe, 'jur');
  assert.equal(new Set(acts.map((a) => a.questionId)).size, 3, 'pas de doublon');
});

test('alertes à seuil', () => {
  const r: Reponses = { ...toutes(2), cli1: 0, dep5: 0, team1: 0, fin3: 0, dep6: 0 };
  const ids = alertes(r).map((a) => a.id);
  assert.deepEqual(ids, ['concentration-clients', 'pas-de-second', 'sous-investissement', 'contrats-personnels']);
  // pas-de-second exige dep5 ET team1 à 0
  assert.equal(alertes({ ...toutes(2), dep5: 0 }).length, 0);
});

test('hors cible : bandeau, mais le score se calcule quand même', () => {
  const r = calculerResultat(toutes(1), { effectif: 'Plus de 30 salariés' });
  assert.equal(r.horsCible, true);
  assert.equal(r.scoreGlobal, 50);
  assert.equal(calculerResultat(toutes(1), { effectif: '3 à 9 salariés', chiffre: '300 k€ à 1 M€' }).horsCible, false);
});

test('score global = somme pondérée des axes, arrondi', () => {
  const r: Reponses = { ...toutes(2), ...Object.fromEntries(QUESTIONS.filter((q) => q.axe === 'dep').map((q) => [q.id, 0])) };
  // dep = 0 (poids .25), le reste 100
  assert.equal(scoreGlobal(r), 75);
});
