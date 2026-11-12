import type { Metadata } from 'next';
import Link from 'next/link';
import { Resultat } from '@/components/Resultat';
import { tokenBienForme } from '@/lib/resultat/token.ts';
import { lireParPartage, type ResultatEnregistre } from '@/lib/resultat/serveur.ts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Résultat partagé · Relève',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

async function charger(token: string): Promise<ResultatEnregistre | null> {
  if (!tokenBienForme(token)) return null;
  try {
    return await lireParPartage(token);
  } catch (e) {
    console.error('[r/token] lecture', e);
    return null;
  }
}

export default async function PageResultatEnregistre({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enregistre = await charger(token);

  return (
    <main className="wrap">
      <div className="brand">
        <span className="mark">Relève</span>
        <span className="tag">Résultat partagé</span>
      </div>

      {enregistre ? (
        <>
          <p className="muted small" style={{ marginBottom: 16 }}>
            Résultat enregistré le {DATE.format(new Date(enregistre.created_at))}, partagé en lecture seule par le
            dirigeant. Il peut désactiver ce lien à tout moment.
          </p>
          <Resultat resultat={enregistre.resultat} contexte={enregistre.contexte} />
        </>
      ) : (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1>Ce lien n’est plus actif.</h1>
          <p className="muted">
            Il a peut-être été désactivé, ou l’adresse a été mal recopiée. Vous pouvez faire le point sur votre
            propre entreprise à tout moment, en 20 minutes environ.
          </p>
          <p>
            <Link className="btn primary" href="/score">
              Faire le point
            </Link>
          </p>
        </section>
      )}
    </main>
  );
}
