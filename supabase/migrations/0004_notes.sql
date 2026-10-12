-- Short notes the two of you can send each other throughout the day.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notes_created_at_idx
  on public.notes (created_at desc);
create index if not exists notes_unread_idx
  on public.notes (recipient_id) where read_at is null;

-- New tables aren't auto-exposed to the Data API, so grant explicitly.
-- The recipient may only touch read_at (to mark a note as seen).
grant select, insert, delete on public.notes to authenticated;
grant update (read_at) on public.notes to authenticated;

alter table public.notes enable row level security;

create policy "notes readable by sender or recipient"
  on public.notes for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));
create policy "users send own notes"
  on public.notes for insert to authenticated
  with check (auth.uid() = sender_id and recipient_id <> sender_id);
create policy "recipients mark notes read"
  on public.notes for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
create policy "senders delete own notes"
  on public.notes for delete to authenticated
  using (auth.uid() = sender_id);

-- Stream new notes to the open app (Supabase Realtime).
do $$ begin
  alter publication supabase_realtime add table public.notes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
