/**
 * Contenu du questionnaire de transmissibilité.
 * Source : specs « Obtenir mon score seul » et « Voir à quel point mon entreprise repose sur moi »
 * (Backlog features Notion, 2026-11-07).
 *
 * Règle de vocabulaire : aucune question ni libellé ne mentionne un départ, une vente,
 * une retraite ou un repreneur. Un test automatisé le vérifie (vocabulaire.test.ts).
 * Les options sont ordonnées du moins autonome (0 point) au plus autonome (2 points).
 */

export type AxeId = 'dep' | 'cli' | 'fin' | 'proc' | 'team' | 'jur';

export type Axe = {
  id: AxeId;
  nom: string;
  /** Pondération dans le score global (somme = 1). */
  poids: number;
};

export const AXES: readonly Axe[] = [
  { id: 'dep', nom: 'Dépendance au dirigeant', poids: 0.25 },
  { id: 'cli', nom: 'Clients et récurrence', poids: 0.15 },
  { id: 'fin', nom: 'Qualité financière', poids: 0.2 },
  { id: 'proc', nom: 'Processus documentés', poids: 0.15 },
  { id: 'team', nom: 'Équipe et relève interne', poids: 0.15 },
  { id: 'jur', nom: 'Juridique et actifs', poids: 0.1 },
];

export type Question = {
  id: string;
  axe: AxeId;
  texte: string;
  /** Formulation pour une activité de services (sans outil de production), si elle diffère. */
  texteServices?: string;
  /** 3 options, de 0 à 2 points d'autonomie. */
  options: readonly [string, string, string];
  /** Action proposée si cette question obtient la pire réponse. */
  action: { titre: string; duree: string; detail: string };
};

