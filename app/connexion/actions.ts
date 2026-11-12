'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { lienConnexion, parametresConnexion } from '@/lib/compte/lien.ts';
import { ouvrirSession } from '@/lib/compte/courant.ts';
import { normaliserEmail } from '@/lib/resultat/validation.ts';
import { contenuEmailConnexion } from '@/lib/resultat/email.ts';
import { urlDuSite } from '@/lib/resultat/url.ts';
import {
  adresseConnue,
  creerLienMagique,
  envoyerEmail,
  rattacherResultats,
  verifierLienMagique,
} from '@/lib/resultat/serveur.ts';

async function origine(): Promise<string> {
  const h = await headers();
  const hote = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (hote.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${hote}`;
}

/**
 * « Recevoir un lien de connexion ». Même réponse que l'adresse soit connue ou non, pour ne pas
 * révéler qui a un espace. Aucun compte n'est créé ici : seulement si un résultat existe déjà.
 */
export async function demanderLien(formData: FormData): Promise<void> {
  if (formData.get('site')) redirect('/connexion?envoye=1'); // champ piège
  const email = normaliserEmail(formData.get('email'));
  if (!email) redirect('/connexion?erreur=adresse');

  try {
    if (await adresseConnue(email)) {
      const { jeton, type } = await creerLienMagique(email);
      const base = urlDuSite(process.env, await origine());
      await envoyerEmail(email, contenuEmailConnexion(lienConnexion(base, jeton, type)));
    }
  } catch (e) {
    console.error('[connexion] envoi du lien', e);
    redirect('/connexion?erreur=envoi');
  }
  redirect('/connexion?envoye=1');
}

/**
 * Clic sur « Accéder à mon espace » depuis la page du lien magique. Le jeton n'est consommé qu'ici,
 * pas à l'ouverture de la page : les antivirus de messagerie qui visitent les liens ne le grillent pas.
 */
export async function validerLien(formData: FormData): Promise<void> {
  const p = parametresConnexion(formData.get('th'), formData.get('type'));
  if (!p) redirect('/connexion/valider?echec=1');

  let compte: { uid: string; email: string } | null = null;
  try {
    compte = await verifierLienMagique(p.jeton, p.type);
    if (compte) await rattacherResultats(compte.uid, compte.email);
  } catch (e) {
    console.error('[connexion] validation', e);
    compte = null;
  }
  if (!compte) redirect('/connexion/valider?echec=1');

  await ouvrirSession(compte.uid, compte.email);
  redirect('/espace');
}
