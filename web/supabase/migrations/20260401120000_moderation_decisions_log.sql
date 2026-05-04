-- =========================================================
-- Moderation decisions audit log
-- =========================================================

create table if not exists public.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('party', 'hangout')),
  entity_id text not null,
  decision text not null check (decision in ('approve', 'reject')),
  reviewed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_decisions_entity
  on public.moderation_decisions (entity_type, entity_id, created_at desc);

create index if not exists idx_moderation_decisions_created_at
  on public.moderation_decisions (created_at desc);

alter table public.moderation_decisions enable row level security;

drop policy if exists "moderation_decisions_admin_read" on public.moderation_decisions;
create policy "moderation_decisions_admin_read"
  on public.moderation_decisions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('admin', 'owner')
    )
  );

drop policy if exists "moderation_decisions_service_insert" on public.moderation_decisions;
create policy "moderation_decisions_service_insert"
  on public.moderation_decisions
  for insert
  to service_role
  with check (true);

grant select on public.moderation_decisions to authenticated;
grant insert on public.moderation_decisions to service_role;
