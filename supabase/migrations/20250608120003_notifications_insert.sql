-- Allow authenticated users to create notifications (comments, invites, etc.)
create policy "notifications_insert_authenticated" on public.notifications
  for insert with check (auth.role() = 'authenticated');

-- Invitees can mark their invitation accepted on signup
create policy "invitations_update_invitee" on public.invitations
  for update using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
