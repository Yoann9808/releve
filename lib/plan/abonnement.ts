/**
 * Statut d'abonnement (spec §2.4) : la source de vérité sera le webhook Stripe, qui alimentera la table
 * `abonnements` dans Supabase. Tant que le prix et la périodicité ne sont pas décidés (spec §7) et que
 * le plan n'est pas rattaché à un compte (étape B), aucun abonnement n'est actif : le plan est servi en aperçu.
 * Ce module est réservé au serveur.
 */
if (typeof window !== 'undefined') throw new Error('lib/plan/abonnement.ts est réservé au serveur.');

export async function abonnementActif(): Promise<boolean> {
  return false;
}
