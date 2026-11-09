import type { Metadata } from 'next';
import Link from 'next/link';
import { parametresConnexion } from '@/lib/compte/lien.ts';
import { validerLien } from '../actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Accéder à mon espace · Relève',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

/**
 * Page d'arrivée du lien magique. Elle ne consomme pas le jeton : il faut cliquer sur le bouton
 * (les antivirus de messagerie ouvrent les liens à l'avance et grilleraient un lien à usage unique).
 */
export default async function PageValider({
  searchParams,
}: {
  searchParams: Promise<{ th?: string; type?: string; echec?: string }>;
}) {
  const { th, type, echec } = await searchParams;
  const p = echec ? null : parametresConnexion(th, type);

  return (
    <main className="wrap">
      <div className="brand">
        <span className="mark">Relève</span>
        <span className="tag">Votre espace</span>
      </div>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {p ? (
          <>
            <h1>Bienvenue.</h1>
            <p className="muted">Un clic pour ouvrir votre espace, où vos résultats sont conservés.</p>
            <form action={validerLien}>
              <input type="hidden" name="th" value={p.jeton} />
              <input type="hidden" name="type" value={p.type} />
              <button className="btn primary" type="submit" autoFocus>
                Accéder à mon espace
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Ce lien n’est plus valable.</h1>
            <p className="muted">
              Un lien de connexion ne sert qu’une fois et expire au bout de quelques heures. Votre résultat, lui, est
              bien conservé : demandez simplement un nouveau lien.
            </p>
            <p>
              <Link className="btn primary" href="/connexion">
                Recevoir un nouveau lien
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
