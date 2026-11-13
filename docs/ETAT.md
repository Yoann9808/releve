# État du projet Relève

Mis à jour le 13 novembre 2026 (agent Développeur). Ce fichier est la passation entre les sessions (Claude Code, agents nocturnes, conversations claude.ai). Mets-le à jour à la fin de chaque session qui change l'état du projet.

## Où sont les choses

| Quoi | Où |
|---|---|
| Code, PR, CI | https://github.com/Yoann9808/releve (branche `main` = production) |
| Production | Vercel, projet connecté au dépôt ; chaque merge sur `main` déploie |
| Backlog features (RICE) | Notion, data source `collection://d2eae2a8-678c-451f-adc0-b459e36e15df` · https://app.notion.com/p/98140fa228d04f6bb76ac7469e128bb8 |
| Pains terrain (sources) | Notion, `collection://a99dfd58-1e88-4678-9a0a-e6d098341cb7` · https://app.notion.com/p/285c62382c914000ac858e60a89343c8 |
| Décisions produit | Notion, `collection://9183ab81-27a3-469f-ad47-eddbaf5d693c` · https://app.notion.com/p/c17dd22f45444caaa6229be3367084fd |
| Journal des agents | Notion, `collection://629f6e90-382d-455b-ba45-ecc0d1868ff2` |
| Espace Notion racine | https://app.notion.com/p/40f486abaa2b81a79377f57fbda0944d |
| Comptes rendus | Slack Alturia AI, canal #releve-agents (`C0CFBJM6DB3`) |
| Supabase | Organisation Alturia AI (`kufynspyfxcbebbgvrop`), projet `releve` (`qgcufrjyactycvkwyfxq`, eu-west-3 Paris), créé le 8 nov. 2026. Identifiants à vérifier dans `CONNECTORS.md` avant toute écriture. |
| Maquette de référence | `prototype/releve-maquette.html` |

## Agents nocturnes (tâches planifiées claude.ai, lundi à samedi)

| Agent | Heure | Rôle |
|---|---|---|
| Veille | 6h12 | Trouve des pains sourcés sur le web → Pains terrain |
| Produit | 7h41 | Qualifie les pains, crée des features RICE, rédige les specs des features « Validée » → « Spécifiée » |
| Développeur | 1h17 (mar-sam) | Prend la première feature « Spécifiée », code sur `feat/<slug>`, ouvre une PR, passe la feature « En revue ». Traite d'abord les commentaires de revue. |
| Qualité | 5h23 (mar-sam) | Relit chaque PR ouverte, poste « Revue Qualité » avec verdict PRÊT À MERGER / À CORRIGER / BLOQUANT |

Yoann : 20 minutes à 8h05 (agenda). Lit Slack, merge les PR PRÊT À MERGER, valide ou écarte les features, écrit les décisions.

## Livré

- PR #1 (mergée) : squelette Next.js 15 + parcours `/score` complet sans compte. Features « Obtenir mon score seul » et « Voir à quel point mon entreprise repose sur moi » : Livrées.
- PR #2 (mergée) : Next.js 15.5.7 (CVE-2025-66478), Node 22.x. Vercel bloquait la 15.5.6.
- PR #3 (mergée) : passation (ce fichier) et consignes Claude Code dans `CLAUDE.md`.

## En cours

- **PR #6 `feat/lien-magique` (étape B, ouverte par Yoann le 12 nov. 2026)** : en conflit avec `main` depuis le merge de la PR #5 (`app/r/[token]/page.tsx`), à rebaser par son auteur. L'agent Développeur n'y touche pas.
- **PR #4 `feat/resultat-email`, mergée le 9 nov. 2026** : étape A « recevoir son résultat par e-mail ». Testée de bout en bout par Yoann sur la preview le 8 nov. 2026 (e-mail reçu, lien `/r/` fonctionnel, ligne en base). Variables Vercel posées en Preview et Production. Base nettoyée des tests. **Agents : Qualité relit la PR ; Développeur ne reprend pas ce sujet.**

## Backlog, état au 8 novembre

- **En revue** : « Transformer mon score en plan d'actions à 3 ans, avec le temps qu'il me reste affiché » (P0, spec du 11 nov. 2026) : PR `feat/410486ab-plan-3-ans` de l'agent Développeur du 13 nov. 2026, première livraison (horizon, temps restant, catalogue, génération, aperçu gratuit / payant, suivi local). Voir `docs/410486ab-plan-3-ans.md`. Restent pour des PR suivantes : Stripe et la table `abonnements` (prix à décider, spec §7), le rattachement au compte (après la PR #6), l'e-mail trimestriel, le partage du plan.
- **En revue** : « Repérer les points qui bloqueront une reprise et le temps qu'il faut pour les corriger » (P0, spec du 11 nov. 2026) : PR `feat/410486ab-alertes-points-bloquants` de l'agent Développeur du 12 nov. 2026. Les questions `cli1` (3 premiers clients, seuil 40 %) et `fin3` (dernier investissement, seuil 3 ans) ont été reformulées en place ; le brouillon local passe en version 2. Le lien avec l'horizon (§2.3) est prêt côté moteur et écran (`moisRestants`), il sera branché par la feature Plan à 3 ans.
- **À valider** : savoir-faire par entretien vocal (P1), pré-audit comptes et contrats (P1), fourchette de valeur de marché (P1), data room au fil de l'eau (P1), vue cabinet / territoire pour prescripteurs (P1), garder le cap pendant la négociation (P2).

