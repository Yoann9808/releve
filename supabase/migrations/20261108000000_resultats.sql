-- Résultats enregistrés par e-mail (spec « Obtenir mon score seul » §2.5, étape A).
-- À appliquer sur le projet Supabase `releve` (région eu-west-3, Paris).
--
-- Accès : uniquement par la clé secrète (Secret key, sb_secret_…), depuis le serveur Next.js.
-- RLS est activée sans aucune politique : les clés anon / publishable ne lisent ni n'écrivent rien.

create table if not exists public.resultats (
  id                 uuid primary key default gen_random_uuid(),
  -- Jeton non devinable (32 octets aléatoires, base64url), porté par le lien /r/<token>.
  token              text not null unique check (char_length(token) >= 43),
  email              text not null check (char_length(email) <= 254),
  contexte           jsonb not null,
  reponses           jsonb not null,
  -- Photo figée du résultat tel qu'affiché et envoyé ce jour-là (décision du 8 nov. 2026).
  resultat           jsonb not null,
  score              int not null check (score between 0 and 100),
  indice_dependance  int not null check (indice_dependance between 0 and 100),
  -- Renseigné quand le lien est désactivé : la page affiche alors « ce lien n'est plus actif ».
  revoque_le         timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists resultats_email_idx on public.resultats (lower(email));

alter table public.resultats enable row level security;

-- Retirer explicitement les droits des rôles exposés à l'API publique.
revoke all on table public.resultats from anon, authenticated;
