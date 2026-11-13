/**
 * Suivi local du plan : navigateur uniquement, comme le brouillon du score (lib/score/stockage.ts).
 * Tant que le plan n'est pas rattaché à un compte (étape B, lien magique), l'horizon, les actions
 * cochées et l'ordre du dernier séquencement vivent ici. Tout est enveloppé dans try/catch.
 */
import type { Contexte, Reponses } from '../score/engine.ts';
import type { Horizon } from './horizon.ts';

const CLE = 'releve.plan.v1';
const VERSION = 1;

export type SuiviPlan = {
  version: typeof VERSION;
  modifieLe: number;
  contexte: Contexte;
  reponses: Reponses;
  horizon: Horizon;
  /** Date (ms) du choix de l'horizon. */
  choisiLe: number;
  /** Actions marquées faites. */
  faites: string[];
  /** Micro-étapes cochées, par action : index des étapes. */
  coches: Record<string, number[]>;
  /** Ordre des actions au dernier séquencement, et date de ce séquencement. */
  ordre: string[];
  actionsConnues: string[];
  sequenceLe: number | null;
};

export function lireSuivi(): SuiviPlan | null {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return null;
    const s = JSON.parse(brut) as SuiviPlan;
    if (s.version !== VERSION || !s.horizon || !s.reponses) return null;
    return s;
  } catch {
    return null;
  }
}

export function ecrireSuivi(s: Omit<SuiviPlan, 'version' | 'modifieLe'>): boolean {
  try {
    window.localStorage.setItem(CLE, JSON.stringify({ ...s, version: VERSION, modifieLe: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function effacerSuivi(): void {
  try {
    window.localStorage.removeItem(CLE);
  } catch {
    // rien
  }
}

/** Nouveau suivi à partir d'un résultat et d'un horizon ; conserve les cases cochées d'un suivi précédent. */
export function suiviDepuis(
  contexte: Contexte,
  reponses: Reponses,
  horizon: Horizon,
  choisiLe: number,
  precedent: SuiviPlan | null,
): Omit<SuiviPlan, 'version' | 'modifieLe'> {
  return {
    contexte,
    reponses,
    horizon,
    choisiLe,
    faites: precedent?.faites ?? [],
    coches: precedent?.coches ?? {},
    ordre: precedent?.ordre ?? [],
    actionsConnues: precedent?.actionsConnues ?? [],
    sequenceLe: precedent?.sequenceLe ?? null,
  };
}

/** Vrai si les réponses de deux suivis sont identiques (le plan ne change alors pas). */
export function memesReponses(a: Reponses, b: Reponses): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}
