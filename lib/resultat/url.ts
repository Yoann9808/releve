/**
 * Adresse publique du site pour le lien /r/<token> de l'e-mail. Fonction pure, testée.
 *
 * Ordre : SITE_URL si renseignée ; en production Vercel, le domaine de production ;
 * sur une preview Vercel, l'adresse de la branche (sinon le lien mènerait à la production,
 * où le code de la branche n'existe pas encore) ; en local, l'adresse de la requête.
 */
export type EnvUrl = {
  SITE_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_URL?: string;
  [autre: string]: string | undefined; // accepte process.env tel quel
};

const sansSlash = (u: string) => u.replace(/\/+$/, '');
const https = (domaine: string) => `https://${domaine}`;

export function urlDuSite(env: EnvUrl, origineRequete: string): string {
  if (env.SITE_URL) return sansSlash(env.SITE_URL);
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL)
    return https(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (env.VERCEL_ENV === 'preview') {
    if (env.VERCEL_BRANCH_URL) return https(env.VERCEL_BRANCH_URL);
    if (env.VERCEL_URL) return https(env.VERCEL_URL);
  }
  return sansSlash(origineRequete);
}
