'use client';

import { useState, type FormEvent } from 'react';
import type { Contexte, Reponses } from '@/lib/score/engine.ts';
import { track } from '@/lib/analytics.ts';

type Etat = { t: 'saisie' } | { t: 'envoi' } | { t: 'envoye'; email: string } | { t: 'erreur'; message: string };

/**
 * « Garder ce résultat » (spec §2.5) : enregistrement et lien magique vers l'espace.
 * Rien ne part vers le serveur avant le clic sur le bouton.
 */
export function EnregistrerResultat({ contexte, reponses }: { contexte: Contexte; reponses: Reponses }) {
  const [email, setEmail] = useState('');
  const [site, setSite] = useState(''); // champ piège, invisible pour un humain
  const [etat, setEtat] = useState<Etat>({ t: 'saisie' });

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (etat.t === 'envoi') return;
    setEtat({ t: 'envoi' });
    try {
      const res = await fetch('/api/resultat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, contexte, reponses, site }),
      });
      const corps = (await res.json().catch(() => ({}))) as { ok?: boolean; erreur?: string };
      if (!res.ok || !corps.ok) {
        setEtat({ t: 'erreur', message: corps.erreur ?? 'Une erreur est survenue. Merci de réessayer.' });
        return;
      }
      track('email_submitted');
      setEtat({ t: 'envoye', email: email.trim() });
    } catch {
      setEtat({ t: 'erreur', message: 'La connexion a échoué. Vérifiez votre accès à internet et réessayez.' });
    }
  }

  if (etat.t === 'envoye') {
    return (
      <section className="card ink no-print" aria-live="polite">
        <p className="eyebrow">Résultat enregistré</p>
        <h3 style={{ color: '#fff', marginTop: 6 }}>C’est envoyé.</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Vous allez recevoir votre résultat à l’adresse <b style={{ color: '#fff' }}>{etat.email}</b>. Cliquez sur
          le lien de l’e-mail pour ouvrir votre espace : ce résultat y sera conservé, avec les prochains. Pensez à
          regarder dans les indésirables si rien n’arrive d’ici quelques minutes.
        </p>
      </section>
    );
  }

  return (
    <section className="card ink no-print">
      <p className="eyebrow">Garder ce résultat</p>
      <h3 style={{ color: '#fff', marginTop: 6 }}>Garder ce résultat et suivre ma progression</h3>
      <p className="muted" style={{ marginTop: 8 }}>
        Vous recevrez votre score, vos trois premières actions et un lien pour ouvrir votre espace, où vos résultats
        sont conservés. Sans mot de passe.
      </p>
      <form onSubmit={envoyer} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }} noValidate>
        <div className="field">
          <label htmlFor="email-resultat">Votre adresse e-mail</label>
          <input
            id="email-resultat"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={etat.t === 'erreur'}
            aria-describedby="email-resultat-aide"
          />
        </div>
        {/* Champ piège : masqué aux humains et aux lecteurs d'écran. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="site-web">Ne pas remplir</label>
          <input id="site-web" tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
        </div>
        {etat.t === 'erreur' && (
          <p role="alert" style={{ color: '#fff', fontWeight: 600 }}>
            {etat.message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn" id="btn-enregistrer" type="submit" disabled={etat.t === 'envoi' || email.trim() === ''}>
            {etat.t === 'envoi' ? 'Envoi en cours…' : 'Recevoir mon résultat'}
          </button>
        </div>
        <p id="email-resultat-aide" className="muted small">
          Votre adresse sert uniquement à vous envoyer ce résultat et à vous connecter. Vos réponses ne quittent cet appareil qu’au moment
          où vous cliquez.
        </p>
      </form>
    </section>
  );
}