export const QUESTIONS: readonly Question[] = [
  // Axe Dépendance (6 questions, spec « Voir à quel point mon entreprise repose sur moi »)
  {
    id: 'dep1',
    axe: 'dep',
    texte: 'Qui connaît personnellement vos 10 principaux clients ?',
    options: ['Moi seul', 'Moi et une personne', 'Au moins deux personnes en plus de moi'],
    action: {
      titre: 'Présenter vos 10 principaux clients à deux personnes de l’équipe',
      duree: '3 mois',
      detail:
        'Un rendez-vous client sur deux se fait accompagné. Objectif : chaque client clé a un second interlocuteur qu’il connaît par son prénom.',
    },
  },
  {
    id: 'dep2',
    axe: 'dep',
    texte: 'Qui est capable d’établir un devis ou une proposition sans vous ?',
    options: ['Personne', 'Une personne, avec mon aval', 'Une personne, en autonomie'],
    action: {
      titre: 'Faire établir les 5 prochains devis par un salarié, en relecture',
      duree: '3 mois',
      detail:
        'Vous relisez, vous ne rédigez plus. Au cinquième devis, vous ne relisez que les montants. Formalisez au passage la grille de prix.',
    },
  },
  {
    id: 'dep3',
    axe: 'dep',
    texte: 'Le cœur du métier (procédé, savoir-faire technique) est maîtrisé par :',
    options: ['Moi seul', 'Moi et un salarié', 'Plusieurs salariés'],
    action: {
      titre: 'Documenter le procédé clé et former une deuxième personne',
      duree: '6 mois',
      detail:
        'Une fiche par étape, écrite à partir de ce que vous dites en travaillant. Puis une personne l’applique sous votre regard, puis seule.',
    },
  },
  {
    id: 'dep4',
    axe: 'dep',
    texte: 'Si vous étiez absent 3 semaines sans téléphone, l’activité :',
    options: ['S’arrête', 'Tourne au ralenti', 'Continue normalement'],
    action: {
      titre: 'Prendre une semaine d’absence réelle, puis deux, puis trois',
      duree: '12 mois',
      detail:
        'Chaque absence révèle ce qui ne tient qu’à vous. Notez-le au retour et traitez un point par trimestre.',
    },
  },
  {
    id: 'dep5',
    axe: 'dep',
    texte: 'Une personne est-elle identifiée pour vous seconder sur la direction ?',
    options: ['Non', 'Oui, mais pas encore formée', 'Oui, et déjà en situation'],
    action: {
      titre: 'Nommer un adjoint et lui confier un domaine entier',
      duree: '6 mois',
      detail:
        'Le planning, les achats ou la relation fournisseurs : un périmètre complet, avec droit de décider sans vous demander.',
    },
  },
  {
    id: 'dep6',
    axe: 'dep',
    texte: 'Les contrats clients, fournisseurs et le bail sont au nom de :',
    options: ['Moi personnellement', 'C’est mixte', 'La société'],
    action: {
      titre: 'Transférer les contrats et le bail au nom de la société',
      duree: '3 mois',
      detail:
        'Un rendez-vous avec votre expert-comptable ou votre avocat pour lister ce qui est à votre nom et le basculer. Souvent une formalité, parfois un avenant.',
    },
  },

  // Axe Clients et récurrence (4 questions)
  {
    // Question de l'alerte A1 (spec « Repérer les points qui bloqueront une reprise », §2.1).
    id: 'cli1',
    axe: 'cli',
    texte: 'Vos 3 plus gros clients représentent quelle part de votre chiffre d’affaires ?',
    options: ['Plus de 40 %', 'Entre 20 et 40 %', 'Moins de 20 %'],
    action: {
      titre: 'Gagner de nouveaux clients réguliers pour diluer les trois premiers',
      duree: '12 mois',
      detail:
        'Objectif : vos trois premiers clients sous 30 % du chiffre d’affaires. Commencez par les prescripteurs qui vous envoient déjà du travail.',
    },
  },
  {
    id: 'cli2',
    axe: 'cli',
    texte: 'Vos clients reviennent-ils d’une année sur l’autre ?',
    options: ['Chaque année repart de zéro', 'Une partie revient, sans engagement', 'La majorité du chiffre est récurrente ou sous contrat'],
    action: {
      titre: 'Proposer un contrat annuel ou un abonnement à vos 5 meilleurs clients',
      duree: '6 mois',
      detail: 'Entretien, maintenance, suivi : ce que vous faites déjà, écrit noir sur blanc avec une date de renouvellement.',
    },
  },
  {
    id: 'cli3',
    axe: 'cli',
    texte: 'Vos accords avec vos clients principaux sont :',
    options: ['Oraux, sur la confiance', 'Partiellement écrits (devis, e-mails)', 'Formalisés par contrat ou contrat-cadre'],
    action: {
      titre: 'Signer un contrat-cadre avec votre premier prescripteur',
      duree: '3 mois',
      detail: 'Deux pages suffisent : périmètre, tarifs, durée, préavis. Votre expert-comptable ou avocat a un modèle.',
    },
  },
  {
    id: 'cli4',
    axe: 'cli',
    texte: 'D’où viennent vos nouveaux clients ?',
    options: ['De mon réseau personnel uniquement', 'De mon réseau et du bouche-à-oreille de l’équipe', 'De canaux qui tournent sans moi (prescripteurs, site, réputation)'],
    action: {
      titre: 'Construire un canal d’acquisition qui ne passe pas par vous',
      duree: '12 mois',
      detail: 'Une fiche Google à jour, trois prescripteurs identifiés par l’équipe, un salarié qui répond aux demandes entrantes.',
    },
  },

  // Axe Qualité financière (4 questions)
  {
    id: 'fin1',
    axe: 'fin',
    texte: 'Comment décririez-vous vos comptes des trois dernières années ?',
    options: ['Irréguliers ou difficiles à expliquer', 'Corrects, avec des charges personnelles à retraiter', 'Bénéficiaires et lisibles, sans retraitement'],
    action: {
      titre: 'Faire une revue des comptes « vus par un tiers » avec votre expert-comptable',
      duree: '3 mois',
      detail: 'Charges mixtes, comptes courants, provisions : tout ce qu’un lecteur extérieur ne comprendrait pas est à régulariser ou à documenter.',
    },
  },
  {
    id: 'fin2',
    axe: 'fin',
    texte: 'Votre rémunération de dirigeant est-elle au niveau du marché pour votre poste ?',
    options: ['Je me paie très peu, ou surtout en dividendes', 'Plutôt en dessous', 'Oui, au niveau du marché'],
    action: {
      titre: 'Calculer la rentabilité réelle avec une rémunération de marché',
      duree: '1 mois',
      detail: 'Votre expert-comptable recalcule le résultat avec votre salaire au prix d’un dirigeant salarié. C’est ce chiffre qu’un lecteur extérieur regardera.',
    },
  },
  {
    // Question de l'alerte A3 (spec « Repérer les points qui bloqueront une reprise », §2.1).
    id: 'fin3',
    axe: 'fin',
    texte: 'Votre dernier investissement significatif (matériel, locaux, logiciels, véhicules) date de :',
    texteServices: 'Votre dernier investissement significatif (logiciels, site, équipement informatique, locaux) date de :',
    options: ['Plus de 5 ans, ou jamais', '3 à 5 ans', 'Moins de 3 ans'],
    action: {
      titre: 'Planifier le renouvellement de l’outil de travail le plus ancien',
      duree: '12 mois',
      detail: 'Un outil vieilli se lit immédiatement dans les comptes et sur le terrain. Un plan d’investissement sur trois ans, même modeste, change la lecture.',
    },
  },
  {
    id: 'fin4',
    axe: 'fin',
    texte: 'Disposez-vous d’un suivi de trésorerie et de marge à jour ?',
    options: ['Non, je regarde le compte en banque', 'Un suivi partiel ou tardif', 'Un tableau mensuel, à jour'],
    action: {
      titre: 'Mettre en place un tableau de bord mensuel en trois lignes',
      duree: '2 mois',
      detail: 'Trésorerie, carnet de commandes, marge. Trois chiffres, le 5 de chaque mois. Votre expert-comptable peut l’automatiser.',
    },
  },

  // Axe Processus (4 questions)
  {
    id: 'proc1',
    axe: 'proc',
    texte: 'Vos façons de faire sont-elles écrites quelque part ?',
    options: ['Tout est dans ma tête', 'Quelques fiches, pas toujours à jour', 'Un manuel à jour que l’équipe utilise'],
    action: {
      titre: 'Écrire les 3 processus que vous seul connaissez',
      duree: '3 mois',
      detail: 'Du devis à la facture, la réception d’un chantier, la gestion d’une réclamation. Une page chacun, dictée puis relue.',
    },
  },
  {
    id: 'proc2',
    axe: 'proc',
    texte: 'Un nouvel embauché devient autonome en combien de temps ?',
    options: ['Très longtemps, il faut tout lui montrer', 'Quelques mois, en me regardant faire', 'Quelques semaines, grâce au manuel et à l’équipe'],
    action: {
      titre: 'Construire un parcours d’intégration de 30 jours',
      duree: '2 mois',
      detail: 'Qui montre quoi, quelle semaine. Le prochain embauché le suit et le corrige.',
    },
  },
  {
    id: 'proc3',
    axe: 'proc',
    texte: 'Qui sait où sont les informations clés (tarifs fournisseurs, contacts, mots de passe, plans) ?',
    options: ['Moi seul', 'Moi et une personne', 'Elles sont rangées et accessibles à l’équipe'],
    action: {
      titre: 'Centraliser les informations clés dans un espace partagé',
      duree: '1 mois',
      detail: 'Un dossier commun, une arborescence simple, un gestionnaire de mots de passe d’équipe.',
    },
  },
  {
    id: 'proc4',
    axe: 'proc',
    texte: 'La qualité du travail est contrôlée :',
    options: ['Par moi, à l’œil', 'Par moi, avec une liste de points', 'Par l’équipe, avec des points de contrôle écrits'],
    action: {
      titre: 'Rédiger une liste de contrôle par type de prestation',
      duree: '2 mois',
      detail: 'Dix points maximum, cochés par celui qui fait, vérifiés par un autre. Vous n’êtes plus le seul filet.',
    },
  },

  // Axe Équipe (4 questions)
  {
    id: 'team1',
    axe: 'team',
    texte: 'Y a-t-il dans l’équipe quelqu’un capable de prendre votre place demain ?',
    options: ['Non', 'Peut-être, avec de la formation', 'Oui, et c’est connu de tous'],
    action: {
      titre: 'Identifier et former un second',
      duree: '12 mois',
      detail: 'Pas forcément le plus ancien : celui que les autres écoutent. Un domaine à la fois, avec un point mensuel.',
    },
  },
  {
    id: 'team2',
    axe: 'team',
    texte: 'Vos personnes clés sont-elles fidélisées ?',
    options: ['Il y a un risque qu’une personne clé s’en aille', 'Bonne ambiance, rien de formel', 'Intéressement, participation ou évolution formalisés'],
    action: {
      titre: 'Mettre en place une prime d’intéressement pour les personnes clés',
      duree: '6 mois',
      detail: 'Un accord simple, calé sur un indicateur que l’équipe comprend. Votre expert-comptable le rédige.',
    },
  },
  {
    id: 'team3',
    axe: 'team',
    texte: 'Les décisions du quotidien (planning, achats courants, réponse client) sont prises :',
    options: ['Toutes par moi', 'Par moi, sauf quelques-unes déléguées', 'Par l’équipe, dans un cadre que j’ai fixé'],
    action: {
      titre: 'Déléguer une famille de décisions avec un plafond clair',
      duree: '3 mois',
      detail: 'Par exemple : achats courants jusqu’à 2 000 €, planning de la semaine. Écrit sur une page, affiché.',
    },
  },
  {
    id: 'team4',
    axe: 'team',
    texte: 'Les rôles et responsabilités de chacun sont :',
    options: ['Implicites', 'Connus mais pas écrits', 'Écrits dans un organigramme à jour'],
    action: {
      titre: 'Dessiner l’organigramme réel et le partager',
      duree: '1 mois',
      detail: 'Qui fait quoi, qui remplace qui. Une page, revue chaque trimestre.',
    },
  },

  // Axe Juridique et actifs (4 questions)
  {
    id: 'jur1',
    axe: 'jur',
    texte: 'Bail, statuts, assurances, marques : où en êtes-vous ?',
    options: ['Je ne sais pas trop', 'À jour, mais dispersés', 'À jour et réunis au même endroit'],
    action: {
      titre: 'Réunir les documents juridiques dans un dossier unique',
      duree: '2 mois',
      detail: 'Statuts, Kbis, bail, assurances, contrats de travail, marques. Un dossier, une liste de ce qui manque.',
    },
  },
  {
    id: 'jur2',
    axe: 'jur',
    texte: 'Votre bail commercial (si vous êtes locataire) court encore :',
    options: ['Moins de 3 ans, ou je ne sais pas', 'Entre 3 et 6 ans', 'Plus de 6 ans, ou je suis propriétaire'],
    action: {
      titre: 'Renégocier ou renouveler le bail avant l’échéance',
      duree: '6 mois',
      detail: 'Un bail court fragilise toute l’entreprise. Anticipez le renouvellement 18 mois avant.',
    },
  },
  {
    id: 'jur3',
    axe: 'jur',
    texte: 'Les murs de l’entreprise :',
    options: ['Appartiennent à la société d’exploitation', 'Je ne sais pas / situation mixte', 'Sont dans une structure séparée, ou loués'],
    action: {
      titre: 'Étudier la séparation des murs et de l’exploitation',
      duree: '12 mois',
      detail: 'Avec votre expert-comptable et un notaire. Cela clarifie la lecture de l’entreprise et de votre patrimoine.',
    },
  },
  {
    id: 'jur4',
    axe: 'jur',
    texte: 'Y a-t-il des litiges, contrôles ou contentieux en cours ou récents ?',
    options: ['Oui, non réglés', 'Oui, réglés ou en cours de règlement', 'Non'],
    action: {
      titre: 'Régler ou documenter chaque litige en cours',
      duree: '6 mois',
      detail: 'Ce qui n’est pas réglé doit au moins être écrit : nature, montant, état. Un tiers préfère un problème connu à une zone d’ombre.',
    },
  },
];

