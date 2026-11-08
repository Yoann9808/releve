/**
 * Événements produit (spec §4). Anonymes, jamais de réponse au questionnaire dans les propriétés.
 * Sans clé PostHog, les événements sont simplement ignorés. Le SDK sera ajouté dans une PR dédiée ;
 * ici on expose une interface stable pour que les écrans puissent déjà émettre.
 */
export type Evenement =
  | 'score_started'
  | 'axe_completed'
  | 'score_abandoned'
  | 'score_displayed'
  | 'dependency_block_viewed'
  | 'dependency_action_opened'
  | 'email_submitted'
  | 'share_link_created';

type Proprietes = Record<string, string | number | boolean>;

declare global {
  interface Window {
    posthog?: { capture: (e: string, p?: Proprietes) => void };
  }
}

export function track(evenement: Evenement, proprietes: Proprietes = {}): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.posthog) window.posthog.capture(evenement, proprietes);
    else if (process.env.NODE_ENV !== 'production') console.debug('[analytics]', evenement, proprietes);
  } catch {
    // L'analytics ne doit jamais casser le parcours.
  }
}
