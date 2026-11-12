/**
 * Session courante, côté serveur uniquement (pages, actions serveur). Lit et écrit le cookie signé.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_SESSION, DUREE_SESSION_S, cleSession, lireSession, signerSession, type Session } from './session.ts';

const maintenant = () => Math.floor(Date.now() / 1000);

export async function sessionCourante(): Promise<Session | null> {
  const c = await cookies();
  try {
    return lireSession(c.get(COOKIE_SESSION)?.value, cleSession(process.env), maintenant());
  } catch {
    return null;
  }
}

/** Pour les pages de l'espace : renvoie vers /connexion sans session valide. */
export async function exigerSession(): Promise<Session> {
  const s = await sessionCourante();
  if (!s) redirect('/connexion');
  return s;
}

/** À appeler depuis une action serveur. */
export async function ouvrirSession(uid: string, email: string): Promise<void> {
  const c = await cookies();
  const valeur = signerSession({ uid, email, exp: maintenant() + DUREE_SESSION_S }, cleSession(process.env));
  c.set(COOKIE_SESSION, valeur, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_SESSION_S,
  });
}

export async function fermerSession(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_SESSION);
}
