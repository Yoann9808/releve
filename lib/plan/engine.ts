/**
 * Moteur du plan d'actions à 3 ans (spec « Transformer mon score en plan d'actions à 3 ans », §2.2 et §2.3).
 * Fonctions pures, sans dépendance au navigateur ni au serveur. Testées dans plan.test.ts.
 *
 * Le plan part du résultat du score (6 sous-scores, indice de dépendance, alertes) et du catalogue
 * (lib/plan/catalogue.ts). Les trois premières actions sont celles du résultat gratuit, à l'identique.
 */
import { AXES, PRIORITE_DEPENDANCE, QUESTIONS, type AxeId } from '../score/content.ts';
import {
  alertesBloquantes,
  calculerResultat,
  estBloquante,
  estDirigeantSeul,
  points,
  questionsDeLAxe,
  scoreAxe,
  type Action,
  type Contexte,
  type Reponses,
} from '../score/engine.ts';
import {
  CATALOGUE_PAR_ID,
  DEBUTS_PAR_TRIMESTRE,
  DELAI_RESEQUENCEMENT_MS,
  EN_COURS_MAX,
  TRIMESTRES,
  type Etape,
} from './catalogue.ts';
import { estHypothese, etatDuTemps, moisRestants, type EtatDuTemps, type Horizon } from './horizon.ts';

export type Origine = 'alerte' | 'dependance' | 'axe' | 'remplacement';

export type ActionPlan = {
  /** Identifiant de la question du score (clé du catalogue). */
  id: string;
  axe: AxeId;
  axeNom: string;
  titre: string;
  detail: string;
  pourquoi?: string;
  premiereEtape?: string;
  origine: Origine;
  /** Rang dans le plan, à partir de 1. Les rangs 1 à 3 sont les actions gratuites. */
  rang: number;
  gratuite: boolean;
  /** Durée indicative en mois. */
  dureeMois: number;
  /** Trimestre de début et de fin (1 = le trimestre en cours). Null : non placée dans les 12 trimestres, ou déjà faite. */
  trimestreDebut: number | null;
  trimestreFin: number | null;
  /** Prérequis effectivement présents dans le plan. */
  prerequis: string[];
  /** Effet attendu sur le score si l'action est menée à bien : points gagnés sur l'axe et sur le score global. */
  effet: { axe: number; global: number };
  etapes: Etape[];
  /** Marquée faite par le dirigeant : conservée, plus séquencée (spec §2.5). */
  faite: boolean;
};

export type Trimestre = {
  /** 1 à 12. */
  numero: number;
  /** Identifiants des actions qui commencent ce trimestre. */
  commencent: string[];
  /** Identifiants des actions en cours ce trimestre (commencées avant ou pendant, pas encore finies). */
  enCours: string[];
};

export type Plan = {
  horizon: Horizon;
  /** L'horizon est une hypothèse (« je ne sais pas encore » → 3 ans), pas un choix. */
  hypothese: boolean;
  moisRestants: number;
  /** Délai le plus long parmi les alertes actives, en mois ; null sans alerte. */
  delaiMax: number | null;
  etat: EtatDuTemps | null;
  /** Mode accéléré (horizon plus court que le délai le plus long) : actions les plus courtes d'abord. */
  accelere: boolean;
  actions: ActionPlan[];
  trimestres: Trimestre[];
  /** Actions qui ne tiennent pas dans les 12 trimestres, dans l'ordre du plan. */
  auDela: string[];
  /** Actions d'un plan précédent qui n'ont plus lieu d'être : visibles, jamais supprimées (spec §3). */
  archivees: { id: string; titre: string }[];
  genereLe: number;
};

export type OptionsPlan = {
  horizon: Horizon;
  /** Date (ms) à laquelle l'horizon a été choisi. */
  choisiLe: number;
  /** Date (ms) du calcul. */
  maintenant: number;
  /** Actions déjà faites : conservées, non séquencées. */
  faites?: readonly string[];
  /** Ordre des actions du plan précédent, pour ne pas tout re-séquencer à chaque nouveau score. */
  ordrePrecedent?: readonly string[];
  /** Actions du plan précédent : celles qui disparaissent sont archivées, pas supprimées. */
  actionsConnues?: readonly string[];
};

