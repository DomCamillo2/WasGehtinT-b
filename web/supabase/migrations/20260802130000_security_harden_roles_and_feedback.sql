-- Harden privilege-sensitive columns against client-side escalation.
-- 1) Prevent users from changing their own user_profiles.role
-- 2) Prevent users from rewriting feedback admin fields / status

create or replace function public.prevent_user_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role / postgres may change roles; authenticated JWT users may not.
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'role changes are not allowed for non-service clients';
    end if;
    if tg_op = 'INSERT' and coalesce(new.role, 'student') not in ('student') then
      raise exception 'privileged roles cannot be self-assigned on insert';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_user_profile_role_escalation on public.user_profiles;
create trigger trg_prevent_user_profile_role_escalation
before insert or update on public.user_profiles
for each row
execute function public.prevent_user_profile_role_escalation();

-- Feedback: users must not update their own rows (status/admin_note/reviewed_*).
-- Inserts remain public; admin updates go through service-role server actions.
drop policy if exists "feedback_entries_update_own" on public.feedback_entries;

drop policy if exists "feedback_entries_admin_update" on public.feedback_entries;
create policy "feedback_entries_admin_update"
on public.feedback_entries
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.role in ('admin', 'owner')
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.role in ('admin', 'owner')
  )
);
