/**
 * Sauvegarde locale du questionnaire (spec 2.3) : navigateur uniquement, 30 jours,
 * aucun envoi serveur. Tout est enveloppé dans try/catch : en navigation privée ou
 * stockage bloqué, le parcours fonctionne en mémoire.
 */
import type { Contexte, Reponses } from './engine.ts';

const CLE = 'releve.score.v1';
const TRENTE_JOURS = 30 * 24 * 60 * 60 * 1000;

export type Brouillon = {
  version: 1;
  modifieLe: number;
  etape: number;
  contexte: Contexte;
  reponses: Reponses;
};

export function lireBrouillon(): Brouillon | null {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return null;
    const b = JSON.parse(brut) as Brouillon;
    if (b.version !== 1 || Date.now() - b.modifieLe > TRENTE_JOURS) {
      window.localStorage.removeItem(CLE);
      return null;
    }
    return b;
  } catch {
    return null;
  }
}

export function ecrireBrouillon(b: Omit<Brouillon, 'version' | 'modifieLe'>): boolean {
  try {
    window.localStorage.setItem(CLE, JSON.stringify({ ...b, version: 1, modifieLe: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function effacerBrouillon(): void {
  try {
    window.localStorage.removeItem(CLE);
  } catch {
    // rien
  }
}

export function stockageDisponible(): boolean {
  try {
    const t = '__releve_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
}
