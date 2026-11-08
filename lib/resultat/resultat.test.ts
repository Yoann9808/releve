import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from '../score/content.ts';
import { calculerResultat, type Reponse, type Reponses } from '../score/engine.ts';
import { normaliserEmail, validerContexte, validerDemande, validerReponses } from './validation.ts';
import { nouveauToken, tokenBienForme } from './token.ts';
import { contenuEmail, echapper } from './email.ts';
import { urlDuSite } from './url.ts';

const toutes = (r: Reponse): Record<string, Reponse> => Object.fromEntries(QUESTIONS.map((q) => [q.id, r]));
const CTX = { secteur: 'Bâtiment et travaux', effectif: '3 à 9 salariés', chiffre: '300 k€ à 1 M€' };
// Adresse fictive, jamais de donnée réelle dans les tests.
const EMAIL = 'dirigeant@exemple.test';

// --- E-mail ---

test('e-mail : normalisé en minuscules, espaces retirés', () => {
  assert.equal(normaliserEmail('  Dirigeant@Exemple.TEST '), EMAIL);
});

test('e-mail : formes invalides refusées', () => {
  for (const e of ['', 'abc', 'a@b', 'a b@c.fr', '@exemple.test', 'x@.', 42, null, undefined, `${'a'.repeat(250)}@b.fr`])
    assert.equal(normaliserEmail(e), null, String(e));
});

// --- Contexte ---

test('contexte : valeurs de la liste acceptées, champs vides tolérés', () => {
  assert.deepEqual(validerContexte(CTX), CTX);
  assert.deepEqual(validerContexte({}), {});
});

test('contexte : valeur hors liste ou champ inconnu de type objet refusé', () => {
  assert.equal(validerContexte({ ...CTX, secteur: 'Pétrole' }), null);
  assert.equal(validerContexte({ ...CTX, effectif: 12 }), null);
  assert.equal(validerContexte(null), null);
  assert.equal(validerContexte([]), null);
});

test('contexte : les champs inconnus sont ignorés (jamais enregistrés)', () => {
  assert.deepEqual(validerContexte({ ...CTX, script: '<b>x</b>' }), CTX);
});

// --- Réponses ---

test('réponses : 26 réponses valides acceptées, y compris « je ne sais pas »', () => {
  const r = { ...toutes(1), dep1: 'nsp' as const };
  assert.deepEqual(validerReponses(r), r);
});

test('réponses : incomplètes, question inconnue ou valeur hors bornes refusées', () => {
  const { dep1: _omis, ...incompletes } = toutes(1);
  assert.equal(validerReponses(incompletes), null);
  assert.equal(validerReponses({ ...toutes(1), inconnue: 1 }), null);
  assert.equal(validerReponses({ ...toutes(1), dep1: 3 }), null);
  assert.equal(validerReponses({ ...toutes(1), dep1: '2' }), null);
  assert.equal(validerReponses('toutes'), null);
});

// --- Demande complète ---

test('demande : le score envoyé par le navigateur est ignoré, il est recalculé', () => {
  const v = validerDemande({ email: EMAIL, contexte: CTX, reponses: toutes(0), score: 100, resultat: { scoreGlobal: 100 } });
  assert.ok(v.ok);
  if (!v.ok) return;
  assert.equal('score' in v.demande, false);
  assert.equal('resultat' in v.demande, false);
  assert.equal(calculerResultat(v.demande.reponses, v.demande.contexte).scoreGlobal, 0);
});

test('demande : message d’erreur lisible pour chaque champ manquant', () => {
  assert.deepEqual(validerDemande({ contexte: CTX, reponses: toutes(1) }), {
    ok: false,
    erreur: 'Cette adresse e-mail ne semble pas valide.',
  });
  assert.equal(validerDemande({ email: EMAIL, contexte: 'x', reponses: toutes(1) }).ok, false);
  assert.equal(validerDemande({ email: EMAIL, contexte: CTX, reponses: {} }).ok, false);
  assert.equal(validerDemande(null).ok, false);
});

// --- Jeton ---

test('jeton : 43 caractères base64url, différent à chaque appel', () => {
  const vus = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const t = nouveauToken();
    assert.ok(tokenBienForme(t), t);
    vus.add(t);
  }
  assert.equal(vus.size, 200);
});

test('jeton : formes inattendues refusées avant toute requête', () => {
  for (const t of ['', 'abc', 'a'.repeat(42), 'a'.repeat(44), `${'a'.repeat(42)}*`, `${'a'.repeat(40)}%2e`, null, 12])
    assert.equal(tokenBienForme(t), false, String(t));
});

// --- Contenu de l'e-mail ---

const LIEN = 'https://releve.exemple.test/r/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

test('e-mail de résultat : score, décote, trois actions et lien', () => {
  const r = calculerResultat(toutes(0) as Reponses, CTX);
  const m = contenuEmail(r, LIEN);
  assert.equal(m.sujet, 'Votre résultat Relève : 0 / 100');
  for (const corps of [m.texte, m.html]) {
    assert.ok(corps.includes('0 / 100'));
    assert.ok(corps.includes(r.dependance.decote.fourchette), 'décote');
    assert.equal(r.actions.length, 3);
    for (const a of r.actions) assert.ok(corps.includes(echapper(a.titre)) || corps.includes(a.titre), a.titre);
    assert.ok(corps.includes(LIEN));
  }
});

test('e-mail de résultat : pas de décote si l’entreprise ne dépend pas de vous, ou dirigeant seul', () => {
  assert.equal(contenuEmail(calculerResultat(toutes(2) as Reponses, CTX), LIEN).texte.includes('Décote'), false);
  const seul = calculerResultat(toutes(0) as Reponses, { ...CTX, effectif: 'Moi seul' });
  assert.equal(contenuEmail(seul, LIEN).texte.includes('Décote'), false);
});

test('e-mail de résultat : le HTML est échappé', () => {
  assert.equal(echapper(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

// --- Adresse du lien /r/<token> ---

const LOCAL = 'http://localhost:3000';
const PROD = 'releve.vercel.app';
const BRANCHE = 'releve-git-feat-x.vercel.app';

test('lien : SITE_URL l’emporte toujours (slash final retiré)', () => {
  assert.equal(urlDuSite({ SITE_URL: 'https://releve.fr/', VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: BRANCHE }, LOCAL), 'https://releve.fr');
});

test('lien : en production, domaine de production', () => {
  assert.equal(urlDuSite({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: PROD, VERCEL_URL: 'x.vercel.app' }, LOCAL), `https://${PROD}`);
});

test('lien : sur une preview, l’adresse de la branche et jamais la production (bug du 8 nov. 2026)', () => {
  const env = { VERCEL_ENV: 'preview', VERCEL_PROJECT_PRODUCTION_URL: PROD, VERCEL_BRANCH_URL: BRANCHE, VERCEL_URL: 'x.vercel.app' };
  assert.equal(urlDuSite(env, LOCAL), `https://${BRANCHE}`);
  assert.equal(urlDuSite({ ...env, VERCEL_BRANCH_URL: undefined }, LOCAL), 'https://x.vercel.app');
});

test('lien : en local, l’adresse de la requête', () => {
  assert.equal(urlDuSite({}, LOCAL), LOCAL);
  assert.equal(urlDuSite({ VERCEL_ENV: 'development', VERCEL_PROJECT_PRODUCTION_URL: PROD }, `${LOCAL}/`), LOCAL);
});
