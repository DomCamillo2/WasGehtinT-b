alter table public.user_profiles
  add column if not exists gender text check (gender in ('female', 'male', 'diverse')),
  add column if not exists age smallint check (age between 16 and 99),
  add column if not exists study_program text,
  add column if not exists profile_visibility text not null default 'members' check (profile_visibility in ('public', 'members', 'hidden'));

create index if not exists user_profiles_profile_visibility_idx
  on public.user_profiles (profile_visibility);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_visible_or_own" on storage.objects;
create policy "avatars_select_visible_or_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.user_profiles up
      where up.id::text = (storage.foldername(name))[1]
        and up.profile_visibility <> 'hidden'
    )
  )
);

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
