/**
 * Liens de partage d'un résultat (spec §2.6). Fonctions pures, testées dans compte.test.ts.
 */
export const DESTINATAIRE_MAX = 80;

/** « Pour qui est ce lien ? » : texte libre court, sans caractères de contrôle. */
export function validerDestinataire(brut: unknown): string | null {
  if (typeof brut !== 'string') return null;
  const d = brut.replace(/\s+/g, ' ').trim();
  if (d.length < 1 || d.length > DESTINATAIRE_MAX) return null;
  if (/[\u0000-\u001f\u007f<>]/.test(d)) return null;
  return d;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idValide(brut: unknown): brut is string {
  return typeof brut === 'string' && UUID.test(brut);
}
