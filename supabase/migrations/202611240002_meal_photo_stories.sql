begin;

alter table public.meals
  add column eaten_time time,
  add column place_id text check (length(place_id) <= 512 and place_id ~ '^[A-Za-z0-9_-]+$'),
  -- shortcut: keep up to six compressed photos in one atomic write, move them to private Storage as volume grows.
  add column extra_photos text[] not null default '{}'
    check (cardinality(extra_photos) <= 5 and coalesce(array_ndims(extra_photos), 1) = 1
      and coalesce(array_lower(extra_photos, 1), 1) = 1 and array_position(extra_photos, null) is null
      and greatest(length(extra_photos[1]), length(extra_photos[2]), length(extra_photos[3]),
        length(extra_photos[4]), length(extra_photos[5])) <= 350000
      and (cardinality(extra_photos) = 0 or array_to_string(extra_photos, ',') ~
        '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}(,data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}){0,4}$'));

grant insert (eaten_time, place_id, extra_photos) on public.meals to authenticated;

create table public.meal_likes (
  meal_id uuid not null references public.meals on delete cascade,
  owner uuid not null default auth.uid() references public.diners on delete cascade,
  primary key (meal_id, owner)
);

create table public.meal_comments (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals on delete cascade,
  owner uuid not null default auth.uid() references public.diners on delete cascade,
  nickname text not null,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
create index meal_comments_thread on public.meal_comments (meal_id, created_at, id);

create function public.name_meal_comment()
returns trigger language plpgsql set search_path = '' as $$
begin
  select nickname into new.nickname from public.diners where id = (select auth.uid());
  return new;
end;
$$;
revoke all on function public.name_meal_comment() from public, anon, authenticated;
create trigger name_meal_comment before insert on public.meal_comments
  for each row execute function public.name_meal_comment();

alter table public.meal_likes enable row level security;
alter table public.meal_comments enable row level security;
revoke all on public.meal_likes, public.meal_comments from public, anon, authenticated;
grant select, delete on public.meal_likes, public.meal_comments to authenticated;
grant insert (meal_id) on public.meal_likes to authenticated;
grant insert (meal_id, body) on public.meal_comments to authenticated;

-- The meal's existing RLS gates all interaction reads and writes, including after unfriending.
create policy likes_read on public.meal_likes for select to authenticated
  using (exists (select 1 from public.meals where id = meal_id));
create policy likes_create on public.meal_likes for insert to authenticated
  with check (owner = (select auth.uid()) and exists (select 1 from public.meals where id = meal_id));
create policy likes_delete on public.meal_likes for delete to authenticated
  using (owner = (select auth.uid()));

create policy comments_read on public.meal_comments for select to authenticated
  using (exists (select 1 from public.meals where id = meal_id));
create policy comments_create on public.meal_comments for insert to authenticated
  with check (owner = (select auth.uid()) and exists (select 1 from public.meals where id = meal_id));
create policy comments_delete on public.meal_comments for delete to authenticated
  using (owner = (select auth.uid()));

commit;
