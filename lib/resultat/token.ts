/**
 * Jeton du lien /r/<token> : 32 octets aléatoires (256 bits), encodés en base64url (43 caractères).
 * Impossible à deviner ou à énumérer ; c'est la seule clé d'accès au résultat.
 */
import { randomBytes } from 'node:crypto';

const FORME = /^[A-Za-z0-9_-]{43}$/;

export function nouveauToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Filtre les jetons mal formés avant toute requête en base. */
export function tokenBienForme(t: unknown): t is string {
  return typeof t === 'string' && FORME.test(t);
}
