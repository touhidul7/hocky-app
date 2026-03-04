
-- Fix security definer views by dropping and recreating as security invoker
-- Also fix update_updated_at function missing search_path

-- Drop existing views
drop view if exists public.player_progress_view;
drop view if exists public.team_rankings_view;

-- Recreate as security invoker (default)
create or replace view public.player_progress_view
with (security_invoker = true)
as
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

create or replace view public.team_rankings_view
with (security_invoker = true)
as
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

-- Fix update_updated_at function to include search_path
create or replace function public.update_updated_at()
returns trigger language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
