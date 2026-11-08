/**
 * Moteur de score de transmissibilité. Fonctions pures, sans dépendance au navigateur.
 * Testé dans engine.test.ts (node --test).
 */
import {
  AXES,
  LIBELLES_DEPENDANCE,
  LIBELLES_SCORE,
  PALIERS_DECOTE,
  PRIORITE_DEPENDANCE,
  QUESTIONS,
  type AxeId,
  type Question,
} from './content.ts';

/** Réponse à une question : index d'option (0, 1, 2) ou 'nsp' (« je ne sais pas »). */
export type Reponse = 0 | 1 | 2 | 'nsp';
export type Reponses = Readonly<Record<string, Reponse | undefined>>;

export type Contexte = {
  secteur?: string;
  effectif?: string;
  chiffre?: string;
  coDirigeants?: boolean;
};

export type Action = {
  questionId: string;
  axe: AxeId;
  titre: string;
  duree: string;
  detail: string;
};

export type Alerte = {
  id: 'concentration-clients' | 'pas-de-second' | 'sous-investissement' | 'contrats-personnels';
  titre: string;
  explication: string;
  delai: string;
};

export type Resultat = {
  scoreGlobal: number;
  libelleGlobal: string;
  axes: { id: AxeId; nom: string; score: number }[];
  dependance: {
    indice: number;
    libelle: string;
    decote: { niveau: string; fourchette: string; pctMoyen: number };
    incoherence: boolean;
    phrase: string;
  };
  actions: Action[];
  alertes: Alerte[];
  pointsAEclaircir: string[];
  horsCible: boolean;
  dirigeantSeul: boolean;
};

/** Points d'autonomie d'une réponse (0-2). « Je ne sais pas » et absence valent 0. */
export function points(r: Reponse | undefined): 0 | 1 | 2 {
  return r === 1 || r === 2 ? r : 0;
}

export function questionsDeLAxe(axe: AxeId): Question[] {
  return QUESTIONS.filter((q) => q.axe === axe);
}

/** Score d'un axe sur 100 : somme des points / maximum possible. */
export function scoreAxe(axe: AxeId, reponses: Reponses): number {
  const qs = questionsDeLAxe(axe);
  const max = qs.length * 2;
  const total = qs.reduce((t, q) => t + points(reponses[q.id]), 0);
  return Math.round((total / max) * 100);
}

/** Indice de dépendance 0-100 (spec 2.2) : 100 − score d'autonomie de l'axe dep. */
export function indiceDependance(reponses: Reponses): number {
  return 100 - scoreAxe('dep', reponses);
}

export function scoreGlobal(reponses: Reponses): number {
  return Math.round(AXES.reduce((t, a) => t + scoreAxe(a.id, reponses) * a.poids, 0));
}

function libelleParSeuil(valeur: number, table: readonly { min: number; libelle: string }[]): string {
  let res = table[0].libelle;
  for (const l of table) if (valeur >= l.min) res = l.libelle;
  return res;
}

export function palierDecote(indice: number) {
  let res = PALIERS_DECOTE[0];
  for (const p of PALIERS_DECOTE) if (indice >= p.min) res = p;
  return { niveau: res.niveau, fourchette: res.fourchette, pctMoyen: res.pctMoyen };
}

/** Incohérence (spec cas limites) : « continue normalement » en Q4 mais « moi seul » en Q1 à Q3. */
export function incoherenceDependance(reponses: Reponses): boolean {
  const q4 = reponses['dep4'];
  const seuls = ['dep1', 'dep2', 'dep3'].filter((id) => points(reponses[id]) === 0).length;
  return q4 === 2 && seuls >= 2;
}

function actionDepuis(q: Question): Action {
  return { questionId: q.id, axe: q.axe, titre: q.action.titre, duree: q.action.duree, detail: q.action.detail };
}

/**
 * Première action de l'axe Dépendance : la pire réponse selon l'ordre de priorité de la spec.
 * Dirigeant seul sans salarié : on oriente vers la documentation (dep3) plutôt que la délégation.
 */
export function premiereActionDependance(reponses: Reponses, dirigeantSeul = false): Action | null {
  if (dirigeantSeul) {
    const q = QUESTIONS.find((x) => x.id === 'dep3')!;
    return points(reponses['dep3']) < 2 ? actionDepuis(q) : null;
  }
  let pire: { q: Question; p: number } | null = null;
  for (const id of PRIORITE_DEPENDANCE) {
    const q = QUESTIONS.find((x) => x.id === id)!;
    const p = points(reponses[id]);
    if (pire === null || p < pire.p) pire = { q, p };
  }
  return pire && pire.p < 2 ? actionDepuis(pire.q) : null;
}

/**
 * Les 3 actions gratuites (spec 2.4) : la première vient de la dépendance, les deux suivantes
 * sont les pires réponses des autres axes, en privilégiant les axes les plus faibles.
 */
