import type { Metadata } from 'next';
import Link from 'next/link';
import { exigerSession } from '@/lib/compte/courant.ts';
import { listerResultats, type ResumeResultat } from '@/lib/resultat/serveur.ts';
import { seDeconnecter } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mon espace · Relève',
  robots: { index: false, follow: false, nocache: true },
};

const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

function Evolution({ actuel, precedent }: { actuel: ResumeResultat; precedent?: ResumeResultat }) {
  if (!precedent) return null;
  const ecart = actuel.score - precedent.score;
  if (ecart === 0) return <span className="small muted">stable</span>;
  return (
    <span className="small muted">
      {ecart > 0 ? '+' : '−'}
      {Math.abs(ecart)} point{Math.abs(ecart) > 1 ? 's' : ''}
    </span>
  );
}

export default async function PageEspace() {
  const session = await exigerSession();
  let resultats: ResumeResultat[] = [];
  let erreur = false;
  try {
    resultats = await listerResultats(session.uid);
  } catch (e) {
    console.error('[espace] liste', e);
    erreur = true;
  }

  return (
    <main className="wrap">
      <div className="brand">
        <span className="mark">Relève</span>
        <span className="tag">Mon espace</span>
      </div>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="eyebrow">Mes résultats</p>
        <h1>Votre progression</h1>
        <p className="muted small">Connecté avec {session.email}</p>

        {erreur ? (
          <p role="alert">Vos résultats n’ont pas pu être chargés. Merci de réessayer dans un instant.</p>
        ) : resultats.length === 0 ? (
          <p className="muted">
            Aucun résultat pour le moment. Faites le point sur votre entreprise : le résultat s’ajoutera ici.
          </p>
        ) : (
          <ul className="list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resultats.map((r, i) => (
              <li key={r.id}>
                <Link
                  href={`/espace/${r.id}`}
                  className="card"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textDecoration: 'none' }}
                >
                  <span>
                    <b>{DATE.format(new Date(r.created_at))}</b>
                    {i === 0 && <span className="pill" style={{ marginLeft: 8 }}>Le plus récent</span>}
                    <br />
                    <span className="small muted">Dépendance à vous : {r.indice_dependance} / 100</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="num" style={{ fontSize: 22 }}>{r.score}</span>
                    <span className="small muted"> / 100</span>
                    <br />
                    <Evolution actuel={r} precedent={resultats[i + 1]} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
          <Link className="btn primary" href="/score">
            Refaire le point
          </Link>
          <form action={seDeconnecter}>
            <button className="btn" type="submit">
              Me déconnecter
            </button>
          </form>
        </div>
        <p className="muted small">
          Pour ajouter un nouveau résultat à votre historique, refaites le point puis gardez le résultat avec la même
          adresse e-mail.
        </p>
      </section>
    </main>
  );
}
