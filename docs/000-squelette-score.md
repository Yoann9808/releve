# 000 · Squelette de l'app et parcours Score sans compte

**Features Notion couvertes** : « Obtenir mon score de transmissibilité seul, en 20 minutes, sans créer de compte » (Spécifiée) et « Voir à quel point mon entreprise repose sur moi et la décote que cela représente » (Spécifiée). Les specs complètes sont dans la propriété Spec de chaque feature.

## Ce qui est livré

- Parcours `/score` : 3 questions de contexte (secteur, effectif, CA en fourchettes), puis 26 questions une par écran (6 axes, 6 questions sur la dépendance, 4 sur chaque autre axe), option « Je ne sais pas » partout, barre de progression par axe, sauvegarde locale 30 jours avec reprise, repartir de zéro.
- Résultat affiché sans aucun champ à remplir : bloc dépendance en tête (indice 0-100, libellé, palier de décote en %, phrase de liaison, première action), score global et libellé, six axes, alertes à seuil, trois actions gratuites avec détail, points à éclaircir, bandeau hors cible.
- Moteur de calcul en fonctions pures, 14 tests (extrêmes, « je ne sais pas », frontières de paliers, ordre de priorité, dirigeant seul, incohérence, hors cible).
- Test de vocabulaire : aucun mot lié à la vente dans le contenu ni dans les écrans.
- Événements analytics émis (score_started, axe_completed, score_abandoned, score_displayed, dependency_block_viewed, dependency_action_opened), ignorés tant qu'aucune clé PostHog n'est configurée.
- `/score` en noindex.

## Ce qui n'est pas livré (PR suivantes)

- Enregistrement par e-mail (lien magique Supabase), e-mail Resend, historique des scores, lien de partage révocable (spec 2.5 à 2.7). Le bloc est affiché comme « Bientôt disponible ».
- SDK PostHog.
- Les alertes bloquantes sont une version préliminaire : la feature « Repérer les points qui bloqueront une reprise » est Validée mais pas encore Spécifiée. À aligner sur la spec quand elle existera.
- Pondération ×1,5 de Q4/Q5 (paramètre prévu, non activé, en attente des entretiens terrain).
- Relecture des 6 questions de dépendance et des paliers par un expert-comptable (critère d'acceptation de la spec, hors code).

## Points à valider par Yoann (issus de la spec)

- Paliers de décote 0-5 / 5-15 / 15-25 / 25-30 % affichés comme « ordre de grandeur » : OK pour la v1 ?
- Décote en % seulement (fait) ou aussi en € plus tard : à trancher avec la feature « fourchette de valeur ».

## Comment tester à la main

1. `npm install && npm run dev`, ouvrir http://localhost:3000
2. Cliquer « Faire le point sur mon entreprise », remplir le contexte, répondre aux 26 questions (environ 5 minutes en test).
3. Fermer l'onglet en cours de route, rouvrir `/score` : la reprise se fait à la question suivante.
4. Vérifier dans l'onglet Réseau qu'aucune requête ne part avec les réponses.
5. Tester un dirigeant seul (effectif « Moi seul ») : la phrase et la première action parlent de documentation.
6. Tester « Plus de 30 salariés » : bandeau hors cible, score calculé quand même.
