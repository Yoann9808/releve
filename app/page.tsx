import Link from 'next/link';

export default function Accueil() {
  return (
    <main className="wrap">
      <div className="brand">
        <span className="mark">Relève</span>
        <span className="tag">Beta</span>
      </div>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p className="eyebrow">Pour les dirigeants de TPE</p>
        <h1>Votre entreprise tiendrait-elle trois semaines sans vous ?</h1>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          Relève mesure à quel point votre entreprise repose sur vous, ce que cela lui coûte en valeur, et vous
          donne les trois premières actions pour y remédier. En 20 minutes, sans créer de compte, sans en parler à
          personne.
        </p>
        <div>
          <Link href="/score" className="btn primary">
            Faire le point sur mon entreprise
          </Link>
        </div>
        <p className="small muted">
          Vos réponses restent sur cet appareil jusqu’à ce que vous décidiez de les enregistrer.
        </p>
      </section>
      <section className="grid-2">
        <div className="card">
          <h3>Un score, six axes</h3>
          <p className="muted small" style={{ marginTop: 8 }}>
            Dépendance au dirigeant, clients, finances, processus, équipe, juridique. Vous voyez où l’entreprise
            est solide et où elle ne tient qu’à vous.
          </p>
        </div>
        <div className="card">
          <h3>Trois actions concrètes</h3>
          <p className="muted small" style={{ marginTop: 8 }}>
            Pas un rapport : trois choses à faire dans les prochains mois, avec le temps que ça prend et ce que ça
            change.
          </p>
        </div>
      </section>
    </main>
  );
}
