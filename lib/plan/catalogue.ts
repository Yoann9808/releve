/**
 * Catalogue des actions du plan à 3 ans (spec « Transformer mon score en plan d'actions à 3 ans », §2.3).
 * Configuration, pas de code : une entrée par question du score, clé = identifiant de la question.
 * Le titre et le détail de l'action viennent de la question (lib/score/content.ts), ou de l'alerte
 * quand l'action en est issue : les trois premières actions du plan sont ainsi identiques à celles du résultat.
 *
 * Chaque entrée porte : la durée indicative en mois, les prérequis (actions à terminer avant),
 * si elle s'applique à un dirigeant sans salarié (sinon, l'action de documentation ou de formalisation
 * qui la remplace, spec §3) et ses micro-étapes de 15 à 30 minutes, chacune cochable (§2.3).
 *
 * À relire par un expert-comptable avant mise en ligne (critère d'acceptation §4).
 */

export type Etape = {
  titre: string;
  /** Durée indicative, entre 15 et 30 minutes. */
  minutes: number;
};

export type EntreeCatalogue = {
  /** Identifiant de la question du score dont la pire réponse déclenche l'action. */
  id: string;
  /** Durée indicative de l'action, en mois. */
  dureeMois: number;
  /** Actions à terminer avant de commencer celle-ci (ne contraint que si elles sont dans le plan). */
  prerequis: readonly string[];
  /** Vrai si l'action a un sens pour un dirigeant sans salarié. */
  sansSalarie: boolean;
  /** Pour un dirigeant sans salarié, l'action de documentation ou de formalisation qui remplace celle-ci. */
  remplacement?: string;
  etapes: readonly Etape[];
};

export const ETAPE_MINUTES_MIN = 15;
export const ETAPE_MINUTES_MAX = 30;

