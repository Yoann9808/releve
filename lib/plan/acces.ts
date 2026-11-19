/**
 * Frontière gratuit / payant du plan (spec §2.4, Décision produit du 6 nov. 2026) : les trois premières
 * actions sont ouvertes ; le reste du plan n'est visible qu'en aperçu (titres et trimestres) tant que
 * l'abonnement n'est pas actif. Le filtrage se fait côté serveur, avant d'envoyer le plan au navigateur :
 * aucun détail d'une 4e action ne quitte le serveur sans abonnement (critère d'acceptation §4).
 */
import type { ActionPlan, Plan } from './engine.ts';

export type ActionVisible = Omit<ActionPlan, 'detail' | 'pourquoi' | 'premiereEtape' | 'etapes'> & {
  verrouillee: boolean;
  detail?: string;
  pourquoi?: string;
  premiereEtape?: string;
  etapes: ActionPlan['etapes'];
};

export type PlanVisible = Omit<Plan, 'actions'> & {
  /** Vrai quand l'abonnement est actif : toutes les actions sont ouvertes. */
  complet: boolean;
  actions: ActionVisible[];
};

/** Ne garde d'une action verrouillée que ce qui sert à l'aperçu : titre, axe, rang, trimestres, durée. */
export function verrouiller(a: ActionPlan): ActionVisible {
  const { detail: _d, pourquoi: _p, premiereEtape: _e, etapes: _s, ...reste } = a;
  return { ...reste, verrouillee: true, etapes: [] };
}

export function planVisible(plan: Plan, abonnementActif: boolean): PlanVisible {
  return {
    ...plan,
    complet: abonnementActif,
    actions: plan.actions.map((a) => (abonnementActif || a.gratuite ? { ...a, verrouillee: false } : verrouiller(a))),
  };
}
