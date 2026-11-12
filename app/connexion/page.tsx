import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sessionCourante } from '@/lib/compte/courant.ts';
import { demanderLien } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Accéder à mon espace · Relève',
  robots: { index: false, follow: false },
};

const ERREURS: Record<string, string> = {
  adresse: 'Cette adresse e-mail ne semble pas valide.',
  envoi: 'L’e-mail n’a pas pu partir. Merci de réessayer dans un instant.',
};

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string; erreur?: string }>;
}) {
  if (await sessionCourante()) redirect('/espace');
  const { envoye, erreur } = await searchParams;

  return (
    <main className="wrap">
      <div className="brand">
        <span className="mark">Relève</span>
        <span className="tag">Votre espace</span>
      </div>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {envoye ? (
          <>
            <h1>Regardez votre messagerie.</h1>
            <p className="muted" aria-live="polite">
              Si un espace existe à cette adresse, vous allez recevoir un lien de connexion d’ici quelques minutes.
              Pensez à regarder dans les indésirables.
            </p>
            <p>
              <Link href="/connexion">Utiliser une autre adresse</Link>
            </p>
          </>
        ) : (
          <>
            <h1>Accéder à mon espace</h1>
            <p className="muted">
              Indiquez l’adresse avec laquelle vous avez gardé votre résultat. Vous recevrez un lien de connexion,
              sans mot de passe.
            </p>
            <form action={demanderLien} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label htmlFor="email-connexion">Votre adresse e-mail</label>
                <input
                  id="email-connexion"
                  name="email"
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  aria-invalid={erreur === 'adresse'}
                />
              </div>
              {/* Champ piège : masqué aux humains et aux lecteurs d'écran. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <label htmlFor="site-web">Ne pas remplir</label>
                <input id="site-web" name="site" tabIndex={-1} autoComplete="off" />
              </div>
              {erreur && ERREURS[erreur] && (
                <p role="alert" style={{ fontWeight: 600 }}>
                  {ERREURS[erreur]}
                </p>
              )}
              <div>
                <button className="btn primary" type="submit">
                  Recevoir mon lien
                </button>
              </div>
            </form>
            <p className="muted small">
              Pas encore de résultat ? <Link href="/score">Faire le point sur mon entreprise</Link>, en 20 minutes
              environ.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