/** Ordre de priorité pour la première action de l’axe Dépendance (spec 2.5). */
export const PRIORITE_DEPENDANCE: readonly string[] = ['dep4', 'dep5', 'dep1', 'dep2', 'dep3', 'dep6'];

export const LIBELLES_SCORE: readonly { min: number; libelle: string }[] = [
  { min: 0, libelle: 'fragile' },
  { min: 40, libelle: 'en construction' },
  { min: 60, libelle: 'solide' },
  { min: 80, libelle: 'transmissible' },
];

export const LIBELLES_DEPENDANCE: readonly { min: number; libelle: string }[] = [
  { min: 0, libelle: 'L’entreprise tourne sans vous' },
  { min: 26, libelle: 'L’équipe porte une partie' },
  { min: 51, libelle: 'Vous êtes encore au centre' },
  { min: 76, libelle: 'L’entreprise, c’est vous' },
];

/** Paliers de décote de valeur liée à la dépendance (spec 2.3, ordre de grandeur praticien). */
export const PALIERS_DECOTE: readonly { min: number; niveau: string; fourchette: string; pctMoyen: number }[] = [
  { min: 0, niveau: 'faible', fourchette: '0 à 5 %', pctMoyen: 2 },
  { min: 26, niveau: 'modérée', fourchette: '5 à 15 %', pctMoyen: 10 },
  { min: 51, niveau: 'forte', fourchette: '15 à 25 %', pctMoyen: 20 },
  { min: 76, niveau: 'très forte', fourchette: '25 à 30 % et plus', pctMoyen: 28 },
];

