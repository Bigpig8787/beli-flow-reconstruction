begin;

create table public.diners (
  id uuid primary key references auth.users on delete cascade default auth.uid(),
  friend_id text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 32)
);

create table public.friend_requests (
  sender uuid not null default auth.uid() references public.diners on delete cascade,
  recipient uuid not null references public.diners on delete cascade,
  accepted boolean not null default false,
  primary key (sender, recipient),
  check (sender <> recipient)
);
create unique index friend_requests_one_pair
  on public.friend_requests (least(sender, recipient), greatest(sender, recipient));
create index friend_requests_recipient on public.friend_requests (recipient);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.diners on delete cascade,
  eaten_on date not null,
  restaurant text not null check (char_length(btrim(restaurant)) between 1 and 100),
  caption text not null default '' check (char_length(caption) <= 280),
  -- shortcut: one compressed JPEG per meal for atomic writes, move to private object storage when volume warrants it.
  photo text not null check (length(photo) <= 350000 and photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'),
  created_at timestamptz not null default now()
);
create index meals_owner_day on public.meals (owner, eaten_on desc, created_at desc);

alter table public.diners enable row level security;
alter table public.friend_requests enable row level security;
alter table public.meals enable row level security;

revoke all on public.diners, public.friend_requests, public.meals from public, anon, authenticated;
grant select on public.diners, public.friend_requests, public.meals to authenticated;
grant insert (nickname), update (nickname) on public.diners to authenticated;
grant insert (recipient), update (accepted), delete on public.friend_requests to authenticated;
grant insert (id, eaten_on, restaurant, caption, photo), delete on public.meals to authenticated;

create policy requests_participants on public.friend_requests for select to authenticated
  using ((select auth.uid()) in (sender, recipient));
create policy requests_send on public.friend_requests for insert to authenticated
  with check (sender = (select auth.uid()) and not accepted);
create policy requests_accept on public.friend_requests for update to authenticated
  using (recipient = (select auth.uid()) and not accepted)
  with check (recipient = (select auth.uid()) and accepted);
create policy requests_remove on public.friend_requests for delete to authenticated
  using ((select auth.uid()) in (sender, recipient));

create policy diners_read on public.diners for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from public.friend_requests r
    where (r.sender = diners.id and r.recipient = (select auth.uid()))
       or (r.recipient = diners.id and r.sender = (select auth.uid()))
  )
);
create policy diners_create on public.diners for insert to authenticated with check (id = (select auth.uid()));
create policy diners_rename on public.diners for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy meals_read on public.meals for select to authenticated using (
  owner = (select auth.uid()) or exists (
    select 1 from public.friend_requests r
    where r.accepted and (
      (r.sender = meals.owner and r.recipient = (select auth.uid()))
      or (r.recipient = meals.owner and r.sender = (select auth.uid()))
    )
  )
);
create policy meals_publish on public.meals for insert to authenticated with check (owner = (select auth.uid()));
create policy meals_delete on public.meals for delete to authenticated using (owner = (select auth.uid()));

create function public.find_diner(code text)
returns table (id uuid, friend_id text, nickname text)
language sql stable security definer set search_path = '' as $$
  select d.id, d.friend_id, d.nickname
  from public.diners d
  where (select auth.uid()) is not null and d.friend_id = lower(btrim(code))
$$;

create function public.recent_friend_meals(first_day date, last_day date)
returns setof public.meals
language sql stable security invoker set search_path = '' as $$
  select (ranked.meal).*
  from (
    select m as meal, row_number() over (partition by m.owner order by m.eaten_on desc, m.created_at desc, m.id) as position
    from public.meals m
    where m.owner <> (select auth.uid()) and m.eaten_on between first_day and last_day
  ) ranked
  where ranked.position <= 2
  order by (ranked.meal).eaten_on desc, (ranked.meal).created_at desc, (ranked.meal).id
$$;

revoke all on function public.find_diner(text), public.recent_friend_meals(date, date) from public, anon, authenticated;
grant execute on function public.find_diner(text), public.recent_friend_meals(date, date) to authenticated;

commit;
