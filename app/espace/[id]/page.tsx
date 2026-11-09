import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Resultat } from '@/components/Resultat';
import { CopierLien } from '@/components/CopierLien';
import { exigerSession } from '@/lib/compte/courant.ts';
import { DESTINATAIRE_MAX, idValide } from '@/lib/compte/partage.ts';
import { urlDuSite } from '@/lib/resultat/url.ts';
import { lireResultatDuCompte, listerPartages, type Partage } from '@/lib/resultat/serveur.ts';
import { creerLienPartage, desactiverLienPartage } from '../actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mon résultat · Relève',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

export default async function PageResultatEspace({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; cree?: string }>;
}) {
  const session = await exigerSession();
  const { id } = await params;
  const { erreur, cree } = await searchParams;
  if (!idValide(id)) notFound();

  const enregistre = await lireResultatDuCompte(id, session.uid);
  if (!enregistre) notFound();
  const partages: Partage[] = await listerPartages(id);

  const h = await headers();
  const hote = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const base = urlDuSite(process.env, `${hote.startsWith('localhost') ? 'http' : 'https'}://${hote}`);

  return (
    <main className="wrap">
      <div className="brand">
        <span className="mark">Relève</span>
        <span className="tag">Mon espace</span>
      </div>

      <p className="no-print" style={{ marginBottom: 12 }}>
        <Link href="/espace">← Tous mes résultats</Link>
      </p>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Résultat enregistré le {DATE.format(new Date(enregistre.created_at))}.
      </p>

      <Resultat resultat={enregistre.resultat} contexte={enregistre.contexte} />

      <section id="partage" className="card no-print" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
        <p className="eyebrow">Partager ce résultat</p>
        <h2>Le montrer à une personne de confiance</h2>
        <p className="muted">
          Créez un lien en lecture seule pour votre conjoint ou votre expert-comptable. Vous pouvez le désactiver à
          tout moment. Personne d’autre que les détenteurs du lien ne peut voir ce résultat.
        </p>

        {partages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontWeight: 600 }}>
              {partages.length === 1 ? 'Un lien actif' : `${partages.length} liens actifs`}
            </p>
            {partages.map((p, i) => (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span>
                  <b>{p.destinataire}</b>{' '}
                  <span className="small muted">· créé le {DATE.format(new Date(p.created_at))}</span>
                </span>
                <CopierLien lien={`${base}/r/${p.token}`} nouveau={Boolean(cree) && i === 0} />
                <form action={desactiverLienPartage}>
                  <input type="hidden" name="resultat" value={id} />
                  <input type="hidden" name="partage" value={p.id} />
                  <button className="btn" type="submit">
                    Désactiver ce lien
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={creerLienPartage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="hidden" name="resultat" value={id} />
          <div className="field">
            <label htmlFor="destinataire">Pour qui est ce lien ?</label>
            <input
              id="destinataire"
              name="destinataire"
              className="input"
              maxLength={DESTINATAIRE_MAX}
              placeholder="Par exemple : mon expert-comptable"
              required
              aria-invalid={erreur === 'destinataire'}
            />
          </div>
          {erreur === 'destinataire' && (
            <p role="alert" style={{ fontWeight: 600 }}>
              Indiquez pour qui est ce lien, en quelques mots.
            </p>
          )}
          <div>
            <button className="btn primary" type="submit">
              Créer un lien de partage
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
