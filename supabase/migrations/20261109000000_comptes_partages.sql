-- Étape B : compte par lien magique, historique des scores, liens de partage révocables
-- (spec « Obtenir mon score seul » §2.5 à §2.7). Projet Supabase `releve` (eu-west-3, Paris).
--
-- Les comptes sont ceux de Supabase Auth (auth.users). Toute lecture et écriture passe par le
-- serveur Next.js avec la clé secrète : RLS activée sans politique, comme pour `resultats`.

-- 1. Rattacher un résultat au compte du dirigeant. Renseigné au premier clic sur le lien magique
--    (adresse prouvée), jamais au moment de l'enregistrement. Supprimer le compte supprime ses résultats.
alter table public.resultats
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists resultats_user_idx on public.resultats (user_id, created_at desc);

-- 2. Le lien /r/<token> devient un lien de partage (table `partages`). Le jeton porté par le
--    résultat lui-même n'a plus d'usage : la colonne devient facultative (le code de l'étape A, encore
--    en production au moment d'appliquer, l'écrit toujours). À supprimer dans une migration ultérieure.
alter table public.resultats alter column token drop not null;

-- 3. Liens de partage : créés à l'initiative du dirigeant, lecture seule, révocables.
create table if not exists public.partages (
  id            uuid primary key default gen_random_uuid(),
  resultat_id   uuid not null references public.resultats (id) on delete cascade,
  -- Jeton non devinable (32 octets aléatoires, base64url), porté par le lien /r/<token>.
  token         text not null unique check (char_length(token) >= 43),
  -- Pour qui le lien a été créé (« Mon expert-comptable ») : affiché au dirigeant, jamais au destinataire.
  destinataire  text not null check (char_length(destinataire) between 1 and 80),
  revoque_le    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists partages_resultat_idx on public.partages (resultat_id);

alter table public.partages enable row level security;
revoke all on table public.partages from anon, authenticated;