/**
 * Alertes à seuil (spec « Repérer les points qui bloqueront une reprise », §2.1 et §3).
 * Les délais de correction sont des fourchettes fixes en mois, en configuration (pas en dur dans le
 * moteur), affichées comme ordre de grandeur, au même titre que les paliers de décote.
 */
export type AlerteId = 'concentration-clients' | 'aucun-relais' | 'outil-vieilli';

export type ActionAlerte = {
  titre: string;
  pourquoi: string;
  duree: string;
  detail: string;
  /** Première micro-étape, 15 à 30 minutes (pain « très peu de temps à y consacrer »). */
  premiereEtape: string;
};

export type DefinitionAlerte = {
  id: AlerteId;
  titre: string;
  /** Délai réaliste de correction, en mois. */
  delai: { min: number; max: number };
  fait: string;
  pourquoi: string;
  action: ActionAlerte;
};

export const ALERTES: Readonly<Record<AlerteId, DefinitionAlerte>> = {
  'concentration-clients': {
    id: 'concentration-clients',
    titre: 'Trois clients font votre chiffre',
    delai: { min: 18, max: 36 },
    fait: 'Vos trois plus gros clients représentent plus de 40 % de votre chiffre d’affaires.',
    pourquoi:
      'Si l’un d’eux s’en va, l’entreprise vacille. Un lecteur extérieur y voit un risque avant d’y voir un actif, et la valeur en tient compte.',
    action: {
      titre: 'Gagner de nouveaux clients réguliers pour diluer les trois premiers',
      pourquoi: 'Chaque nouveau client régulier réduit le poids des trois premiers et rend le chiffre d’affaires plus solide.',
      duree: '18 à 36 mois',
      detail:
        'Objectif : vos trois premiers clients sous 30 % du chiffre d’affaires. Commencez par les prescripteurs qui vous envoient déjà du travail, puis un contrat annuel aux clients qui reviennent.',
      premiereEtape: 'Listez vos dix premiers clients avec leur part du chiffre d’affaires de l’an dernier (20 minutes, avec votre dernier bilan).',
    },
  },
  'aucun-relais': {
    id: 'aucun-relais',
    titre: 'Personne ne peut tenir la barre sans vous',
    delai: { min: 12, max: 24 },
    fait: 'Sans vous pendant trois semaines, l’activité s’arrête ou tourne au ralenti, et personne n’est prêt à vous seconder.',
    pourquoi:
      'Tant que l’activité tient à votre présence, sa valeur dépend de vous. Un relais formé est ce qui la rend autonome.',
    action: {
      titre: 'Former un second capable de tenir l’activité trois semaines',
      pourquoi: 'Un second en situation change la lecture de l’entreprise : elle fonctionne, même sans vous.',
      duree: '12 à 24 mois',
      detail:
        'Pas forcément le plus ancien : celui que les autres écoutent. Confiez-lui un domaine entier (planning, achats, relation fournisseurs) avec le droit de décider sans vous demander, puis une semaine d’absence réelle, puis deux, puis trois.',
      premiereEtape: 'Écrivez le nom de la personne la plus crédible pour vous seconder et le premier domaine que vous lui confiez (15 minutes).',
    },
  },
  'outil-vieilli': {
    id: 'outil-vieilli',
    titre: 'L’outil de travail prend de l’âge',
    delai: { min: 12, max: 36 },
    fait: 'Votre dernier investissement significatif date de plus de trois ans.',
    pourquoi:
      'Un outil vieilli se lit dans les comptes et sur le terrain : il annonce des dépenses à venir et pèse sur la valeur.',
    action: {
      titre: 'Planifier le renouvellement de l’outil de travail le plus ancien',
      pourquoi: 'Un plan d’investissement sur trois ans, même modeste, montre une entreprise entretenue plutôt qu’une entreprise qui s’use.',
      duree: '12 à 36 mois',
      detail:
        'Listez ce qui est le plus ancien, estimez le coût de remplacement avec votre expert-comptable, et étalez les achats sur trois ans.',
      premiereEtape: 'Notez vos cinq équipements les plus anciens avec leur année d’achat (20 minutes).',
    },
  },
};