function question(id: string) {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Question inconnue : ${id}`);
  return q;
}

function nomAxe(axe: AxeId): string {
  return AXES.find((a) => a.id === axe)!.nom;
}

/** Points gagnés sur l'axe et sur le score global si la réponse passe au maximum. */
export function effetAttendu(id: string, reponses: Reponses): { axe: number; global: number } {
  const q = question(id);
  const gain = 2 - points(reponses[id]);
  const nb = questionsDeLAxe(q.axe).length;
  const surAxe = (gain / (nb * 2)) * 100;
  const poids = AXES.find((a) => a.id === q.axe)!.poids;
  return { axe: Math.round(surAxe), global: Math.round(surAxe * poids) };
}

/** Trimestres occupés par une action : au moins un, par tranches de 3 mois. */
export function dureeEnTrimestres(dureeMois: number): number {
  return Math.max(1, Math.ceil(dureeMois / 3));
}

/** Vrai si une semaine au moins s'est écoulée depuis le dernier séquencement (spec §3). */
export function peutResequencer(dernierSequencement: number | null, maintenant: number): boolean {
  return dernierSequencement === null || maintenant - dernierSequencement >= DELAI_RESEQUENCEMENT_MS;
}

type Candidate = {
  id: string;
  origine: Origine;
  texte: Action;
  dureeMois: number;
};

/**
 * Sélection des actions (spec §2.3) : chaque question dont la réponse n'est pas au maximum appelle
 * l'action du catalogue. Les trois actions du résultat viennent en premier, à l'identique.
 * Dirigeant seul : les actions qui supposent des salariés sont remplacées par leur action de
 * documentation ou de formalisation (spec §3), sauf si elles font partie des trois actions du résultat.
 */
export function selectionnerActions(reponses: Reponses, ctx: Contexte = {}): Candidate[] {
  const resultat = calculerResultat(reponses, ctx);
  const seul = estDirigeantSeul(ctx);
  const alertes = alertesBloquantes(reponses, ctx);
  const texteAlerte = new Map(alertes.map((a) => [a.action.questionId, a]));
  const gratuites = resultat.actions;

  const out: Candidate[] = [];
  const presentes = new Set<string>();

  function dureeDe(id: string): number {
    const entree = CATALOGUE_PAR_ID.get(id)!;
    const al = texteAlerte.get(id);
    return al ? Math.max(entree.dureeMois, al.delai.min) : entree.dureeMois;
  }

  function origineDe(id: string): Origine {
    if (texteAlerte.has(id)) return 'alerte';
    return question(id).axe === 'dep' ? 'dependance' : 'axe';
  }

  function texteDe(id: string): Action {
    const al = texteAlerte.get(id);
    if (al) return al.action;
    const q = question(id);
    return { questionId: id, axe: q.axe, titre: q.action.titre, duree: q.action.duree, detail: q.action.detail };
  }

  function ajouter(id: string, origine: Origine, texte: Action) {
    if (presentes.has(id)) return;
    presentes.add(id);
    out.push({ id, origine, texte, dureeMois: dureeDe(id) });
  }

  // 1. Les trois actions du résultat, dans l'ordre du résultat.
  for (const a of gratuites) ajouter(a.questionId, origineDe(a.questionId), a);

  // 2. Les actions des alertes, puis de la dépendance, puis des autres axes du plus faible au plus fort.
  const ordreAxes = AXES.filter((a) => a.id !== 'dep')
    .map((a) => ({ id: a.id, score: scoreAxe(a.id, reponses) }))
    .sort((a, b) => a.score - b.score)
    .map((a) => a.id);
  const ordreQuestions: string[] = [
    ...alertes.map((a) => a.action.questionId),
    ...PRIORITE_DEPENDANCE,
    ...ordreAxes.flatMap((axe) =>
      questionsDeLAxe(axe)
        .map((q) => ({ id: q.id, p: points(reponses[q.id]) }))
        .sort((a, b) => a.p - b.p)
        .map((q) => q.id),
    ),
  ];

  for (const id of ordreQuestions) {
    if (presentes.has(id) || points(reponses[id]) >= 2) continue;
    const entree = CATALOGUE_PAR_ID.get(id)!;
    if (seul && !entree.sansSalarie) {
      if (entree.remplacement) ajouter(entree.remplacement, 'remplacement', texteDe(entree.remplacement));
      continue;
    }
    ajouter(id, origineDe(id), texteDe(id));
  }

  return out;
}

/** Ordre final des candidats hors gratuites : mode accéléré (plus courtes d'abord) puis ordre précédent. */
function ordonner(candidats: Candidate[], nbGratuites: number, accelere: boolean, ordrePrecedent?: readonly string[]): Candidate[] {
  const gratuites = candidats.slice(0, nbGratuites);
  let reste = candidats.slice(nbGratuites).map((c, i) => ({ c, i }));
  if (accelere) reste = reste.sort((a, b) => a.c.dureeMois - b.c.dureeMois || a.i - b.i);
  if (ordrePrecedent && ordrePrecedent.length > 0) {
    const rang = new Map(ordrePrecedent.map((id, i) => [id, i]));
    reste = reste
      .map((x, i) => ({ ...x, i }))
      .sort((a, b) => {
        const ra = rang.get(a.c.id);
        const rb = rang.get(b.c.id);
        if (ra !== undefined && rb !== undefined) return ra - rb;
        if (ra !== undefined) return -1;
        if (rb !== undefined) return 1;
        return a.i - b.i;
      });
  }
  return [...gratuites, ...reste.map((x) => x.c)];
}

/**
 * Séquencement sur 12 trimestres (spec §2.3) : 1 à 2 nouvelles actions par trimestre, jamais plus de
 * 3 en cours, prérequis terminés avant de commencer (sauf pour les trois actions du résultat, déjà
 * recommandées « par où commencer »). Les actions faites ne sont pas séquencées.
 */
function sequencer(actions: ActionPlan[]): { trimestres: Trimestre[]; auDela: string[] } {
  const parId = new Map(actions.map((a) => [a.id, a]));
  const aPlacer = actions.filter((a) => !a.faite);
  const trimestres: Trimestre[] = [];

  for (let t = 1; t <= TRIMESTRES; t++) {
    const enCours = actions.filter((a) => a.trimestreDebut !== null && a.trimestreDebut <= t && a.trimestreFin! >= t);
    const commencent: string[] = [];
    for (const a of aPlacer) {
      if (commencent.length >= DEBUTS_PAR_TRIMESTRE) break;
      if (a.trimestreDebut !== null) continue;
      if (enCours.length + commencent.length >= EN_COURS_MAX) break;
      const prerequisOk =
        a.gratuite ||
        a.prerequis.every((p) => {
          const pre = parId.get(p)!;
          return pre.faite || (pre.trimestreFin !== null && pre.trimestreFin < t);
        });
      if (!prerequisOk) continue;
      a.trimestreDebut = t;
      a.trimestreFin = t + dureeEnTrimestres(a.dureeMois) - 1;
      commencent.push(a.id);
    }
    trimestres.push({
      numero: t,
      commencent,
      enCours: actions.filter((a) => a.trimestreDebut !== null && a.trimestreDebut <= t && a.trimestreFin! >= t).map((a) => a.id),
    });
  }

  return { trimestres, auDela: aPlacer.filter((a) => a.trimestreDebut === null).map((a) => a.id) };
}

export function genererPlan(reponses: Reponses, ctx: Contexte, options: OptionsPlan): Plan {
  const resultat = calculerResultat(reponses, ctx);
  const bloquantes = resultat.alertes.filter(estBloquante);
  const delaiMax = bloquantes.length > 0 ? Math.max(...bloquantes.map((a) => a.delai.max)) : null;
  const mois = moisRestants(options.horizon, options.choisiLe, options.maintenant);
  const etat = etatDuTemps(mois, delaiMax);
  const accelere = etat === 'maintenant';
  const faites = new Set(options.faites ?? []);

  const candidats = ordonner(selectionnerActions(reponses, ctx), resultat.actions.length, accelere, options.ordrePrecedent);
  const ids = new Set(candidats.map((c) => c.id));

  const actions: ActionPlan[] = candidats.map((c, i) => {
    const q = question(c.id);
    const entree = CATALOGUE_PAR_ID.get(c.id)!;
    return {
      id: c.id,
      axe: q.axe,
      axeNom: nomAxe(q.axe),
      titre: c.texte.titre,
      detail: c.texte.detail,
      pourquoi: c.texte.pourquoi,
      premiereEtape: c.texte.premiereEtape,
      origine: c.origine,
      rang: i + 1,
      gratuite: i < resultat.actions.length,
      dureeMois: c.dureeMois,
      trimestreDebut: null,
      trimestreFin: null,
      prerequis: entree.prerequis.filter((p) => ids.has(p)),
      effet: effetAttendu(c.id, reponses),
      etapes: [...entree.etapes],
      faite: faites.has(c.id),
    };
  });

  const { trimestres, auDela } = sequencer(actions);

  const archivees = (options.actionsConnues ?? [])
    .filter((id) => !ids.has(id) && CATALOGUE_PAR_ID.has(id))
    .map((id) => ({ id, titre: question(id).action.titre }));

  return {
    horizon: options.horizon,
    hypothese: estHypothese(options.horizon),
    moisRestants: mois,
    delaiMax,
    etat,
    accelere,
    actions,
    trimestres,
    auDela,
    archivees,
    genereLe: options.maintenant,
  };
}