export const CATALOGUE: readonly EntreeCatalogue[] = [
  // --- Dépendance au dirigeant ---
  {
    id: 'dep1',
    dureeMois: 3,
    prerequis: [],
    sansSalarie: false,
    remplacement: 'cli3',
    etapes: [
      { titre: 'Listez vos 10 principaux clients et, pour chacun, la personne de l’équipe qui pourrait devenir son second interlocuteur.', minutes: 20 },
      { titre: 'Prévenez ces deux personnes et fixez le prochain rendez-vous client auquel chacune vous accompagne.', minutes: 15 },
      { titre: 'Après le premier rendez-vous accompagné, envoyez au client un e-mail qui présente son nouvel interlocuteur.', minutes: 15 },
    ],
  },
  {
    id: 'dep2',
    dureeMois: 3,
    prerequis: [],
    sansSalarie: false,
    remplacement: 'proc1',
    etapes: [
      { titre: 'Écrivez votre grille de prix sur une page : prestations courantes, tarifs, marges minimales.', minutes: 30 },
      { titre: 'Choisissez le salarié qui établira les cinq prochains devis et montrez-lui un devis récent, ligne par ligne.', minutes: 30 },
      { titre: 'Relisez son premier devis avec lui et notez les deux points à corriger pour le suivant.', minutes: 20 },
    ],
  },
  {
    id: 'dep3',
    dureeMois: 6,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Listez les dix gestes ou décisions du cœur de métier que vous seul savez faire.', minutes: 15 },
      { titre: 'Dictez la première fiche (une étape, ses pièges, ce qu’un bon résultat veut dire) en travaillant, puis relisez-la.', minutes: 30 },
      { titre: 'Faites appliquer la fiche par une autre personne sous votre regard, et corrigez ce qui manquait.', minutes: 30 },
    ],
  },
  {
    id: 'dep4',
    dureeMois: 12,
    prerequis: ['dep5'],
    sansSalarie: false,
    remplacement: 'dep3',
    etapes: [
      { titre: 'Bloquez dans l’agenda une première semaine d’absence réelle, à trois mois, et prévenez l’équipe.', minutes: 15 },
      { titre: 'Écrivez la liste de ce qui doit être décidé sans vous pendant cette semaine, et qui le décide.', minutes: 30 },
      { titre: 'Au retour, notez ce qui a coincé et choisissez un point à régler ce trimestre.', minutes: 20 },
    ],
  },
  {
    id: 'dep5',
    dureeMois: 6,
    prerequis: [],
    sansSalarie: false,
    remplacement: 'dep3',
    etapes: [
      { titre: 'Écrivez le nom de la personne la plus crédible pour vous seconder et le premier domaine que vous lui confiez.', minutes: 15 },
      { titre: 'Proposez-lui ce rôle en tête-à-tête, avec le périmètre et le droit de décider sans vous demander.', minutes: 30 },
      { titre: 'Fixez un point hebdomadaire de 20 minutes pour le premier trimestre.', minutes: 15 },
    ],
  },
  {
    id: 'dep6',
    dureeMois: 3,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Listez les contrats, abonnements et le bail qui sont à votre nom personnel.', minutes: 30 },
      { titre: 'Prenez rendez-vous avec votre expert-comptable ou votre avocat pour organiser le transfert à la société.', minutes: 15 },
      { titre: 'Envoyez la demande d’avenant au premier contrat de la liste.', minutes: 20 },
    ],
  },

  // --- Clients et récurrence ---
  {
    id: 'cli1',
    dureeMois: 18,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Listez vos dix premiers clients avec leur part du chiffre d’affaires de l’an dernier.', minutes: 20 },
      { titre: 'Notez les trois prescripteurs qui vous envoient déjà du travail et appelez le premier.', minutes: 30 },
      { titre: 'Chaque mois, inscrivez le nouveau client régulier gagné et recalculez la part des trois premiers.', minutes: 15 },
    ],
  },
  {
    id: 'cli2',
    dureeMois: 6,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Repérez vos cinq clients qui reviennent chaque année et ce que vous faites déjà pour eux.', minutes: 20 },
      { titre: 'Rédigez une proposition d’une page : prestation annuelle, prix, date de renouvellement.', minutes: 30 },
      { titre: 'Présentez-la au premier des cinq lors de votre prochain échange.', minutes: 20 },
    ],
  },
  {
    id: 'cli3',
    dureeMois: 3,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Demandez à votre expert-comptable ou avocat un modèle de contrat-cadre de deux pages.', minutes: 15 },
      { titre: 'Remplissez-le pour votre premier prescripteur : périmètre, tarifs, durée, préavis.', minutes: 30 },
      { titre: 'Envoyez-le avec un mot simple et fixez une date de signature.', minutes: 15 },
    ],
  },
  {
    id: 'cli4',
    dureeMois: 12,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Mettez à jour votre fiche Google : horaires, photos récentes, description de l’activité.', minutes: 30 },
      { titre: 'Listez trois prescripteurs possibles avec l’équipe et désignez qui les contacte.', minutes: 20 },
      { titre: 'Désignez la personne qui répond aux demandes entrantes et écrivez sa réponse type.', minutes: 20 },
    ],
  },

  // --- Qualité financière ---
  {
    id: 'fin1',
    dureeMois: 3,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Prenez rendez-vous avec votre expert-comptable pour une revue des comptes « vus par un tiers ».', minutes: 15 },
      { titre: 'Listez les charges mixtes, comptes courants et provisions qu’un lecteur extérieur ne comprendrait pas.', minutes: 30 },
      { titre: 'Pour chaque point, notez s’il est régularisé ou documenté, et par qui.', minutes: 20 },
    ],
  },
  {
    id: 'fin2',
    dureeMois: 1,
    prerequis: ['fin1'],
    sansSalarie: true,
    etapes: [
      { titre: 'Demandez à votre expert-comptable le salaire de marché d’un dirigeant salarié pour votre poste.', minutes: 15 },
      { titre: 'Recalculez le résultat de l’an dernier avec ce salaire et notez le chiffre obtenu.', minutes: 30 },
    ],
  },
  {
    id: 'fin3',
    dureeMois: 12,
    prerequis: ['fin4'],
    sansSalarie: true,
    etapes: [
      { titre: 'Notez vos cinq équipements ou outils les plus anciens avec leur année d’achat.', minutes: 20 },
      { titre: 'Estimez avec votre expert-comptable le coût de remplacement de chacun.', minutes: 30 },
      { titre: 'Étalez les achats sur trois ans dans un tableau d’une page et datez le premier.', minutes: 30 },
    ],
  },
  {
    id: 'fin4',
    dureeMois: 2,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Créez un tableau de trois lignes : trésorerie, carnet de commandes, marge.', minutes: 20 },
      { titre: 'Remplissez-le pour le mois dernier avec votre expert-comptable.', minutes: 30 },
      { titre: 'Mettez un rappel le 5 de chaque mois pour le compléter.', minutes: 15 },
    ],
  },

  // --- Processus documentés ---
  {
    id: 'proc1',
    dureeMois: 3,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Choisissez les trois processus que vous seul connaissez (du devis à la facture, la réception, la réclamation).', minutes: 15 },
      { titre: 'Dictez le premier en une page, étape par étape, puis relisez-le.', minutes: 30 },
      { titre: 'Faites-le relire par la personne qui l’appliquera et corrigez ce qui n’est pas clair.', minutes: 20 },
    ],
  },
  {
    id: 'proc2',
    dureeMois: 2,
    prerequis: ['proc1'],
    sansSalarie: false,
    remplacement: 'proc1',
    etapes: [
      { titre: 'Listez ce qu’un nouvel embauché doit savoir faire seul au bout de 30 jours.', minutes: 20 },
      { titre: 'Répartissez ces apprentissages sur quatre semaines, avec qui montre quoi.', minutes: 30 },
      { titre: 'Remettez le parcours au prochain embauché et demandez-lui de le corriger.', minutes: 15 },
    ],
  },
  {
    id: 'proc3',
    dureeMois: 1,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Créez un dossier partagé avec cinq rubriques : tarifs, contacts, plans, contrats, accès.', minutes: 20 },
      { titre: 'Déposez-y les dix informations que l’on vous demande le plus souvent.', minutes: 30 },
      { titre: 'Mettez en place un gestionnaire de mots de passe d’équipe et transférez les accès.', minutes: 30 },
    ],
  },
  {
    id: 'proc4',
    dureeMois: 2,
    prerequis: ['proc1'],
    sansSalarie: false,
    remplacement: 'proc1',
    etapes: [
      { titre: 'Pour votre prestation la plus fréquente, listez les dix points que vous vérifiez à l’œil.', minutes: 20 },
      { titre: 'Mettez-les en liste à cocher, avec une case « fait par » et une case « vérifié par ».', minutes: 15 },
      { titre: 'Testez la liste sur une prestation et retirez ce qui ne sert pas.', minutes: 20 },
    ],
  },

  // --- Équipe et relève interne ---
  {
    id: 'team1',
    dureeMois: 12,
    prerequis: [],
    sansSalarie: false,
    remplacement: 'dep3',
    etapes: [
      { titre: 'Notez le nom de la personne que les autres écoutent, et pourquoi.', minutes: 15 },
      { titre: 'Choisissez le premier domaine que vous lui confiez et fixez un point mensuel.', minutes: 20 },
      { titre: 'Dites-lui ce que vous attendez d’elle d’ici un an, en tête-à-tête.', minutes: 30 },
    ],
  },
  {
    id: 'team2',
    dureeMois: 6,
    prerequis: [],
    sansSalarie: false,
    etapes: [
      { titre: 'Listez vos personnes clés et l’indicateur simple que chacune comprend (marge, délais, réclamations).', minutes: 20 },
      { titre: 'Demandez à votre expert-comptable un modèle d’accord d’intéressement calé sur cet indicateur.', minutes: 15 },
      { titre: 'Présentez le principe à l’équipe en dix minutes, avant toute signature.', minutes: 30 },
    ],
  },
  {
    id: 'team3',
    dureeMois: 3,
    prerequis: ['team4'],
    sansSalarie: false,
    remplacement: 'proc1',
    etapes: [
      { titre: 'Choisissez une famille de décisions à déléguer et son plafond (par exemple : achats courants jusqu’à 2 000 €).', minutes: 15 },
      { titre: 'Écrivez la règle sur une page, avec qui décide et qui est prévenu.', minutes: 20 },
      { titre: 'Affichez-la et laissez la première décision se prendre sans vous.', minutes: 15 },
    ],
  },
  {
    id: 'team4',
    dureeMois: 1,
    prerequis: [],
    sansSalarie: false,
    remplacement: 'proc3',
    etapes: [
      { titre: 'Dessinez sur une page qui fait quoi aujourd’hui, réellement, pas en théorie.', minutes: 30 },
      { titre: 'Pour chaque poste, notez qui remplace qui en cas d’absence.', minutes: 20 },
      { titre: 'Montrez la page à l’équipe et corrigez ce qui ne correspond pas.', minutes: 20 },
    ],
  },

  // --- Juridique et actifs ---
  {
    id: 'jur1',
    dureeMois: 2,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Créez un dossier « Juridique » et listez ce qu’il doit contenir : statuts, Kbis, bail, assurances, contrats de travail, marques.', minutes: 15 },
      { titre: 'Rassemblez ce que vous avez déjà et cochez la liste.', minutes: 30 },
      { titre: 'Demandez les pièces manquantes à votre expert-comptable ou à votre avocat.', minutes: 15 },
    ],
  },
  {
    id: 'jur2',
    dureeMois: 6,
    prerequis: ['jur1'],
    sansSalarie: true,
    etapes: [
      { titre: 'Retrouvez la date d’échéance de votre bail et notez-la dans l’agenda, 18 mois avant.', minutes: 15 },
      { titre: 'Listez ce que vous voudriez changer au renouvellement : durée, loyer, travaux.', minutes: 20 },
      { titre: 'Prenez rendez-vous avec le bailleur ou votre avocat pour ouvrir la discussion.', minutes: 15 },
    ],
  },
  {
    id: 'jur3',
    dureeMois: 12,
    prerequis: ['jur1'],
    sansSalarie: true,
    etapes: [
      { titre: 'Notez où sont les murs aujourd’hui : société d’exploitation, structure séparée, location.', minutes: 15 },
      { titre: 'Demandez à votre expert-comptable ce qu’une séparation changerait pour l’entreprise et pour vous.', minutes: 30 },
      { titre: 'Prenez rendez-vous avec un notaire si la séparation est retenue.', minutes: 15 },
    ],
  },
  {
    id: 'jur4',
    dureeMois: 6,
    prerequis: [],
    sansSalarie: true,
    etapes: [
      { titre: 'Listez chaque litige, contrôle ou contentieux : nature, montant, état.', minutes: 30 },
      { titre: 'Pour chacun, notez la prochaine étape et qui s’en occupe.', minutes: 20 },
      { titre: 'Classez les pièces dans le dossier juridique.', minutes: 20 },
    ],
  },
];

export const CATALOGUE_PAR_ID: ReadonlyMap<string, EntreeCatalogue> = new Map(CATALOGUE.map((e) => [e.id, e]));

/** Nombre de trimestres du plan (spec §2.3 : 12 trimestres sur 3 ans). */
export const TRIMESTRES = 12;
/** Nouvelles actions au plus par trimestre (spec §2.3 : 1 à 2). */
export const DEBUTS_PAR_TRIMESTRE = 2;
/** Actions en cours au plus en même temps (spec §2.3 : jamais plus de 3). */
export const EN_COURS_MAX = 3;
/** Pas de re-séquencement plus d'une fois par semaine (spec §3). */
export const DELAI_RESEQUENCEMENT_MS = 7 * 24 * 60 * 60 * 1000;
