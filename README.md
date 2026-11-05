# Relève

Le cockpit de transmissibilité des TPE. Relève rend une entreprise transmissible et pilote sa valeur sur 2-3 ans, puis accompagne la cession.

**Cible** : dirigeants de 50 à 65 ans, TPE/PME de 3 à 30 salariés, 300 k€ à 5 M€ de CA. Beachhead : Hérault.

**Modules** (ordre de construction) : Score de transmissibilité → Plan → Savoir-faire → Data room → Cession.

## Contenu du dépôt

- `prototype/releve-maquette.html` : maquette interactive cliquable (identité visuelle, six vues, logique de score et de valorisation). Référence pour l'app.
- `docs/` : spécifications validées, une par feature, exportées du backlog Notion.
- `CLAUDE.md` : règles que suivent les agents et les humains qui travaillent sur ce dépôt.

## Pilotage

- Backlog, pains terrain, décisions et journal des agents : espace Notion « Relève · Espace produit ».
- Comptes rendus des agents : canal Slack #releve-agents.

## Stack cible (à confirmer dans une Décision produit avant la première ligne de code)

Next.js + TypeScript, Supabase (auth, base, stockage), Stripe (abonnement), Resend (e-mail), PostHog (événements produit). Hébergement France pour les données clients.
