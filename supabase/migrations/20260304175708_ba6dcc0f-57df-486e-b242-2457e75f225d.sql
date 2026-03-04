
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type public.app_role as enum ('admin', 'staff', 'coach', 'parent');
create type public.session_type as enum ('baseline', 'mid', 'final', 'custom');
create type public.session_status as enum ('scheduled', 'in_progress', 'completed');
create type public.scoring_direction as enum ('higher_better', 'lower_better');

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- USER ROLES (separate table for RBAC)
-- ============================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);

-- ============================================================
-- SECURITY DEFINER FUNCTION (avoids infinite recursion in RLS)
-- ============================================================
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create or replace function public.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1
$$;

-- ============================================================
-- TEAMS
-- ============================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  season_year int,
  level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PLAYERS
-- ============================================================
create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  jersey_number text,
  position text,
  dob date,
  active boolean not null default true,
  access_code text unique default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEAM COACHES
-- ============================================================
create table public.team_coaches (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (team_id, user_id)
);

-- ============================================================
-- PARENT PLAYER LINKS
-- ============================================================
create table public.parent_player_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (user_id, player_id)
);

-- ============================================================
-- SESSIONS
-- ============================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  session_type public.session_type not null default 'baseline',
  date date not null default current_date,
  location text,
  status public.session_status not null default 'scheduled',
  notes text,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TESTS (configurable by admin)
-- ============================================================
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  sport text not null default 'hockey',
  name text not null,
  unit text not null,
  direction public.scoring_direction not null default 'higher_better',
  min_value numeric,
  max_value numeric,
  max_attempts int default 1,
  store_best_only boolean not null default true,
  active boolean not null default true,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RESULTS
-- ============================================================
create table public.results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  value_best numeric,
  attempts_json jsonb,
  entered_by_user_id uuid references auth.users(id),
  updated_by_user_id uuid references auth.users(id),
  flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, player_id, test_id)
);

-- ============================================================
-- REPORTS
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  scope text not null check (scope in ('player', 'team')),
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  pdf_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at before update on public.organizations for each row execute function public.update_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at();
create trigger trg_teams_updated_at before update on public.teams for each row execute function public.update_updated_at();
create trigger trg_players_updated_at before update on public.players for each row execute function public.update_updated_at();
create trigger trg_sessions_updated_at before update on public.sessions for each row execute function public.update_updated_at();
create trigger trg_tests_updated_at before update on public.tests for each row execute function public.update_updated_at();
create trigger trg_results_updated_at before update on public.results for each row execute function public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.organizations enable row level security;
create policy "Admins can do anything on organizations" on public.organizations for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Authenticated can view their organization" on public.organizations for select using (id in (select organization_id from public.profiles where id = auth.uid()));

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (id = auth.uid());
create policy "Admins can view all profiles" on public.profiles for select using (public.has_role(auth.uid(), 'admin'));
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "System can insert profiles" on public.profiles for insert with check (id = auth.uid());

alter table public.user_roles enable row level security;
create policy "Admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Users can view own roles" on public.user_roles for select using (user_id = auth.uid());

alter table public.teams enable row level security;
create policy "Admins full access teams" on public.teams for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Staff can view teams" on public.teams for select using (public.has_role(auth.uid(), 'staff'));
create policy "Coaches can view their teams" on public.teams for select using (id in (select team_id from public.team_coaches where user_id = auth.uid()));

alter table public.players enable row level security;
create policy "Admins full access players" on public.players for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Staff can manage players" on public.players for all using (public.has_role(auth.uid(), 'staff')) with check (public.has_role(auth.uid(), 'staff'));
create policy "Coaches can view players on their teams" on public.players for select using (team_id in (select team_id from public.team_coaches where user_id = auth.uid()));
create policy "Parents can view their linked players" on public.players for select using (id in (select player_id from public.parent_player_links where user_id = auth.uid()));

alter table public.team_coaches enable row level security;
create policy "Admins full access team_coaches" on public.team_coaches for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Coaches can view their own assignments" on public.team_coaches for select using (user_id = auth.uid());

alter table public.parent_player_links enable row level security;
create policy "Admins full access parent_player_links" on public.parent_player_links for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Parents can view own links" on public.parent_player_links for select using (user_id = auth.uid());

alter table public.sessions enable row level security;
create policy "Admins full access sessions" on public.sessions for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Staff can manage sessions" on public.sessions for all using (public.has_role(auth.uid(), 'staff')) with check (public.has_role(auth.uid(), 'staff'));
create policy "Coaches can view their team sessions" on public.sessions for select using (team_id in (select team_id from public.team_coaches where user_id = auth.uid()));
create policy "Parents can view sessions for their players teams" on public.sessions for select using (team_id in (select p.team_id from public.players p join public.parent_player_links ppl on ppl.player_id = p.id where ppl.user_id = auth.uid()));

alter table public.tests enable row level security;
create policy "Admins full access tests" on public.tests for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "All authenticated can view active tests" on public.tests for select using (auth.uid() is not null and active = true);

alter table public.results enable row level security;
create policy "Admins full access results" on public.results for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Staff can manage results for non-completed sessions" on public.results for all using (public.has_role(auth.uid(), 'staff') and session_id in (select id from public.sessions where status != 'completed')) with check (public.has_role(auth.uid(), 'staff') and session_id in (select id from public.sessions where status != 'completed'));
create policy "Staff can view all results" on public.results for select using (public.has_role(auth.uid(), 'staff'));
create policy "Coaches can view results for their team sessions" on public.results for select using (session_id in (select s.id from public.sessions s join public.team_coaches tc on tc.team_id = s.team_id where tc.user_id = auth.uid()));
create policy "Parents can view results for their players" on public.results for select using (player_id in (select player_id from public.parent_player_links where user_id = auth.uid()));

alter table public.reports enable row level security;
create policy "Admins full access reports" on public.reports for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Staff can view reports" on public.reports for select using (public.has_role(auth.uid(), 'staff'));
create policy "Coaches can view team reports" on public.reports for select using (team_id in (select team_id from public.team_coaches where user_id = auth.uid()));
create policy "Parents can view player reports" on public.reports for select using (player_id in (select player_id from public.parent_player_links where user_id = auth.uid()));

-- ============================================================
-- VIEWS
-- ============================================================
create or replace view public.player_progress_view as
  select
    r.player_id,
    r.test_id,
    t.name as test_name,
    t.unit,
    t.direction,
    s.date as session_date,
    s.session_type,
    s.id as session_id,
    r.value_best,
    p.first_name,
    p.last_name,
    p.jersey_number
  from public.results r
  join public.tests t on t.id = r.test_id
  join public.sessions s on s.id = r.session_id
  join public.players p on p.id = r.player_id
  where r.value_best is not null;

create or replace view public.team_rankings_view as
  select
    r.session_id,
    r.test_id,
    r.player_id,
    r.value_best,
    t.direction,
    rank() over (
      partition by r.session_id, r.test_id
      order by
        case when t.direction = 'higher_better' then r.value_best end desc nulls last,
        case when t.direction = 'lower_better' then r.value_best end asc nulls last
    ) as rank
  from public.results r
  join public.tests t on t.id = r.test_id
  where r.value_best is not null;

grant select on public.player_progress_view to authenticated;
grant select on public.team_rankings_view to authenticated;
