/**
 * Validation de la demande « Garder ce résultat et le recevoir par e-mail ».
 * Fonctions pures : le serveur ne fait confiance à rien de ce qu'envoie le navigateur.
 * Le score n'est jamais lu depuis la demande : il est recalculé à partir des réponses.
 */
import { CONTEXTE, QUESTIONS } from '../score/content.ts';
import type { Contexte, Reponse, Reponses } from '../score/engine.ts';

export type Demande = {
  email: string;
  contexte: Contexte;
  reponses: Reponses;
};

export type Validation = { ok: true; demande: Demande } | { ok: false; erreur: string };

/** Volontairement simple : une arobase, un domaine avec un point, pas d'espace. */
const FORME_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliserEmail(brut: unknown): string | null {
  if (typeof brut !== 'string') return null;
  const e = brut.trim().toLowerCase();
  if (e.length < 6 || e.length > 254 || !FORME_EMAIL.test(e)) return null;
  return e;
}

function choix<T extends readonly string[]>(valeur: unknown, liste: T): T[number] | undefined | null {
  if (valeur === undefined || valeur === null || valeur === '') return undefined;
  return typeof valeur === 'string' && (liste as readonly string[]).includes(valeur) ? valeur : null;
}

export function validerContexte(brut: unknown): Contexte | null {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return null;
  const b = brut as Record<string, unknown>;
  const secteur = choix(b.secteur, CONTEXTE.secteurs);
  const effectif = choix(b.effectif, CONTEXTE.effectifs);
  const chiffre = choix(b.chiffre, CONTEXTE.chiffres);
  if (secteur === null || effectif === null || chiffre === null) return null;
  const ctx: Contexte = {};
  if (secteur) ctx.secteur = secteur;
  if (effectif) ctx.effectif = effectif;
  if (chiffre) ctx.chiffre = chiffre;
  if (typeof b.coDirigeants === 'boolean') ctx.coDirigeants = b.coDirigeants;
  return ctx;
}

const IDS = new Set(QUESTIONS.map((q) => q.id));

/** Toutes les questions doivent avoir une réponse (0, 1, 2 ou « je ne sais pas ») ; rien d'autre. */
export function validerReponses(brut: unknown): Reponses | null {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return null;
  const b = brut as Record<string, unknown>;
  const out: Record<string, Reponse> = {};
  for (const [id, v] of Object.entries(b)) {
    if (!IDS.has(id)) return null;
    if (v !== 0 && v !== 1 && v !== 2 && v !== 'nsp') return null;
    out[id] = v;
  }
  if (Object.keys(out).length !== IDS.size) return null;
  return out;
}

export function validerDemande(brut: unknown): Validation {
  if (typeof brut !== 'object' || brut === null) return { ok: false, erreur: 'Demande illisible.' };
  const b = brut as Record<string, unknown>;
  const email = normaliserEmail(b.email);
  if (!email) return { ok: false, erreur: 'Cette adresse e-mail ne semble pas valide.' };
  const contexte = validerContexte(b.contexte);
  if (!contexte) return { ok: false, erreur: 'Les repères sur votre entreprise sont incomplets.' };
  const reponses = validerReponses(b.reponses);
  if (!reponses) return { ok: false, erreur: 'Les réponses au questionnaire sont incomplètes.' };
  return { ok: true, demande: { email, contexte, reponses } };
}
