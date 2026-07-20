-- Ensure profile updates pass RLS WITH CHECK (e.g. after trigger-created row).

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
