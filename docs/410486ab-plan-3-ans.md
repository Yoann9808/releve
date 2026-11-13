# 410486ab · Plan d'actions à 3 ans, première livraison

**Feature Notion** : « Transformer mon score en plan d'actions à 3 ans, avec le temps qu'il me reste affiché » (P0, spec v1 du 11 nov. 2026, propriété Spec de la feature). La spec complète est dans Notion ; ce fichier dit ce qui est livré dans cette PR et ce qui reste.

## Ce qui est livré

- **Horizon (§2.1)** : après l'enregistrement du résultat par e-mail, une seule question sur l'écran de résultat, « À quel horizon voulez-vous que l'entreprise tourne sans vous ? » (1 an / 2 ans / 3 ans / 5 ans ou plus / je ne sais pas encore), modifiable à tout moment depuis le résultat et depuis `/plan`. « Je ne sais pas encore » vaut 3 ans, affiché comme hypothèse.
- **Temps restant (§2.2)** : en tête de `/plan`, les mois restants face au délai le plus long parmi les alertes actives, avec les trois états (« vous avez le temps » ≥ délai + 6 mois, « c'est le moment », « il faut démarrer maintenant »). Sans alerte, seul le temps restant s'affiche. Le temps restant alimente aussi le bloc des alertes du résultat (`moisRestants`, prévu par la PR #5).
- **Catalogue (§2.3)** : `lib/plan/catalogue.ts`, configuration de 26 actions (une par question du score), chacune avec sa durée indicative, ses prérequis, son applicabilité sans salarié (et l'action de documentation ou de formalisation qui la remplace), et ses micro-étapes de 15 à 30 minutes. Le titre et le détail viennent de la question ou de l'alerte, pour que les trois premières actions soient identiques à celles du résultat.
- **Génération (§2.3)** : `lib/plan/engine.ts`, fonction pure `genererPlan` : sélection depuis les sous-scores, l'indice de dépendance et les alertes ; séquencement sur 12 trimestres, 1 à 2 débuts par trimestre, jamais plus de 3 en cours, prérequis respectés ; effet attendu sur l'axe et le score global ; mode accéléré (plus courtes d'abord) quand l'horizon est plus court que le délai le plus long, avec la ligne honnête de la spec.
- **Gratuit / payant (§2.4)** : `lib/plan/acces.ts`, `planVisible` ne laisse sortir du serveur que les trois premières actions en entier ; les autres n'ont que titre, axe, durée, trimestres (test automatisé : aucun détail ni étape d'une 4e action dans la réponse). L'aperçu est flouté côté écran et un bloc « Débloquer mon plan complet et le suivi trimestriel » est affiché, **sans paiement** (voir plus bas).
- **Suivi local** : micro-étapes cochables en un geste, action « marquée faite » (conservée, plus séquencée), horizon et cases gardés sur l'appareil (`lib/plan/stockage.ts`), comme le brouillon du score. Score refait : plan recalculé, cases conservées, actions devenues inutiles archivées et visibles ; l'ordre du dernier séquencement est conservé pendant 7 jours (§3).
- **API** : `POST /api/plan` recalcule tout côté serveur à partir des réponses (aucun score ni plan envoyé par le navigateur n'est lu), `Cache-Control: private, no-store`, `/plan` en noindex.
- **Événements** : `horizon_set`, `plan_viewed`, `paywall_viewed`, `action_step_done` (ignorés sans clé PostHog).
- **Tests** : `lib/plan/plan.test.ts` (24 tests) : catalogue (20 à 30 actions, 6 axes, étapes 15-30 min, prérequis sans cycle), chaque état du temps, aucune alerte, trois alertes, dirigeant seul, horizon inconnu, horizon 1 an, contraintes de séquencement, score refait, ordre précédent, re-séquencement hebdomadaire, effet attendu, frontière gratuit / payant, validation. Le test de vocabulaire couvre désormais `lib/plan`, `app/plan` et `app/api/plan`.

## Ce qui n'est pas livré (PR suivantes)

- **Stripe Checkout, webhook et table `abonnements` (§2.4)** : le prix et la périodicité ne sont pas décidés (spec §7) et le plan n'est pas encore rattaché à un compte. `lib/plan/abonnement.ts` est le point d'entrée : il répond « aucun abonnement » tant que le webhook n'existe pas. Le bouton « Débloquer » est affiché mais inactif (« Bientôt disponible »). `checkout_started`, `subscription_created`, `subscription_ended` ne sont pas émis.
- **Rattachement au compte (étape B, PR #6)** : l'horizon et le suivi vivent sur l'appareil. Quand l'étape B sera mergée, les stocker en base avec le résultat.
- **Suivi trimestriel (§2.5)** : e-mail Resend à J+90, comparaison des scores, courbe d'historique. Dépend de l'étape B et de l'abonnement.
- **Partage du plan (§2.6)** : suit la règle du score, après l'étape B.
- **Relecture du catalogue par un expert-comptable** (critère §4, hors code).
- **Lighthouse ≥ 90** : à vérifier sur la preview Vercel (l'environnement de l'agent n'a pas accès à npm, donc pas de build local).

## Décisions prises par l'agent, à confirmer

- Les prérequis ne retiennent pas les trois actions du résultat : elles sont déjà recommandées « par où commencer » et doivent rester cochables tout de suite.
- Une action issue d'une alerte dure au moins le délai minimal de l'alerte (ex. 18 mois pour la concentration clients).
- Pour un dirigeant seul, les trois actions du résultat sont reprises telles quelles (cohérence avec l'écran de résultat) ; le remplacement par de la documentation s'applique aux actions suivantes.
- Les actions qui ne tiennent pas dans les 12 trimestres sont listées « Après les trois ans », titres seulement.
- Horizon modifiable depuis `/plan` par une liste déroulante ; chaque changement est un nouveau choix (date remise à aujourd'hui).

## Comment tester à la main (preview Vercel)

1. Faire le point sur `/score`, demander le résultat par e-mail avec l'adresse du compte Resend : la question d'horizon apparaît sous le bloc « C'est envoyé ».
2. Choisir « Dans 1 an » : le bloc des alertes affiche « Il vous reste environ 12 mois » et « À lancer maintenant » ; cliquer « Voir mon plan à 3 ans ».
3. Sur `/plan` : ligne de temps, état « Il faut démarrer maintenant » (si une alerte est active), ligne honnête, trimestres. Les trois premières actions ont leurs micro-étapes cochables ; les suivantes sont floutées avec le bloc « Débloquer ».
4. Cocher une étape, recharger la page : la case reste cochée. « Marquer l'action comme faite » : l'action passe dans « Fait » et le plan se re-séquence.
5. Modifier l'horizon vers « Dans 5 ans ou plus » : l'état passe à « Vous avez le temps », l'ordre des actions reste celui du premier séquencement (moins de 7 jours).
6. Dans l'onglet Réseau, ouvrir la réponse de `POST /api/plan` : les actions `verrouillee: true` n'ont ni `detail` ni `etapes`.
7. Refaire le point avec une question en plus au maximum : sur le résultat, l'horizon est déjà connu ; sur `/plan`, l'action correspondante est dans « Archivées », les cases cochées sont conservées.
8. Dirigeant seul (« Moi seul ») : aucune action de délégation hors des trois premières.
