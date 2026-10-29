-- Run this in Supabase Dashboard → SQL Editor.
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brand text not null default '',
  category text not null default 'Другое',
  year text not null default '',
  description text not null default '',
  tags text not null default '',
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;

-- Everyone can browse the archive.
create policy "Public can read archive items"
on public.items for select using (true);

-- Only authenticated users can manage records.
create policy "Authenticated users can insert archive items"
on public.items for insert to authenticated with check (true);

create policy "Authenticated users can update archive items"
on public.items for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete archive items"
on public.items for delete to authenticated using (true);

-- Create a Storage bucket named "archive-photos" and set it to PUBLIC.
-- Storage policies below allow public viewing and only signed-in uploads/changes.
insert into storage.buckets (id, name, public)
values ('archive-photos', 'archive-photos', true)
on conflict (id) do update set public = true;

create policy "Public can view archive photos"
on storage.objects for select using (bucket_id = 'archive-photos');

create policy "Signed-in users can upload archive photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'archive-photos');

create policy "Signed-in users can update archive photos"
on storage.objects for update to authenticated
using (bucket_id = 'archive-photos') with check (bucket_id = 'archive-photos');

create policy "Signed-in users can delete archive photos"
on storage.objects for delete to authenticated
using (bucket_id = 'archive-photos');