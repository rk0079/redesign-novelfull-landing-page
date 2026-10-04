alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Make the current Reclaim owner account an admin.
update public.profiles
set is_admin = true
where id in (
  select id from auth.users where email = 'rahulkpurohit01@gmail.com'
);

drop policy if exists "Admins manage all listings" on public.listings;
create policy "Admins manage all listings"
on public.listings
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Admins read all inquiries" on public.inquiries;
create policy "Admins read all inquiries"
on public.inquiries
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  or auth.uid() = requester_id
  or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
);

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
