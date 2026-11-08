# État du projet Relève

Mis à jour le 8 novembre 2026 (fin de session Claude Code). Ce fichier est la passation entre les sessions (Claude Code, agents nocturnes, conversations claude.ai). Mets-le à jour à la fin de chaque session qui change l'état du projet.

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

- **Branche `feat/resultat-email`, PR en brouillon** : étape A « recevoir son résultat par e-mail », code terminé (session Claude Code du 8 nov. 2026). Tests, types et build passent en local. **Ne pas merger** tant que Supabase et Resend ne sont pas configurés : sans eux, le formulaire affiche une erreur en production. **Agents : ne pas reprendre ce sujet**, il est piloté par Yoann dans Claude Code.

## Backlog, état au 8 novembre

- **Validée, à spécifier par l'agent Produit** : « Transformer mon score en plan d'actions à 3 ans » (P0), « Repérer les points qui bloqueront une reprise » (P0 ; une version préliminaire des alertes existe déjà dans `lib/score/engine.ts`, à aligner sur la spec).
- **À valider** : savoir-faire par entretien vocal (P1), pré-audit comptes et contrats (P1), fourchette de valeur de marché (P1), data room au fil de l'eau (P1), vue cabinet / territoire pour prescripteurs (P1), garder le cap pendant la négociation (P2).

## Prochaine étape décidée avec Yoann : recevoir son résultat par e-mail

Correspond à la section 2.5 de la spec « Obtenir mon score seul ». Découpée en deux :

**Étape A : codée, en attente des prérequis** (branche `feat/resultat-email`) :
- `POST /api/resultat` (`app/api/resultat/route.ts`) : lien de l’e-mail construit par `lib/resultat/url.ts` (preview → adresse de la branche, production → domaine de production) ; valide e-mail, contexte et 26 réponses (`lib/resultat/validation.ts`), ignore tout score envoyé par le navigateur et recalcule, crée un jeton de 256 bits (`lib/resultat/token.ts`), enregistre dans Supabase, envoie l'e-mail Resend (`lib/resultat/email.ts`). Si l'e-mail échoue, la ligne est supprimée. Champ piège anti-robots.
- Page `/r/[token]` : résultat en lecture seule (photo figée), noindex, no-referrer, no-store ; « Ce lien n'est plus actif » si jeton inconnu, mal formé ou révoqué.
- Table `resultats` : migration `supabase/migrations/20261108000000_resultats.sql`, **appliquée le 8 nov. 2026** sur `releve`. Colonnes ajoutées à la spec : `resultat jsonb` (photo figée) et `revoque_le timestamptz`. RLS activée sans politique : seul le serveur (clé secrète) y accède.
- Supabase et Resend sont appelés par HTTP direct (`lib/resultat/serveur.ts`), sans SDK.
- `email_submitted` émis après envoi réussi (sans l'adresse). Rien ne part avant le clic.
- Variables : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, et `SITE_URL` facultative (voir `.env.example`).

**Pour finir l'étape A, dans l'ordre** : 1) ~~créer le projet Supabase `releve`~~ fait ; 2) ~~appliquer la migration~~ fait ; 3) compte Resend + clé ; 4) variables dans Vercel ; 5) test de bout en bout sur la preview de la PR ; 6) sortir la PR du brouillon, puis merge.

**Décisions du 8 nov. 2026 (Notion, Décisions produit)** : la page `/r/` montre une photo figée du résultat (pas de recalcul) ; aucune dépendance ajoutée à l'étape A (appels HTTP directs).

**Points ouverts** : Resend héberge hors de France (UE/US), à arbitrer au regard du rail « hébergement en France » ; pas de limite d'envois par visiteur hors champ piège (pare-feu Vercel si abus).

**Étape B (feature suivante)** : lien magique Supabase Auth qui rattache le résultat à un compte, historique des scores, lien de partage révocable (spec 2.5 à 2.7).

**Prérequis côté Yoann restants** : créer un compte Resend et mettre la clé dans Vercel, avec les variables Supabase (voir `.env.example`).

## Pièges connus

- L'environnement des agents claude.ai n'a pas accès au registre npm : ils ne peuvent pas lancer `next build`. La CI GitHub (`.github/workflows/ci.yml`) est la vérification de référence.
- Le test de vocabulaire (`lib/score/vocabulaire.test.ts`) interdit tout mot lié à la vente dans `lib/score`, `app/score`, `components`. Il a déjà attrapé « retraiter », « à partir de », « risque de départ ». Reformuler, ne pas affaiblir le test.
- Vercel bloque les versions de Next.js avec une vulnérabilité connue : vérifier les avis de sécurité avant d'épingler une version.
- Les imports relatifs dans `lib/` portent l'extension `.ts` (nécessaire au test runner natif de Node) ; `tsconfig` a `allowImportingTsExtensions`.
- Jamais d'`enum` TypeScript dans `lib/` (non supporté par `--experimental-strip-types`).
- En local, le dépôt est dans `Alturia-workspace/releve/releve/` (dossier imbriqué). Lancer Claude Code depuis ce sous-dossier.
- `package-lock.json` n'est pas suivi par git (la CI fait `npm install`). Ne pas le commiter sans décision.
