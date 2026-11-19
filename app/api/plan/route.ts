/**
 * POST /api/plan — génère le plan d'actions à 3 ans (spec « Transformer mon score en plan d'actions à 3 ans »).
 * Reçoit contexte + réponses + horizon (+ suivi), recalcule tout côté serveur et ne renvoie que ce que
 * l'abonnement permet de voir : les trois premières actions en entier, le reste en aperçu (§2.4).
 */
import { NextResponse } from 'next/server';
import { genererPlan } from '@/lib/plan/engine.ts';
import { planVisible } from '@/lib/plan/acces.ts';
import { abonnementActif } from '@/lib/plan/abonnement.ts';
import { validerDemandePlan } from '@/lib/plan/validation.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TAILLE_MAX = 16 * 1024;

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

  const maintenant = Date.now();
  const v = validerDemandePlan(corps, maintenant);
  if (!v.ok) return erreur(v.erreur, 400);
  const { contexte, reponses, horizon, choisiLe, faites, ordrePrecedent, actionsConnues } = v.demande;

  const plan = genererPlan(reponses, contexte, { horizon, choisiLe, maintenant, faites, ordrePrecedent, actionsConnues });
  const actif = await abonnementActif();

  return NextResponse.json({ ok: true, plan: planVisible(plan, actif) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
