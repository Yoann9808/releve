/**
 * Validation de la demande de plan (POST /api/plan). Fonctions pures : le serveur ne fait confiance
 * à rien de ce qu'envoie le navigateur et recalcule tout à partir des réponses.
 */
import { validerContexte, validerReponses } from '../resultat/validation.ts';
import type { Contexte, Reponses } from '../score/engine.ts';
import { CATALOGUE_PAR_ID } from './catalogue.ts';
import { estHorizon, type Horizon } from './horizon.ts';

export type DemandePlan = {
  contexte: Contexte;
  reponses: Reponses;
  horizon: Horizon;
  choisiLe: number;
  faites: string[];
  ordrePrecedent: string[];
  actionsConnues: string[];
};

export type ValidationPlan = { ok: true; demande: DemandePlan } | { ok: false; erreur: string };

/** Le 1er janvier 2026 : aucun horizon n'a pu être choisi avant l'existence du produit. */
const DATE_MIN = Date.UTC(2026, 0, 1);
const UN_JOUR = 24 * 60 * 60 * 1000;

/** Liste facultative d'identifiants d'actions du catalogue, sans doublon ; absente → vide. */
export function validerIds(brut: unknown): string[] | null {
  if (brut === undefined || brut === null) return [];
  if (!Array.isArray(brut) || brut.length > CATALOGUE_PAR_ID.size) return null;
  const out: string[] = [];
  for (const v of brut) {
    if (typeof v !== 'string' || !CATALOGUE_PAR_ID.has(v) || out.includes(v)) return null;
    out.push(v);
  }
  return out;
}

export function validerDemandePlan(brut: unknown, maintenant: number): ValidationPlan {
  if (typeof brut !== 'object' || brut === null) return { ok: false, erreur: 'Demande illisible.' };
  const b = brut as Record<string, unknown>;
  const contexte = validerContexte(b.contexte);
  if (!contexte) return { ok: false, erreur: 'Les repères sur votre entreprise sont incomplets.' };
  const reponses = validerReponses(b.reponses);
  if (!reponses) return { ok: false, erreur: 'Les réponses au questionnaire sont incomplètes.' };
  if (!estHorizon(b.horizon)) return { ok: false, erreur: 'L’horizon choisi n’est pas reconnu.' };
  const choisiLe = b.choisiLe;
  if (typeof choisiLe !== 'number' || !Number.isFinite(choisiLe) || choisiLe < DATE_MIN || choisiLe > maintenant + UN_JOUR)
    return { ok: false, erreur: 'La date de l’horizon n’est pas valide.' };
  const faites = validerIds(b.faites);
  const ordrePrecedent = validerIds(b.ordrePrecedent);
  const actionsConnues = validerIds(b.actionsConnues);
  if (!faites || !ordrePrecedent || !actionsConnues) return { ok: false, erreur: 'Le suivi du plan est illisible.' };
  return { ok: true, demande: { contexte, reponses, horizon: b.horizon, choisiLe, faites, ordrePrecedent, actionsConnues } };
}