## Recevoir son résultat par e-mail

Correspond à la section 2.5 de la spec « Obtenir mon score seul ». Découpée en deux :

**Étape A : terminée et validée par Yoann le 8 nov. 2026** (PR #4, à merger) :
- `POST /api/resultat` (`app/api/resultat/route.ts`) : lien de l’e-mail construit par `lib/resultat/url.ts` (preview → adresse de la branche, production → domaine de production) ; valide e-mail, contexte et 26 réponses (`lib/resultat/validation.ts`), ignore tout score envoyé par le navigateur et recalcule, crée un jeton de 256 bits (`lib/resultat/token.ts`), enregistre dans Supabase, envoie l'e-mail Resend (`lib/resultat/email.ts`). Si l'e-mail échoue, la ligne est supprimée. Champ piège anti-robots.
- Page `/r/[token]` : résultat en lecture seule (photo figée), noindex, no-referrer, no-store ; « Ce lien n'est plus actif » si jeton inconnu, mal formé ou révoqué.
- Table `resultats` : migration `supabase/migrations/20261108000000_resultats.sql`, **appliquée le 8 nov. 2026** sur `releve`. Colonnes ajoutées à la spec : `resultat jsonb` (photo figée) et `revoque_le timestamptz`. RLS activée sans politique : seul le serveur (clé secrète) y accède.
- Supabase et Resend sont appelés par HTTP direct (`lib/resultat/serveur.ts`), sans SDK.
- `email_submitted` émis après envoi réussi (sans l'adresse). Rien ne part avant le clic.
- Variables : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, et `SITE_URL` facultative (voir `.env.example`).

**Après le merge de la PR #4** : vérifier en production avec l'adresse du compte Resend, puis supprimer la ligne de test dans `resultats`.

**Décisions du 8 nov. 2026 (Notion, Décisions produit)** : la page `/r/` montre une photo figée du résultat (pas de recalcul) ; aucune dépendance ajoutée à l'étape A (appels HTTP directs).

**Points ouverts, à faire avant les premiers vrais dirigeants** :
- **Domaine Resend** : les e-mails partent de `onboarding@resend.dev`, arrivent en indésirables et ne peuvent aller qu'à l'adresse du compte Resend. Il faut vérifier un domaine à Relève (à fournir par Yoann).
- **`releve-staging`** : un second projet Supabase pour les previews. Aujourd'hui, preview et production écrivent dans la même base.
- **Resend héberge hors de France** (UE/US) : à arbitrer dans une Décision produit au regard du rail « hébergement en France ».
- Pas de limite d'envois par visiteur hors champ piège (pare-feu Vercel si abus).

**Étape B (feature suivante)** : lien magique Supabase Auth qui rattache le résultat à un compte, historique des scores, lien de partage révocable (spec 2.5 à 2.7).

## Prochaine étape recommandée (à confirmer par Yoann)

- **Avec Yoann dans Claude Code** : étape B (lien magique Supabase Auth, historique des scores, lien de partage révocable, spec 2.5 à 2.7). C'est la fondation du suivi de progression.
- **Agents nocturnes** : continuer sur les deux P0 du backlog (spec par Produit, puis code par Développeur).

## Pièges connus

- L'environnement des agents claude.ai n'a pas accès au registre npm : ils ne peuvent pas lancer `next build`. La CI GitHub (`.github/workflows/ci.yml`) est la vérification de référence.
- Le test de vocabulaire (`lib/score/vocabulaire.test.ts`) interdit tout mot lié à la vente dans `lib/score`, `app/score`, `components`. Il a déjà attrapé « retraiter », « à partir de », « risque de départ ». Reformuler, ne pas affaiblir le test.
- Vercel bloque les versions de Next.js avec une vulnérabilité connue : vérifier les avis de sécurité avant d'épingler une version.
- Les imports relatifs dans `lib/` portent l'extension `.ts` (nécessaire au test runner natif de Node) ; `tsconfig` a `allowImportingTsExtensions`.
- Jamais d'`enum` TypeScript dans `lib/` (non supporté par `--experimental-strip-types`).
- En local, le dépôt est dans `Alturia-workspace/releve/releve/` (dossier imbriqué). Lancer Claude Code depuis ce sous-dossier.
- `package-lock.json` n'est pas suivi par git (la CI fait `npm install`). Ne pas le commiter sans décision.
