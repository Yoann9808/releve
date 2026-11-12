/**
 * Accès serveur à Supabase (REST et Auth) et à Resend, par appels HTTP directs, sans SDK
 * (décision du 8 nov. 2026 : pas de dépendance ajoutée).
 * Ce module lit SUPABASE_SECRET_KEY : il ne doit jamais être importé par un composant client.
 */
import type { Contexte, Reponses, Resultat } from '../score/engine.ts';
import type { TypeLien } from '../compte/lien.ts';

if (typeof window !== 'undefined') throw new Error('lib/resultat/serveur.ts est réservé au serveur.');

function env(nom: string): string {
  const v = process.env[nom];
  if (!v) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return v;
}

function supabase() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  const cle = env('SUPABASE_SECRET_KEY');
  const headers: Record<string, string> = { apikey: cle, 'Content-Type': 'application/json' };
  // Les anciennes clés (JWT) passent aussi en Authorization ; les nouvelles (sb_secret_…) seulement en apikey.
  if (!cle.startsWith('sb_')) headers.Authorization = `Bearer ${cle}`;
  return { url, headers };
}

async function rest<T>(chemin: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const { url, headers } = supabase();
  const { prefer, ...reste } = init;
  const res = await fetch(`${url}/rest/v1/${chemin}`, {
    ...reste,
    headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Supabase ${reste.method ?? 'GET'} ${chemin.split('?')[0]} ${res.status}: ${await res.text()}`);
  }
  const texte = await res.text();
  return (texte ? JSON.parse(texte) : null) as T;
}

const enc = encodeURIComponent;

// --- Résultats ---

export type LigneResultat = {
  email: string;
  contexte: Contexte;
  reponses: Reponses;
  resultat: Resultat;
  score: number;
  indice_dependance: number;
};

/** Enregistre un résultat, sans compte : il est rattaché au premier clic sur le lien magique. Renvoie son id. */
export async function enregistrerResultat(ligne: LigneResultat): Promise<string> {
  const lignes = await rest<{ id: string }[]>('resultats?select=id', {
    method: 'POST',
    body: JSON.stringify(ligne),
    prefer: 'return=representation',
  });
  return lignes[0].id;
}

export async function supprimerResultat(id: string): Promise<void> {
  await rest(`resultats?id=eq.${enc(id)}`, { method: 'DELETE' });
}

/** Une adresse a un espace dès qu'au moins un résultat a été enregistré avec elle. */
export async function adresseConnue(email: string): Promise<boolean> {
  const l = await rest<unknown[]>(`resultats?email=eq.${enc(email)}&select=id&limit=1`);
  return l.length > 0;
}

/** Rattache au compte tous les résultats enregistrés avec cette adresse et pas encore rattachés. */
export async function rattacherResultats(uid: string, email: string): Promise<void> {
  await rest(`resultats?email=eq.${enc(email)}&user_id=is.null`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: uid }),
    prefer: 'return=minimal',
  });
}

export type ResumeResultat = { id: string; score: number; indice_dependance: number; created_at: string };

export async function listerResultats(uid: string): Promise<ResumeResultat[]> {
  return rest(`resultats?user_id=eq.${enc(uid)}&select=id,score,indice_dependance,created_at&order=created_at.desc`);
}

export type ResultatEnregistre = { contexte: Contexte; resultat: Resultat; created_at: string };

/** Lit un résultat seulement s'il appartient au compte. */
export async function lireResultatDuCompte(id: string, uid: string): Promise<ResultatEnregistre | null> {
  const l = await rest<ResultatEnregistre[]>(
    `resultats?id=eq.${enc(id)}&user_id=eq.${enc(uid)}&select=contexte,resultat,created_at&limit=1`,
  );
  return l[0] ?? null;
}

// --- Partages ---

export type Partage = { id: string; token: string; destinataire: string; created_at: string };

export async function listerPartages(resultatId: string): Promise<Partage[]> {
  return rest(
    `partages?resultat_id=eq.${enc(resultatId)}&revoque_le=is.null&select=id,token,destinataire,created_at&order=created_at.desc`,
  );
}

export async function creerPartage(p: { resultat_id: string; token: string; destinataire: string }): Promise<void> {
  await rest('partages', { method: 'POST', body: JSON.stringify(p), prefer: 'return=minimal' });
}

/** Désactive un lien. L'appelant a vérifié que le résultat appartient au compte. */
export async function revoquerPartage(id: string, resultatId: string): Promise<void> {
  await rest(`partages?id=eq.${enc(id)}&resultat_id=eq.${enc(resultatId)}&revoque_le=is.null`, {
    method: 'PATCH',
    body: JSON.stringify({ revoque_le: new Date().toISOString() }),
    prefer: 'return=minimal',
  });
}

/** Page /r/<token> : le résultat partagé, si le lien est actif. */
export async function lireParPartage(token: string): Promise<ResultatEnregistre | null> {
  const l = await rest<{ resultats: ResultatEnregistre | null }[]>(
    `partages?token=eq.${enc(token)}&revoque_le=is.null&select=resultats(contexte,resultat,created_at)&limit=1`,
  );
  return l[0]?.resultats ?? null;
}

// --- Supabase Auth (lien magique) ---

/**
 * Crée le lien de connexion sans que Supabase n'envoie d'e-mail : on l'envoie nous-mêmes par Resend.
 * Pour une adresse inconnue, Supabase crée le compte et renvoie le type « signup ».
 */
export async function creerLienMagique(email: string): Promise<{ jeton: string; type: TypeLien }> {
  const { url, headers } = supabase();
  const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'magiclink', email }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase generate_link ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { hashed_token?: string; verification_type?: string };
  if (!d.hashed_token) throw new Error('Supabase generate_link : jeton absent');
  return { jeton: d.hashed_token, type: d.verification_type === 'signup' ? 'signup' : 'magiclink' };
}

/** Vérifie le jeton (usage unique). Renvoie le compte, ou null si le lien a expiré ou a déjà servi. */
export async function verifierLienMagique(jeton: string, type: TypeLien): Promise<{ uid: string; email: string } | null> {
  const { url, headers } = supabase();
  const res = await fetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type, token_hash: jeton }),
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status >= 500) throw new Error(`Supabase verify ${res.status}: ${await res.text()}`);
    return null;
  }
  const d = (await res.json()) as { user?: { id?: string; email?: string } };
  if (!d.user?.id || !d.user.email) return null;
  return { uid: d.user.id, email: d.user.email.toLowerCase() };
}

// --- Resend ---

export async function envoyerEmail(a: string, contenu: { sujet: string; html: string; texte: string }): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('RESEND_FROM'), to: [a], subject: contenu.sujet, html: contenu.html, text: contenu.texte }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
