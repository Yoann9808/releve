/**
 * Session du dirigeant : un cookie signé (HMAC-SHA256), sans base de sessions.
 * Contient l'identifiant du compte Supabase Auth, l'adresse et une date d'expiration.
 * Fonctions pures, testées dans compte.test.ts.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_SESSION = 'releve_session';
export const DUREE_SESSION_S = 30 * 24 * 3600; // 30 jours

export type Session = { uid: string; email: string; exp: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signature(donnees: string, cle: string): string {
  return createHmac('sha256', cle).update(donnees).digest('base64url');
}

/**
 * Clé de signature : SESSION_SECRET si elle existe, sinon dérivée de la clé secrète Supabase
 * (aucune variable de plus à poser). Changer la clé Supabase déconnecte tout le monde : acceptable.
 */
export function cleSession(env: Record<string, string | undefined>): string {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 32) return env.SESSION_SECRET;
  if (!env.SUPABASE_SECRET_KEY) throw new Error("Variable d'environnement manquante : SUPABASE_SECRET_KEY");
  return createHmac('sha256', env.SUPABASE_SECRET_KEY).update('releve-session-v1').digest('base64url');
}

export function signerSession(s: Session, cle: string): string {
  const donnees = Buffer.from(JSON.stringify(s)).toString('base64url');
  return `${donnees}.${signature(donnees, cle)}`;
}

/** Renvoie la session si le cookie est intact, bien formé et non expiré ; sinon null. */
export function lireSession(cookie: string | undefined, cle: string, maintenantS: number): Session | null {
  if (!cookie || cookie.length > 1024) return null;
  const [donnees, sig, reste] = cookie.split('.');
  if (!donnees || !sig || reste !== undefined) return null;
  const attendue = Buffer.from(signature(donnees, cle));
  const recue = Buffer.from(sig);
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null;
  try {
    const s = JSON.parse(Buffer.from(donnees, 'base64url').toString('utf8')) as Partial<Session>;
    if (typeof s.uid !== 'string' || !UUID.test(s.uid)) return null;
    if (typeof s.email !== 'string' || typeof s.exp !== 'number') return null;
    if (s.exp <= maintenantS) return null;
    return { uid: s.uid, email: s.email, exp: s.exp };
  } catch {
    return null;
  }
}
