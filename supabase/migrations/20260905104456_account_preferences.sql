create table public.account_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  favorites text[] not null default '{}' check (cardinality(favorites) <= 100 and octet_length(favorites::text) <= 5000)
);
alter table public.account_preferences enable row level security;
revoke all on public.account_preferences from anon;
grant select, insert, update, delete on public.account_preferences to authenticated;
create policy "Read own preferences" on public.account_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own preferences" on public.account_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own preferences" on public.account_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own preferences" on public.account_preferences for delete to authenticated using ((select auth.uid()) = user_id);
