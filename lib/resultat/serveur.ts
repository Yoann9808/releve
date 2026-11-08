/**
 * Accès serveur à Supabase (API REST) et à Resend, par appels HTTP directs, sans SDK
 * (décision du 8 nov. 2026 : aucune dépendance ajoutée à l'étape A).
 * Ce module lit SUPABASE_SERVICE_ROLE_KEY : il ne doit jamais être importé par un composant client.
 */
import type { Contexte, Reponses, Resultat } from '../score/engine.ts';

if (typeof window !== 'undefined') throw new Error('lib/resultat/serveur.ts est réservé au serveur.');

function env(nom: string): string {
  const v = process.env[nom];
  if (!v) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return v;
}

function supabase() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  const cle = env('SUPABASE_SERVICE_ROLE_KEY');
  const headers: Record<string, string> = { apikey: cle, 'Content-Type': 'application/json' };
  // Les anciennes clés (JWT) passent aussi en Authorization ; les nouvelles (sb_secret_…) seulement en apikey.
  if (!cle.startsWith('sb_')) headers.Authorization = `Bearer ${cle}`;
  return { base: `${url}/rest/v1/resultats`, headers };
}

export type LigneResultat = {
  token: string;
  email: string;
  contexte: Contexte;
  reponses: Reponses;
  resultat: Resultat;
  score: number;
  indice_dependance: number;
};

export async function enregistrerResultat(ligne: LigneResultat): Promise<void> {
  const { base, headers } = supabase();
  const res = await fetch(base, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(ligne),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase insert ${res.status}: ${await res.text()}`);
}

export async function supprimerResultat(token: string): Promise<void> {
  const { base, headers } = supabase();
  await fetch(`${base}?token=eq.${encodeURIComponent(token)}`, { method: 'DELETE', headers, cache: 'no-store' });
}

export type ResultatEnregistre = {
  contexte: Contexte;
  resultat: Resultat;
  created_at: string;
  revoque_le: string | null;
};

export async function lireResultat(token: string): Promise<ResultatEnregistre | null> {
  const { base, headers } = supabase();
  const res = await fetch(
    `${base}?token=eq.${encodeURIComponent(token)}&select=contexte,resultat,created_at,revoque_le&limit=1`,
    { headers, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Supabase select ${res.status}: ${await res.text()}`);
  const lignes = (await res.json()) as ResultatEnregistre[];
  return lignes[0] ?? null;
}

export async function envoyerEmail(a: string, contenu: { sujet: string; html: string; texte: string }): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('RESEND_FROM'), to: [a], subject: contenu.sujet, html: contenu.html, text: contenu.texte }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Adresse publique du site pour le lien de l'e-mail (jamais dérivée d'un en-tête de la requête en production). */
export function urlDuSite(origineRequete: string): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return origineRequete;
}
