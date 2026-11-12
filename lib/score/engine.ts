/**
 * Moteur de score de transmissibilité. Fonctions pures, sans dépendance au navigateur.
 * Testé dans engine.test.ts (node --test).
 */
import {
  ALERTES,
  AXES,
  LIBELLES_DEPENDANCE,
  LIBELLES_SCORE,
  PALIERS_DECOTE,
  PRIORITE_DEPENDANCE,
  QUESTIONS,
  QUESTIONS_A_ECLAIRCIR,
  SECTEURS_SERVICES,
  VARIANTES_ALERTES,
  type ActionAlerte,
  type AlerteId,
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
  /** Renseignés pour les actions issues d'une alerte (quoi, pourquoi, combien de temps, première micro-étape). */
  pourquoi?: string;
  premiereEtape?: string;
};

/**
 * Alerte à seuil (spec « Repérer les points qui bloqueront une reprise »).
 * `bloquant` : seuil franchi, avec délai réaliste de correction et action.
 * `a-eclaircir` : « je ne sais pas » sur la question de l'alerte, avec la question à poser à l'expert-comptable.
 */
export type Alerte =
  | {
      id: AlerteId;
      niveau: 'bloquant';
      titre: string;
      fait: string;
      pourquoi: string;
      delai: { min: number; max: number };
      delaiTexte: string;
      action: Action;
    }
  | {
      id: AlerteId;
      niveau: 'a-eclaircir';
      titre: string;
      question: string;
    };

export type AlerteBloquante = Extract<Alerte, { niveau: 'bloquant' }>;
export type AlerteAEclaircir = Extract<Alerte, { niveau: 'a-eclaircir' }>;

export function estBloquante(a: Alerte): a is AlerteBloquante {
  return a.niveau === 'bloquant';
}

export function estAEclaircir(a: Alerte): a is AlerteAEclaircir {
  return a.niveau === 'a-eclaircir';
}

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
  /** A2 active alors que l'indice de dépendance est faible (spec §3) : réponses qui ne vont pas dans le même sens. */
  incoherenceAlertes: boolean;
  /** Les deux axes les plus faibles, rappelés quand aucun point bloquant n'est repéré (spec §3). */
  axesLesPlusFaibles: { id: AxeId; nom: string; score: number }[];
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
 * Les 3 actions gratuites (spec alertes §2.4) : d'abord l'action de réduction de la dépendance,
 * puis les actions des alertes par délai décroissant, sans doublon (si A2 est active, son action et
 * l'action dépendance Q4/Q5 sont fusionnées : même question, l'action de l'alerte l'emporte).
 * S'il reste de la place, les pires réponses des autres axes, en privilégiant les axes les plus faibles.
 */
