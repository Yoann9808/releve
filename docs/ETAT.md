# État du projet Relève

Mis à jour le 8 novembre 2026. Ce fichier est la passation entre les sessions (Claude Code, agents nocturnes, conversations claude.ai). Mets-le à jour à la fin de chaque session qui change l'état du projet.

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
| Supabase | Organisation Alturia AI (`kufynspyfxcbebbgvrop`). Pas encore de projet `releve` : le forfait gratuit est au maximum (2 projets en pause, OOTI et leadbip). |
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

## Backlog, état au 8 novembre

- **Validée, à spécifier par l'agent Produit** : « Transformer mon score en plan d'actions à 3 ans » (P0), « Repérer les points qui bloqueront une reprise » (P0 ; une version préliminaire des alertes existe déjà dans `lib/score/engine.ts`, à aligner sur la spec).
- **À valider** : savoir-faire par entretien vocal (P1), pré-audit comptes et contrats (P1), fourchette de valeur de marché (P1), data room au fil de l'eau (P1), vue cabinet / territoire pour prescripteurs (P1), garder le cap pendant la négociation (P2).

## Prochaine étape décidée avec Yoann : recevoir son résultat par e-mail

Correspond à la section 2.5 de la spec « Obtenir mon score seul ». Découpée en deux :

**Étape A (à faire maintenant)** : après le résultat, un champ e-mail « Garder ce résultat et le recevoir par e-mail ». À la validation :
1. Route serveur `POST /api/resultat` : reçoit contexte + réponses + e-mail, recalcule le résultat côté serveur (ne jamais faire confiance au score envoyé par le client), enregistre dans Supabase (table `resultats` : id uuid, token non devinable, email, contexte jsonb, reponses jsonb, score int, indice_dependance int, created_at), envoie un e-mail Resend avec le score, la décote, les 3 actions et le lien `/r/<token>`.
2. Page `/r/[token]` : affiche le résultat en lecture seule, noindex, « ce lien n'est plus actif » si token inconnu ou révoqué.
3. Événement analytics `email_submitted`.
4. Aucune donnée envoyée au serveur avant le clic (critère de la spec).
5. Variables d'environnement (Vercel) : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement), `RESEND_API_KEY`, `RESEND_FROM` (ex. `Relève <onboarding@resend.dev>` tant qu'aucun domaine n'est vérifié : Resend n'envoie alors qu'à l'adresse du compte).

**Étape B (feature suivante)** : lien magique Supabase Auth qui rattache le résultat à un compte, historique des scores, lien de partage révocable (spec 2.5 à 2.7).

**Prérequis côté Yoann** : libérer une place Supabase (supprimer OOTI ou leadbip, ou passer en Pro) puis créer le projet `releve` en `eu-west-3` (Paris) ; créer un compte Resend et mettre la clé dans Vercel.

## Pièges connus

- L'environnement des agents claude.ai n'a pas accès au registre npm : ils ne peuvent pas lancer `next build`. La CI GitHub (`.github/workflows/ci.yml`) est la vérification de référence.
- Le test de vocabulaire (`lib/score/vocabulaire.test.ts`) interdit tout mot lié à la vente dans `lib/score`, `app/score`, `components`. Il a déjà attrapé « retraiter », « à partir de », « risque de départ ». Reformuler, ne pas affaiblir le test.
- Vercel bloque les versions de Next.js avec une vulnérabilité connue : vérifier les avis de sécurité avant d'épingler une version.
- Les imports relatifs dans `lib/` portent l'extension `.ts` (nécessaire au test runner natif de Node) ; `tsconfig` a `allowImportingTsExtensions`.
- Jamais d'`enum` TypeScript dans `lib/` (non supporté par `--experimental-strip-types`).
