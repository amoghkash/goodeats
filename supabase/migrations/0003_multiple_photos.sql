-- Support multiple photos per entry (up to 10, enforced in the app).
alter table public.entries
  add column if not exists photo_paths text[] not null default '{}';

-- Backfill existing single-photo rows into the array.
update public.entries
  set photo_paths = array[photo_path]
  where photo_path is not null
    and coalesce(array_length(photo_paths, 1), 0) = 0;

-- Retire the old single-photo column now that data is migrated.
alter table public.entries drop column if exists photo_path;
