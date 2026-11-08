/**
 * POST /api/resultat — « Garder ce résultat et le recevoir par e-mail » (spec §2.5, étape A).
 * Reçoit e-mail + contexte + réponses, recalcule le résultat côté serveur, l'enregistre
 * dans Supabase, puis envoie l'e-mail Resend avec le lien /r/<token>.
 */
import { NextResponse } from 'next/server';
import { calculerResultat } from '@/lib/score/engine.ts';
import { validerDemande } from '@/lib/resultat/validation.ts';
import { nouveauToken } from '@/lib/resultat/token.ts';
import { contenuEmail } from '@/lib/resultat/email.ts';
import { enregistrerResultat, envoyerEmail, supprimerResultat } from '@/lib/resultat/serveur.ts';
import { urlDuSite } from '@/lib/resultat/url.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TAILLE_MAX = 16 * 1024; // une demande légitime pèse moins de 2 Ko

function erreur(message: string, status: number) {
  return NextResponse.json({ ok: false, erreur: message }, { status });
}

export async function POST(req: Request) {
  const brut = await req.text();
  if (brut.length > TAILLE_MAX) return erreur('Demande trop volumineuse.', 413);

  let corps: unknown;
  try {
    corps = JSON.parse(brut);
  } catch {
    return erreur('Demande illisible.', 400);
  }

  // Champ piège invisible : un robot le remplit, un humain non. On répond « ok » sans rien faire.
  if (typeof corps === 'object' && corps !== null && (corps as Record<string, unknown>).site) {
    return NextResponse.json({ ok: true });
  }

  const v = validerDemande(corps);
  if (!v.ok) return erreur(v.erreur, 400);
  const { email, contexte, reponses } = v.demande;

  // Jamais de confiance dans un score envoyé par le navigateur : on recalcule.
  const resultat = calculerResultat(reponses, contexte);
  const token = nouveauToken();
  const lien = `${urlDuSite(process.env, new URL(req.url).origin)}/r/${token}`;

  try {
    await enregistrerResultat({
      token,
      email,
      contexte,
      reponses,
      resultat,
      score: resultat.scoreGlobal,
      indice_dependance: resultat.dependance.indice,
    });
  } catch (e) {
    console.error('[api/resultat] enregistrement', e);
    return erreur('Nous n’avons pas pu enregistrer votre résultat. Merci de réessayer dans un instant.', 503);
  }

  try {
    await envoyerEmail(email, contenuEmail(resultat, lien));
  } catch (e) {
    console.error('[api/resultat] envoi', e);
    // Pas d'e-mail, pas de lien connu : on ne garde pas une ligne orpheline avec l'adresse.
    await supprimerResultat(token).catch(() => {});
    return erreur('L’e-mail n’a pas pu partir. Vérifiez votre adresse ou réessayez dans un instant.', 502);
  }

  return NextResponse.json({ ok: true });
}