export function actionsRecommandees(reponses: Reponses, ctx: Contexte = {}): Action[] {
  const dirigeantSeul = estDirigeantSeul(ctx);
  const actions: Action[] = [];
  const dep = premiereActionDependance(reponses, dirigeantSeul);
  if (dep) actions.push(dep);

  for (const al of alertesBloquantes(reponses, ctx)) {
    const i = actions.findIndex((a) => a.questionId === al.action.questionId);
    if (i >= 0) actions[i] = al.action;
    else actions.push(al.action);
  }

  const autresAxes = AXES.filter((a) => a.id !== 'dep')
    .map((a) => ({ id: a.id, score: scoreAxe(a.id, reponses) }))
    .sort((a, b) => a.score - b.score);

  for (const axe of autresAxes) {
    if (actions.length >= 3) break;
    const pire = questionsDeLAxe(axe.id)
      .filter((q) => !actions.some((a) => a.questionId === q.id))
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

/* ---------- Alertes à seuil (spec « Repérer les points qui bloqueront une reprise ») ---------- */

export function estSecteurServices(ctx: Contexte): boolean {
  return ctx.secteur !== undefined && SECTEURS_SERVICES.includes(ctx.secteur);
}

/** Texte français d'un délai en mois : « 18 à 36 mois ». */
export function texteDelai(delai: { min: number; max: number }): string {
  return `${delai.min} à ${delai.max} mois`;
}

/** A1 : les 3 plus gros clients font plus de 40 % du chiffre d'affaires (pire réponse à cli1). */
export function seuilConcentrationClients(reponses: Reponses): boolean {
  return reponses['cli1'] === 0;
}

/**
 * A2 : l'activité s'arrête ou tourne au ralenti sans le dirigeant (Q4 ≠ « continue normalement »)
 * ET personne n'est prêt à le seconder (Q5 ≠ « oui, et déjà en situation »).
 * Seules les réponses explicites déclenchent l'alerte : « je ne sais pas » ne la déclenche pas.
 */
export function seuilAucunRelais(reponses: Reponses): boolean {
  const q4 = reponses['dep4'];
  const q5 = reponses['dep5'];
  return (q4 === 0 || q4 === 1) && (q5 === 0 || q5 === 1);
}

/** A3 : dernier investissement significatif il y a 3 ans ou plus (fin3 ≠ « moins de 3 ans »). */
export function seuilOutilVieilli(reponses: Reponses): boolean {
  const r = reponses['fin3'];
  return r === 0 || r === 1;
}

function actionAlerte(questionId: string, axe: AxeId, a: ActionAlerte): Action {
  return {
    questionId,
    axe,
    titre: a.titre,
    duree: a.duree,
    detail: a.detail,
    pourquoi: a.pourquoi,
    premiereEtape: a.premiereEtape,
  };
}

/** Question de dépendance portée par l'action de A2 : la pire entre Q4 et Q5, Q4 d'abord à égalité (ordre de priorité de l'indice). */
function questionRelais(reponses: Reponses): 'dep4' | 'dep5' {
  return points(reponses['dep5']) < points(reponses['dep4']) ? 'dep5' : 'dep4';
}

/** Tri des alertes bloquantes : délai décroissant (la plus longue à corriger en premier), §2.2. */
function parDelaiDecroissant(a: AlerteBloquante, b: AlerteBloquante): number {
  return b.delai.max - a.delai.max || b.delai.min - a.delai.min;
}

/** Les alertes dont le seuil est franchi, triées par délai décroissant. */
export function alertesBloquantes(reponses: Reponses, ctx: Contexte = {}): AlerteBloquante[] {
  const out: AlerteBloquante[] = [];
  const services = estSecteurServices(ctx);
  const seul = estDirigeantSeul(ctx);

  if (seuilConcentrationClients(reponses)) {
    const d = ALERTES['concentration-clients'];
    out.push({
      id: d.id,
      niveau: 'bloquant',
      titre: d.titre,
      fait: d.fait,
      pourquoi: d.pourquoi,
      delai: d.delai,
      delaiTexte: texteDelai(d.delai),
      action: actionAlerte('cli1', 'cli', d.action),
    });
  }

  if (seuilAucunRelais(reponses)) {
    const d = ALERTES['aucun-relais'];
    if (seul) {
      const v = VARIANTES_ALERTES.aucunRelaisSeul;
      out.push({
        id: d.id,
        niveau: 'bloquant',
        titre: v.titre,
        fait: v.fait,
        pourquoi: v.pourquoi,
        delai: d.delai,
        delaiTexte: texteDelai(d.delai),
        action: actionAlerte('dep3', 'dep', v.action),
      });
    } else {
      out.push({
        id: d.id,
        niveau: 'bloquant',
        titre: d.titre,
        fait: ctx.coDirigeants ? VARIANTES_ALERTES.aucunRelaisCoDirigeants.fait : d.fait,
        pourquoi: d.pourquoi,
        delai: d.delai,
        delaiTexte: texteDelai(d.delai),
        action: actionAlerte(questionRelais(reponses), 'dep', d.action),
      });
    }
  }

  if (seuilOutilVieilli(reponses)) {
    const d = ALERTES['outil-vieilli'];
    const v = services ? VARIANTES_ALERTES.outilVieilliServices : null;
    out.push({
      id: d.id,
      niveau: 'bloquant',
      titre: d.titre,
      fait: v ? v.fait : d.fait,
      pourquoi: v ? v.pourquoi : d.pourquoi,
      delai: d.delai,
      delaiTexte: texteDelai(d.delai),
      action: actionAlerte('fin3', 'fin', v ? v.action : d.action),
    });
  }

  return out.sort(parDelaiDecroissant);
}

/** « Je ne sais pas » sur la question de A1 ou A3 : point à éclaircir, sans alerte rouge (spec §3). */
export function alertesAEclaircir(reponses: Reponses): Alerte[] {
  const out: Alerte[] = [];
  if (reponses['cli1'] === 'nsp') {
    const q = QUESTIONS_A_ECLAIRCIR['concentration-clients'];
    out.push({ id: 'concentration-clients', niveau: 'a-eclaircir', titre: q.titre, question: q.question });
  }
  if (reponses['fin3'] === 'nsp') {
    const q = QUESTIONS_A_ECLAIRCIR['outil-vieilli'];
    out.push({ id: 'outil-vieilli', niveau: 'a-eclaircir', titre: q.titre, question: q.question });
  }
  return out;
}

/** Toutes les alertes : les bloquantes (par délai décroissant), puis les points à éclaircir. */
export function alertes(reponses: Reponses, ctx: Contexte = {}): Alerte[] {
  return [...alertesBloquantes(reponses, ctx), ...alertesAEclaircir(reponses)];
}

/** A2 active alors que l'indice de dépendance est au palier le plus bas (spec §3) : pas de blocage, une ligne d'avertissement. */
export function incoherenceAlertes(reponses: Reponses): boolean {
  return seuilAucunRelais(reponses) && indiceDependance(reponses) < PALIERS_DECOTE[1].min;
}

/** Les deux axes aux scores les plus faibles (à égalité, l'ordre des axes). */
export function axesLesPlusFaibles(reponses: Reponses, n = 2): { id: AxeId; nom: string; score: number }[] {
  return AXES.map((a) => ({ id: a.id, nom: a.nom, score: scoreAxe(a.id, reponses) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n);
}

/**
 * Comparaison délai / temps restant (spec §2.3), quand l'horizon du dirigeant est connu.
 * Sans horizon, rien n'est affiché : pas de valeur par défaut.
 */
export function comparerAuHorizon(
  alerte: AlerteBloquante,
  moisRestants: number,
): { texte: string; aLancerMaintenant: boolean } {
  const mois = Math.max(0, Math.round(moisRestants));
  return {
    texte: `Il vous reste environ ${mois} mois, ce point demande ${alerte.delaiTexte}.`,
    aLancerMaintenant: mois <= alerte.delai.max,
  };
}

export function pointsAEclaircir(reponses: Reponses, ctx: Contexte = {}): string[] {
  const services = estSecteurServices(ctx);
  return QUESTIONS.filter((q) => reponses[q.id] === 'nsp').map((q) => (services && q.texteServices) || q.texte);
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
    actions: actionsRecommandees(reponses, ctx),
    alertes: alertes(reponses, ctx),
    incoherenceAlertes: incoherenceAlertes(reponses),
    axesLesPlusFaibles: axesLesPlusFaibles(reponses),
    pointsAEclaircir: pointsAEclaircir(reponses, ctx),
    horsCible: estHorsCible(ctx),
    dirigeantSeul,
  };
}
