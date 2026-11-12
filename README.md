# Relève

Le cockpit de transmissibilité des TPE. Relève mesure et fait grandir la valeur et l'autonomie d'une entreprise sur 2-3 ans, puis accompagne la cession.

**Cible** : dirigeants de 50 à 65 ans, TPE/PME de 3 à 30 salariés, 300 k€ à 5 M€ de CA. Beachhead : Hérault.

**Modules** (ordre de construction) : Score de transmissibilité → Plan → Savoir-faire → Data room → Cession.

## État

| Feature (Notion) | Statut | Où |
|---|---|---|
| Obtenir mon score seul, en 20 minutes, sans compte | Parcours complet, sans enregistrement | `/score` |
| Voir à quel point mon entreprise repose sur moi et la décote | Livrée dans le résultat | `lib/score/engine.ts` |
| Repérer les points qui bloqueront une reprise et le temps qu'il faut pour les corriger | Alertes à seuil A1/A2/A3 avec délai réaliste et action (en revue) | `lib/score/engine.ts`, `components/Resultat.tsx` |
| Enregistrement par e-mail (lien magique), partage | À venir | — |

## Contenu du dépôt

- `app/` : pages Next.js (App Router). `/` accueil, `/score` questionnaire et résultat.
- `components/` : `Questionnaire` (26 questions, une par écran, sauvegarde locale 30 jours) et `Resultat`.
- `lib/score/content.ts` : les 6 axes, les 26 questions, les actions, les paliers, les alertes à seuil et leurs délais. Tout le texte du parcours est là.
- `lib/score/engine.ts` : fonctions pures de calcul (score par axe, indice de dépendance, décote, actions, alertes).
- `lib/score/*.test.ts` : tests du moteur et test de vocabulaire (aucun mot lié à la vente dans le parcours).
- `lib/analytics.ts` : événements produit, anonymes, ignorés sans clé PostHog.
- `prototype/releve-maquette.html` : maquette interactive de référence (identité visuelle, six vues).
- `docs/` : spécifications.
- `CLAUDE.md` : règles pour les agents et les humains.

## Lancer en local

```bash
npm install
npm test        # moteur de score + vocabulaire, sans dépendance
npm run dev     # http://localhost:3000
```

Node 22.6 ou plus (les tests utilisent le support TypeScript natif de Node). Copier `.env.example` en `.env.local` ; aucune clé n'est nécessaire pour le parcours de score.

## Pilotage

- Backlog, pains terrain, décisions et journal des agents : espace Notion « Relève · Espace produit ».
- Comptes rendus des agents : Slack #releve-agents (Alturia AI).
- Stack (Décision produit du 6 nov. 2026) : Next.js, Supabase (EU), Stripe, PostHog, Vercel, Resend. Les clés vivent dans les variables d'environnement de Vercel, jamais dans le dépôt.
