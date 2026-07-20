-- Mamascript Phase 0: Row Level Security

alter table public.profiles enable row level security;
alter table public.vaults enable row level security;
alter table public.vault_members enable row level security;
alter table public.invitations enable row level security;
alter table public.entries enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users read/update own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Vault members can read co-members' basic profile (for member lists)
create policy "profiles_select_vault_peers" on public.profiles
  for select using (
    exists (
      select 1 from public.vault_members vm1
      join public.vault_members vm2 on vm1.vault_id = vm2.vault_id
      where vm1.user_id = auth.uid() and vm2.user_id = profiles.id
    )
  );

-- Vaults
create policy "vaults_select_member" on public.vaults
  for select using (public.is_vault_member(id, auth.uid()));

create policy "vaults_insert_authenticated" on public.vaults
  for insert with check (auth.uid() = created_by_user_id);

create policy "vaults_update_owner" on public.vaults
  for update using (public.is_vault_owner(id, auth.uid()));

create policy "vaults_delete_owner" on public.vaults
  for delete using (public.is_vault_owner(id, auth.uid()));

-- Vault members
create policy "vault_members_select_member" on public.vault_members
  for select using (public.is_vault_member(vault_id, auth.uid()));

create policy "vault_members_insert_owner" on public.vault_members
  for insert with check (
    public.is_vault_owner(vault_id, auth.uid())
    or (user_id = auth.uid() and role = 'owner')
  );

create policy "vault_members_delete_owner" on public.vault_members
  for delete using (
    public.is_vault_owner(vault_id, auth.uid())
    or user_id = auth.uid()
  );

-- Invitations (owners manage; invitees can read own email invites when logged in)
create policy "invitations_select_owner" on public.invitations
  for select using (public.is_vault_owner(vault_id, auth.uid()));

create policy "invitations_select_invitee" on public.invitations
  for select using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "invitations_insert_owner" on public.invitations
  for insert with check (public.is_vault_owner(vault_id, auth.uid()));

create policy "invitations_delete_owner" on public.invitations
  for delete using (public.is_vault_owner(vault_id, auth.uid()));

-- Entries
create policy "entries_select_member" on public.entries
  for select using (public.is_vault_member(vault_id, auth.uid()));

create policy "entries_insert_member" on public.entries
  for insert with check (
    public.is_vault_member(vault_id, auth.uid())
    and created_by_user_id = auth.uid()
  );

create policy "entries_update_author_or_owner" on public.entries
  for update using (
    public.is_vault_member(vault_id, auth.uid())
    and (
      created_by_user_id = auth.uid()
      or public.is_vault_owner(vault_id, auth.uid())
    )
  );

create policy "entries_delete_author_or_owner" on public.entries
  for delete using (
    public.is_vault_member(vault_id, auth.uid())
    and (
      created_by_user_id = auth.uid()
      or public.is_vault_owner(vault_id, auth.uid())
    )
  );

-- Comments
create policy "comments_select_member" on public.comments
  for select using (
    exists (
      select 1 from public.entries e
      where e.id = comments.entry_id
        and public.is_vault_member(e.vault_id, auth.uid())
    )
  );

create policy "comments_insert_member" on public.comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.entries e
      where e.id = entry_id
        and public.is_vault_member(e.vault_id, auth.uid())
    )
  );

create policy "comments_delete_author_or_owner" on public.comments
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.entries e
      where e.id = comments.entry_id
        and public.is_vault_owner(e.vault_id, auth.uid())
    )
  );

-- Notifications
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- Inserts done by FastAPI service role (bypasses RLS) in later phases
