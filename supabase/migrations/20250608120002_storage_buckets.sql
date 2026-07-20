-- Mamascript Phase 0: Storage buckets for audio & images

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'entry-audio',
    'entry-audio',
    false,
    26214400,
    array['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/aac']
  ),
  (
    'entry-images',
    'entry-images',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
on conflict (id) do nothing;

-- Members of a vault can read files for entries in that vault (path: {entry_id}/...)
create policy "entry_audio_select_member" on storage.objects
  for select using (
    bucket_id = 'entry-audio'
    and exists (
      select 1 from public.entries e
      where e.id::text = (storage.foldername(name))[1]
        and public.is_vault_member(e.vault_id, auth.uid())
    )
  );

create policy "entry_images_select_member" on storage.objects
  for select using (
    bucket_id = 'entry-images'
    and exists (
      select 1 from public.entries e
      where e.id::text = (storage.foldername(name))[1]
        and public.is_vault_member(e.vault_id, auth.uid())
    )
  );

-- Upload restricted to authenticated users (FastAPI service role uploads in Phase 4)
create policy "entry_audio_insert_authenticated" on storage.objects
  for insert with check (
    bucket_id = 'entry-audio' and auth.role() = 'authenticated'
  );

create policy "entry_images_insert_authenticated" on storage.objects
  for insert with check (
    bucket_id = 'entry-images' and auth.role() = 'authenticated'
  );
