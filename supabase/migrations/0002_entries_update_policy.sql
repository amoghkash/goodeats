-- Allow users to edit their own entries (needed for caption editing).
create policy "users update own entries"
  on public.entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
