/**
 * Horizon du dirigeant et temps restant (spec « Transformer mon score en plan d'actions à 3 ans », §2.1 et §2.2).
 * Fonctions pures, sans dépendance au navigateur. Testées dans plan.test.ts.
 *
 * La question posée est « À quel horizon voulez-vous que l'entreprise tourne sans vous ? ».
 * « Je ne sais pas encore » vaut 3 ans, affiché comme une hypothèse modifiable (spec §3).
 */

export const HORIZONS = ['1an', '2ans', '3ans', '5ans', 'inconnu'] as const;
export type Horizon = (typeof HORIZONS)[number];

export const HORIZON_PAR_DEFAUT: Horizon = '3ans';

/** Durée de chaque horizon en mois. L'horizon inconnu prend l'hypothèse de 3 ans. */
export const MOIS_PAR_HORIZON: Readonly<Record<Horizon, number>> = {
  '1an': 12,
  '2ans': 24,
  '3ans': 36,
  '5ans': 60,
  inconnu: 36,
};

export const LIBELLES_HORIZON: Readonly<Record<Horizon, string>> = {
  '1an': 'Dans 1 an',
  '2ans': 'Dans 2 ans',
  '3ans': 'Dans 3 ans',
  '5ans': 'Dans 5 ans ou plus',
  inconnu: 'Je ne sais pas encore',
};

/** Titre de l'écran du plan, repris de l'horizon choisi (« je ne sais pas encore » : l'hypothèse de 3 ans). */
export const TITRES_PLAN: Readonly<Record<Horizon, string>> = {
  '1an': 'Un an pour que l’entreprise tourne sans vous.',
  '2ans': 'Deux ans pour que l’entreprise tourne sans vous.',
  '3ans': 'Trois ans pour que l’entreprise tourne sans vous.',
  '5ans': 'Cinq ans pour que l’entreprise tourne sans vous.',
  inconnu: 'Trois ans pour que l’entreprise tourne sans vous.',
};

export function titreDuPlan(h: Horizon): string {
  return TITRES_PLAN[h];
}

export function estHorizon(v: unknown): v is Horizon {
  return typeof v === 'string' && (HORIZONS as readonly string[]).includes(v);
}

/** Vrai quand l'horizon est une hypothèse (« je ne sais pas encore ») et non un choix du dirigeant. */
export function estHypothese(h: Horizon): boolean {
  return h === 'inconnu';
}

const MOIS_EN_MS = (365.25 / 12) * 24 * 60 * 60 * 1000;

/**
 * Mois restants avant l'horizon, compté depuis la date du choix : un horizon « dans 2 ans »
 * choisi il y a six mois laisse 18 mois. Jamais négatif, arrondi au mois.
 */
export function moisRestants(horizon: Horizon, choisiLe: number, maintenant: number): number {
  const ecoules = Math.max(0, (maintenant - choisiLe) / MOIS_EN_MS);
  return Math.max(0, Math.round(MOIS_PAR_HORIZON[horizon] - ecoules));
}

/** Marge, en mois, au-delà du délai le plus long pour dire « vous avez le temps » (spec §2.2). */
export const MARGE_TEMPS = 6;

export type EtatDuTemps = 'temps' | 'moment' | 'maintenant';

/**
 * État du temps restant face au délai le plus long parmi les alertes actives (spec §2.2) :
 * - « vous avez le temps » : horizon ≥ délai max + 6 mois ;
 * - « c'est le moment » : horizon entre le délai max et le délai max + 6 mois ;
 * - « il faut démarrer maintenant » : horizon < délai max.
 * Sans alerte active (`delaiMax` null), aucun état : seul le temps restant s'affiche (§4).
 */
export function etatDuTemps(mois: number, delaiMax: number | null): EtatDuTemps | null {
  if (delaiMax === null) return null;
  if (mois >= delaiMax + MARGE_TEMPS) return 'temps';
  if (mois >= delaiMax) return 'moment';
  return 'maintenant';
}

/** Textes de l'état, factuels, jamais alarmistes (spec §2.2). */
export const TEXTES_ETAT: Readonly<Record<EtatDuTemps, { titre: string; phrase: string }>> = {
  temps: {
    titre: 'Vous avez le temps',
    phrase: 'Le point le plus long à corriger tient dans votre horizon, avec de la marge.',
  },
  moment: {
    titre: 'C’est le moment',
    phrase: 'Le point le plus long à corriger tient tout juste dans votre horizon : commencer ce trimestre le met à l’abri.',
  },
  maintenant: {
    titre: 'Il faut démarrer maintenant',
    phrase: 'Le point le plus long à corriger dépasse votre horizon. Les actions les plus courtes passent en premier.',
  },
};

/** Ligne honnête du mode accéléré (spec §3), sans renvoi vers un autre module. */
export const PHRASE_ACCELERE =
  'Tous les points ne seront pas corrigés dans ce délai ; parlez-en à votre expert-comptable.';
