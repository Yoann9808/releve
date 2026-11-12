/**
 * Lien magique de l'e-mail : /connexion/valider?th=<hashed_token>&type=<type>.
 * Le jeton est créé par Supabase Auth (admin/generate_link) ; on l'envoie nous-mêmes par Resend.
 * Fonctions pures, testées dans compte.test.ts.
 */
export const TYPES_LIEN = ['magiclink', 'signup'] as const;
export type TypeLien = (typeof TYPES_LIEN)[number];

const FORME_JETON = /^[A-Za-z0-9_-]{20,200}$/;

export function lienConnexion(base: string, jeton: string, type: TypeLien): string {
  const p = new URLSearchParams({ th: jeton, type });
  return `${base.replace(/\/+$/, '')}/connexion/valider?${p.toString()}`;
}

/** Filtre les paramètres avant tout appel à Supabase. */
export function parametresConnexion(th: unknown, type: unknown): { jeton: string; type: TypeLien } | null {
  if (typeof th !== 'string' || !FORME_JETON.test(th)) return null;
  if (typeof type !== 'string' || !(TYPES_LIEN as readonly string[]).includes(type)) return null;
  return { jeton: th, type: type as TypeLien };
}
