# Règles du dépôt Relève

Ce fichier s'applique à tout agent (et tout humain) qui travaille dans ce dépôt.

## Le produit

Relève est un SaaS pour dirigeants de TPE/PME françaises (50-65 ans) qui rend leur entreprise transmissible et pilote sa valeur, puis accompagne la cession. Product-led growth : le dirigeant s'inscrit, obtient son score de transmissibilité gratuitement, et paie seul. Les utilisateurs ont 55 ans en moyenne et ne sont pas des technophiles : lisibilité, calme et confiance passent avant tout.

La maquette `prototype/releve-maquette.html` est la référence d'identité visuelle et de parcours. Ne pas s'en écarter sans une Décision produit.

## Sources de vérité

- Les features à construire viennent du **Backlog features** Notion, statut « Validée » ou « Spécifiée » uniquement. Jamais d'une idée spontanée.
- Les arbitrages sont dans **Décisions produit** (Notion). Ils s'imposent. Pour en contester un, écrire une proposition dans le Journal des agents, ne pas le modifier.
- Une feature livrée passe en statut « En revue » dans Notion, avec le lien de la pull request dans la propriété Spec.

## Rails non négociables

1. **Jamais de merge sur `main` par un agent.** Tout passe par une branche `feat/<id-feature>-<slug>` et une pull request. Un humain merge.
2. **Jamais de déploiement en production par un agent.** Le déploiement est déclenché par le merge, validé par un humain.
3. **Tests obligatoires.** Une PR sans tests sur la logique métier (score, valorisation, droits d'accès) est refusée.
4. **Données clients** : hébergement en France, chiffrement au repos, accès par rôle (dirigeant, tiers de confiance en lecture limitée). Jamais de données réelles dans les tests ou les fixtures.
5. **Secrets** : jamais dans le code ni dans les commits. Variables d'environnement uniquement.
6. **Pas de dépendance ajoutée sans justification** dans la description de la PR.

## Comment un agent développeur travaille

1. Lit la feature dans Notion (statut Spécifiée), sa spec, ses pains liés.
2. Crée la branche, implémente, écrit les tests, vérifie que tout passe en local.
3. Ouvre la PR avec : le problème adressé, ce qui a été fait, ce qui n'a pas été fait, comment tester à la main, captures si UI.
4. Met la feature en « En revue » dans Notion avec le lien de la PR.
5. Poste un compte rendu dans Slack #releve-agents et dans le Journal des agents.
6. Si bloqué : s'arrête, documente le blocage, ne contourne pas.

## Style de code

TypeScript strict. Composants simples, pas d'abstraction prématurée. Textes d'interface en français, tutoiement proscrit (on vouvoie le dirigeant). Formats français : `1 420 k€`, dates `12 oct. 2026`.

## Quand Yoann travaille dans Claude Code (VS Code)

Yoann pilote le produit, il ne code pas lui-même. Dans Claude Code, il te demandera de construire, corriger ou expliquer. Les mêmes rails s'appliquent à toi qu'aux agents nocturnes, avec une différence : Yoann est présent, donc pose-lui la question quand un arbitrage produit se présente, au lieu de le marquer « À valider ». Quand il tranche, enregistre la décision dans Notion (Décisions produit) pour que les agents la respectent.

Avant de commencer une tâche, lis `docs/ETAT.md` : c'est l'état du projet, les identifiants Notion et la prochaine étape. Mets-le à jour à la fin de chaque session qui change l'état du projet.

Les agents nocturnes (Veille, Produit, Développeur, Qualité) continuent de tourner pendant que Yoann travaille dans Claude Code. Pour éviter de coder la même feature qu'eux : vérifie les PR ouvertes et les features « En revue » avant de commencer, et si tu prends une feature, passe-la toi-même en « En revue » dans Notion dès que ta PR est ouverte.