export function actionsRecommandees(reponses: Reponses, dirigeantSeul = false): Action[] {
  const actions: Action[] = [];
  const dep = premiereActionDependance(reponses, dirigeantSeul);
  if (dep) actions.push(dep);

  const autresAxes = AXES.filter((a) => a.id !== 'dep')
    .map((a) => ({ id: a.id, score: scoreAxe(a.id, reponses) }))
    .sort((a, b) => a.score - b.score);

  for (const axe of autresAxes) {
    if (actions.length >= 3) break;
    const pire = questionsDeLAxe(axe.id)
      .map((q) => ({ q, p: points(reponses[q.id]) }))
      .sort((a, b) => a.p - b.p)[0];
    if (pire && pire.p < 2) actions.push(actionDepuis(pire.q));
  }
  // Si tout est bon ailleurs, compléter avec d'autres questions de dépendance.
  if (actions.length < 3) {
    for (const id of PRIORITE_DEPENDANCE) {
      if (actions.length >= 3) break;
      if (actions.some((a) => a.questionId === id)) continue;
      const q = QUESTIONS.find((x) => x.id === id)!;
      if (points(reponses[id]) < 2) actions.push(actionDepuis(q));
    }
  }
  return actions.slice(0, 3);
}

/**
 * Alertes à seuil (feature « Repérer les points qui bloqueront une reprise », en attente de spec :
 * version préliminaire, à aligner sur la spec quand elle existera).
 */
export function alertes(reponses: Reponses): Alerte[] {
  const out: Alerte[] = [];
  if (points(reponses['cli1']) === 0)
    out.push({
      id: 'concentration-clients',
      titre: 'Un client pèse plus du quart du chiffre d’affaires',
      explication: 'La perte de ce client mettrait l’entreprise en difficulté. C’est le premier point qu’un tiers regardera.',
      delai: '12 à 18 mois pour diluer',
    });
  if (points(reponses['dep5']) === 0 && points(reponses['team1']) === 0)
    out.push({
      id: 'pas-de-second',
      titre: 'Personne n’est identifié pour vous seconder',
      explication: 'Sans second, l’entreprise ne peut pas fonctionner en votre absence prolongée.',
      delai: '12 à 24 mois pour former quelqu’un',
    });
  if (points(reponses['fin3']) === 0)
    out.push({
      id: 'sous-investissement',
      titre: 'L’outil de travail n’est plus renouvelé',
      explication: 'Un matériel vieilli se lit dans les comptes et sur le terrain, et pèse sur la valeur.',
      delai: '12 à 36 mois selon le matériel',
    });
  if (points(reponses['dep6']) === 0)
    out.push({
      id: 'contrats-personnels',
      titre: 'Des contrats clés sont à votre nom personnel',
      explication: 'Bail ou contrats au nom du dirigeant ne suivent pas l’entreprise. C’est un frein juridique simple à lever.',
      delai: '3 à 6 mois',
    });
  return out;
}

export function pointsAEclaircir(reponses: Reponses): string[] {
  return QUESTIONS.filter((q) => reponses[q.id] === 'nsp').map((q) => q.texte);
}

export function estHorsCible(ctx: Contexte): boolean {
  return (
    ctx.effectif === 'Plus de 30 salariés' ||
    ctx.chiffre === 'Moins de 100 k€' ||
    ctx.chiffre === 'Plus de 5 M€'
  );
}

export function estDirigeantSeul(ctx: Contexte): boolean {
  return ctx.effectif === 'Moi seul';
}

export function phraseDependance(indice: number, decote: { pctMoyen: number }, dirigeantSeul: boolean): string {
  if (indice === 0) return 'Votre entreprise fonctionne sans vous. C’est rare, et c’est ce qui fait sa valeur.';
  if (dirigeantSeul)
    return 'Votre entreprise, c’est votre savoir-faire. Le documenter est ce qui lui donnera une valeur en dehors de vous.';
  return `Aujourd’hui, une entreprise comme la vôtre perd environ ${decote.pctMoyen} % de sa valeur parce qu’elle dépend de son dirigeant. C’est le levier le plus rapide à actionner.`;
}

export function calculerResultat(reponses: Reponses, ctx: Contexte = {}): Resultat {
  const dirigeantSeul = estDirigeantSeul(ctx);
  const indice = indiceDependance(reponses);
  const decote = palierDecote(indice);
  const global = scoreGlobal(reponses);
  return {
    scoreGlobal: global,
    libelleGlobal: libelleParSeuil(global, LIBELLES_SCORE),
    axes: AXES.map((a) => ({ id: a.id, nom: a.nom, score: scoreAxe(a.id, reponses) })),
    dependance: {
      indice,
      libelle: libelleParSeuil(indice, LIBELLES_DEPENDANCE),
      decote,
      incoherence: incoherenceDependance(reponses),
      phrase: phraseDependance(indice, decote, dirigeantSeul),
    },
    actions: actionsRecommandees(reponses, dirigeantSeul),
    alertes: alertes(reponses),
    pointsAEclaircir: pointsAEclaircir(reponses),
    horsCible: estHorsCible(ctx),
    dirigeantSeul,
  };
}