/** Variantes de texte selon la situation du dirigeant (spec §3). */
export const VARIANTES_ALERTES = {
  /** Dirigeant seul, sans salarié : A2 reformulée, action orientée documentation (prépare le Savoir-faire). */
  aucunRelaisSeul: {
    titre: 'Votre activité, c’est vous',
    fait: 'Vous n’avez pas de salarié : sans vous, l’activité s’arrête.',
    pourquoi:
      'Tant que votre savoir-faire n’existe que dans votre tête, l’entreprise n’a pas de valeur en dehors de vous. L’écrire est ce qui lui en donne une.',
    action: {
      titre: 'Documenter votre savoir-faire, une fiche à la fois',
      pourquoi: 'Un savoir-faire écrit peut être transmis, appris et vérifié par quelqu’un d’autre.',
      duree: '12 à 24 mois',
      detail:
        'Une fiche par étape de votre métier, écrite à partir de ce que vous dites en travaillant : du premier contact au règlement. Une fiche par semaine suffit.',
      premiereEtape: 'Listez les dix gestes ou décisions que vous seul savez faire (15 minutes).',
    },
  },
  /** Co-dirigeants : A2 évaluée hors vous et votre associé(e), comme Q1 à Q3 de l'indice. */
  aucunRelaisCoDirigeants: {
    fait: 'Sans vous ni votre associé(e) pendant trois semaines, l’activité s’arrête ou tourne au ralenti, et personne d’autre n’est prêt à prendre le relais.',
  },
  /** Activité de services : A3 porte sur les logiciels, le site et l'équipement informatique. */
  outilVieilliServices: {
    fait: 'Votre dernier investissement significatif (logiciels, site, équipement informatique) date de plus de trois ans.',
    pourquoi:
      'Des outils numériques vieillis se voient de l’extérieur : ils annoncent des dépenses à venir et pèsent sur la valeur.',
    action: {
      titre: 'Planifier le renouvellement de vos outils numériques',
      pourquoi: 'Un plan de mise à niveau sur trois ans, même modeste, montre une entreprise entretenue.',
      duree: '12 à 36 mois',
      detail:
        'Listez logiciels, site et équipement informatique avec leur âge, estimez le coût de mise à niveau, et étalez les achats sur trois ans.',
      premiereEtape: 'Notez vos cinq outils numériques les plus anciens avec leur année de mise en place (20 minutes).',
    },
  },
} as const;

