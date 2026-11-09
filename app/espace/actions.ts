'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigerSession, fermerSession } from '@/lib/compte/courant.ts';
import { idValide, validerDestinataire } from '@/lib/compte/partage.ts';
import { nouveauToken } from '@/lib/resultat/token.ts';
import { creerPartage, lireResultatDuCompte, revoquerPartage } from '@/lib/resultat/serveur.ts';

/** Toute action sur un résultat vérifie d'abord qu'il appartient au compte connecté. */
async function resultatDuCompte(brut: FormDataEntryValue | null): Promise<string> {
  const s = await exigerSession();
  if (!idValide(brut)) redirect('/espace');
  const r = await lireResultatDuCompte(brut, s.uid);
  if (!r) redirect('/espace');
  return brut;
}

export async function creerLienPartage(formData: FormData): Promise<void> {
  const id = await resultatDuCompte(formData.get('resultat'));
  const destinataire = validerDestinataire(formData.get('destinataire'));
  if (!destinataire) redirect(`/espace/${id}?erreur=destinataire#partage`);
  await creerPartage({ resultat_id: id, token: nouveauToken(), destinataire });
  revalidatePath(`/espace/${id}`);
  redirect(`/espace/${id}?cree=1#partage`);
}

export async function desactiverLienPartage(formData: FormData): Promise<void> {
  const id = await resultatDuCompte(formData.get('resultat'));
  const partage = formData.get('partage');
  if (idValide(partage)) await revoquerPartage(partage, id);
  revalidatePath(`/espace/${id}`);
  redirect(`/espace/${id}#partage`);
}

export async function seDeconnecter(): Promise<void> {
  await fermerSession();
  redirect('/connexion');
}
