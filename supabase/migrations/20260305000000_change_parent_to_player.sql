-- Change app_role enum from 'parent' to 'player'

-- Step 1: Create new enum type with the updated values
create type public.app_role_new as enum ('admin', 'staff', 'coach', 'player');

-- Step 2: Convert column to text temporarily to allow the change
alter table public.user_roles alter column role type text;

-- Step 3: Update all existing 'parent' values to 'player'
UPDATE public.user_roles SET role = 'player' WHERE role = 'parent';

-- Step 4: Convert column to new enum type
alter table public.user_roles alter column role type public.app_role_new using role::public.app_role_new;

-- Step 5: Drop old enum and all dependent objects (functions and policies)
drop type public.app_role cascade;

-- Step 6: Rename new enum to old name
alter type public.app_role_new rename to app_role;

-- Step 7: Recreate the functions that depend on app_role
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

-- Step 8: Recreate RLS policies (they were dropped with cascade)
-- First, drop existing policies
drop policy if exists "Admins can do anything on organizations" on public.organizations;
drop policy if exists "Authenticated can view their organization" on public.organizations;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "System can insert profiles" on public.profiles;
drop policy if exists "Admins manage roles" on public.user_roles;
drop policy if exists "Users can view own roles" on public.user_roles;
drop policy if exists "Admins full access teams" on public.teams;
drop policy if exists "Staff can view teams" on public.teams;
drop policy if exists "Coaches can view their teams" on public.teams;
drop policy if exists "Admins full access players" on public.players;
drop policy if exists "Staff can manage players" on public.players;
drop policy if exists "Coaches can view players on their teams" on public.players;
drop policy if exists "Parents can view their linked players" on public.players;
drop policy if exists "Players can view their linked players" on public.players;
drop policy if exists "Admins full access team_coaches" on public.team_coaches;
drop policy if exists "Coaches can view their own assignments" on public.team_coaches;
drop policy if exists "Admins full access parent_player_links" on public.parent_player_links;
drop policy if exists "Parents can view own links" on public.parent_player_links;
drop policy if exists "Players can view own links" on public.parent_player_links;
drop policy if exists "Admins full access sessions" on public.sessions;
drop policy if exists "Staff can manage sessions" on public.sessions;
drop policy if exists "Coaches can view their team sessions" on public.sessions;
drop policy if exists "Parents can view sessions for their players teams" on public.sessions;
drop policy if exists "Players can view sessions for their players teams" on public.sessions;
drop policy if exists "Admins full access tests" on public.tests;
drop policy if exists "All authenticated can view active tests" on public.tests;
drop policy if exists "Admins full access results" on public.results;
drop policy if exists "Staff can manage results for non-completed sessions" on public.results;
drop policy if exists "Staff can view all results" on public.results;
drop policy if exists "Coaches can view results for their team sessions" on public.results;
drop policy if exists "Parents can view results for their players" on public.results;
drop policy if exists "Players can view results for their players" on public.results;
drop policy if exists "Admins full access reports" on public.reports;
drop policy if exists "Staff can view reports" on public.reports;
drop policy if exists "Coaches can view team reports" on public.reports;
drop policy if exists "Parents can view player reports" on public.reports;
drop policy if exists "Players can view player reports" on public.reports;

-- Now recreate the policies
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
create policy "Players can view their linked players" on public.players for select using (id in (select player_id from public.parent_player_links where user_id = auth.uid()));

alter table public.team_coaches enable row level security;
create policy "Admins full access team_coaches" on public.team_coaches for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Coaches can view their own assignments" on public.team_coaches for select using (user_id = auth.uid());

alter table public.parent_player_links enable row level security;
create policy "Admins full access parent_player_links" on public.parent_player_links for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Players can view own links" on public.parent_player_links for select using (user_id = auth.uid());

alter table public.sessions enable row level security;
create policy "Admins full access sessions" on public.sessions for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Staff can manage sessions" on public.sessions for all using (public.has_role(auth.uid(), 'staff')) with check (public.has_role(auth.uid(), 'staff'));
create policy "Coaches can view their team sessions" on public.sessions for select using (team_id in (select team_id from public.team_coaches where user_id = auth.uid()));
create policy "Players can view sessions for their players teams" on public.sessions for select using (team_id in (select p.team_id from public.players p join public.parent_player_links ppl on ppl.player_id = p.id where ppl.user_id = auth.uid()));

alter table public.tests enable row level security;
create policy "Admins full access tests" on public.tests for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "All authenticated can view active tests" on public.tests for select using (auth.uid() is not null and active = true);

alter table public.results enable row level security;
create policy "Admins full access results" on public.results for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Staff can manage results for non-completed sessions" on public.results for all using (public.has_role(auth.uid(), 'staff') and session_id in (select id from public.sessions where status != 'completed')) with check (public.has_role(auth.uid(), 'staff') and session_id in (select id from public.sessions where status != 'completed'));
create policy "Staff can view all results" on public.results for select using (public.has_role(auth.uid(), 'staff'));
create policy "Coaches can view results for their team sessions" on public.results for select using (session_id in (select s.id from public.sessions s join public.team_coaches tc on tc.team_id = s.team_id where tc.user_id = auth.uid()));
create policy "Players can view results for their players" on public.results for select using (player_id in (select player_id from public.parent_player_links where user_id = auth.uid()));

alter table public.reports enable row level security;
create policy "Admins full access reports" on public.reports for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Staff can view reports" on public.reports for select using (public.has_role(auth.uid(), 'staff'));
create policy "Coaches can view team reports" on public.reports for select using (team_id in (select team_id from public.team_coaches where user_id = auth.uid()));
create policy "Players can view player reports" on public.reports for select using (player_id in (select player_id from public.parent_player_links where user_id = auth.uid()));