/** « Je ne sais pas » sur A1 ou A3 : point à éclaircir, avec la question à poser à l'expert-comptable (spec §3). */
export const QUESTIONS_A_ECLAIRCIR: Readonly<Record<'concentration-clients' | 'outil-vieilli', { titre: string; question: string }>> = {
  'concentration-clients': {
    titre: 'La part de vos trois premiers clients est à éclaircir',
    question: 'Demandez à votre expert-comptable la part de vos trois premiers clients dans le chiffre d’affaires de l’an dernier.',
  },
  'outil-vieilli': {
    titre: 'La date de votre dernier investissement est à éclaircir',
    question: 'Demandez à votre expert-comptable la date et le montant de votre dernier investissement significatif (tableau des immobilisations).',
  },
};

/** Secteurs considérés comme activité de services, sans outil de production (spec §3). */
export const SECTEURS_SERVICES: readonly string[] = ['Services aux entreprises'];

export const CONTEXTE = {
  secteurs: [
    'Bâtiment et travaux',
    'Services aux entreprises',
    'Commerce et négoce',
    'Industrie et artisanat de production',
    'Santé et professions réglementées',
    'Hôtellerie, restauration, tourisme',
    'Autre',
  ],
  effectifs: ['Moi seul', '1 à 2 salariés', '3 à 9 salariés', '10 à 30 salariés', 'Plus de 30 salariés'],
  chiffres: ['Moins de 100 k€', '100 à 300 k€', '300 k€ à 1 M€', '1 à 5 M€', 'Plus de 5 M€'],
} as const;
