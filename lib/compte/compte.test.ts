import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleSession, lireSession, signerSession, DUREE_SESSION_S } from './session.ts';
import { lienConnexion, parametresConnexion } from './lien.ts';
import { DESTINATAIRE_MAX, idValide, validerDestinataire } from './partage.ts';
import { contenuEmailConnexion, NOTE_LIEN } from '../resultat/email.ts';

// Valeurs fictives, jamais de donnée réelle dans les tests.
const CLE = 'cle-de-test-0123456789-abcdefghijklmnop';
const UID = '6f1c2b9e-4a7d-4c3e-9b21-0d5e8f7a1b2c';
const EMAIL = 'dirigeant@exemple.test';
const T0 = 1_800_000_000;
const SESSION = { uid: UID, email: EMAIL, exp: T0 + DUREE_SESSION_S };

// --- Session ---

test('session : un cookie signé se relit à l’identique', () => {
  assert.deepEqual(lireSession(signerSession(SESSION, CLE), CLE, T0), SESSION);
});

test('session : refusée si expirée', () => {
  assert.equal(lireSession(signerSession(SESSION, CLE), CLE, SESSION.exp), null);
  assert.equal(lireSession(signerSession(SESSION, CLE), CLE, SESSION.exp + 1), null);
});

test('session : refusée avec une autre clé', () => {
  assert.equal(lireSession(signerSession(SESSION, CLE), `${CLE}-autre`, T0), null);
});

test('session : impossible de se faire passer pour un autre compte en modifiant le cookie', () => {
  const cookie = signerSession(SESSION, CLE);
  const [, sig] = cookie.split('.');
  const autre = Buffer.from(JSON.stringify({ ...SESSION, uid: '00000000-0000-4000-8000-000000000000' })).toString('base64url');
  assert.equal(lireSession(`${autre}.${sig}`, CLE, T0), null);
  const plusLongue = Buffer.from(JSON.stringify({ ...SESSION, exp: SESSION.exp + 10 ** 8 })).toString('base64url');
  assert.equal(lireSession(`${plusLongue}.${sig}`, CLE, T0), null);
});

test('session : cookies absents ou mal formés refusés sans erreur', () => {
  for (const c of [undefined, '', 'abc', 'a.b', 'a.b.c', '.', 'x'.repeat(2000)]) assert.equal(lireSession(c, CLE, T0), null, String(c));
});

test('session : contenu signé mais incomplet refusé (uid non conforme)', () => {
  assert.equal(lireSession(signerSession({ ...SESSION, uid: 'admin' }, CLE), CLE, T0), null);
});

test('session : clé dérivée de la clé Supabase, SESSION_SECRET prioritaire si assez longue', () => {
  const a = cleSession({ SUPABASE_SECRET_KEY: 'sb_secret_fictive' });
  assert.equal(a, cleSession({ SUPABASE_SECRET_KEY: 'sb_secret_fictive' }));
  assert.notEqual(a, 'sb_secret_fictive');
  assert.notEqual(a, cleSession({ SUPABASE_SECRET_KEY: 'sb_secret_autre' }));
  assert.equal(cleSession({ SESSION_SECRET: CLE, SUPABASE_SECRET_KEY: 'x' }), CLE);
  assert.equal(cleSession({ SESSION_SECRET: 'trop-courte', SUPABASE_SECRET_KEY: 'sb_secret_fictive' }), a);
  assert.throws(() => cleSession({}));
});

// --- Lien magique ---

const JETON = 'a3f9c0e1b2d4a3f9c0e1b2d4a3f9c0e1b2d4a3f9c0e1b2d4a3f9c0e1';

test('lien magique : adresse de validation, slash final retiré, paramètres encodés', () => {
  assert.equal(
    lienConnexion('https://releve.exemple.test/', JETON, 'signup'),
    `https://releve.exemple.test/connexion/valider?th=${JETON}&type=signup`,
  );
});

test('lien magique : paramètres relus et filtrés', () => {
  assert.deepEqual(parametresConnexion(JETON, 'magiclink'), { jeton: JETON, type: 'magiclink' });
  for (const [th, type] of [
    [JETON, 'recovery'],
    [JETON, undefined],
    ['court', 'magiclink'],
    [`${JETON}&type=x`, 'magiclink'],
    [null, 'signup'],
    ['x'.repeat(201), 'signup'],
  ])
    assert.equal(parametresConnexion(th, type), null, `${th} ${type}`);
});

test('e-mail de connexion : contient le lien et l’avertissement', () => {
  const lien = lienConnexion('https://releve.exemple.test', JETON, 'magiclink');
  const m = contenuEmailConnexion(lien);
  assert.equal(m.sujet, 'Votre lien de connexion à Relève');
  assert.ok(m.texte.includes(lien));
  assert.ok(m.texte.includes(NOTE_LIEN));
  assert.ok(m.html.includes(lien.replace(/&/g, '&amp;')));
  assert.equal(m.texte.includes('\\n'), false);
});

// --- Partage ---

test('partage : destinataire nettoyé (espaces) et borné', () => {
  assert.equal(validerDestinataire('  Mon   expert-comptable '), 'Mon expert-comptable');
  assert.equal(validerDestinataire('x'.repeat(DESTINATAIRE_MAX)), 'x'.repeat(DESTINATAIRE_MAX));
  for (const d of ['', '   ', 'x'.repeat(DESTINATAIRE_MAX + 1), '<script>', 'a\u0000b', 12, null]) assert.equal(validerDestinataire(d), null, String(d));
});

test('partage : identifiants de résultat et de lien au format UUID uniquement', () => {
  assert.ok(idValide(UID));
  for (const i of ['', '1', `${UID}x`, "' or 1=1 --", `${UID.slice(0, 35)}&user_id=neq.x`, undefined]) assert.equal(idValide(i), false, String(i));
});
