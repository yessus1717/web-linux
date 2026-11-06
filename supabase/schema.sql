-- LinuxPath · esquema de Supabase
-- Pégalo completo en: Supabase Dashboard → SQL Editor → New query → Run.
-- Es seguro ejecutarlo más de una vez.

-- ---------------------------------------------------------------
-- 1) Perfiles: nombre de usuario único (el correo y la contraseña
--    los guarda Supabase Auth en auth.users)
-- ---------------------------------------------------------------
create table if not exists public.perfiles (
  id      uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null check (nombre ~ '^[A-Za-z0-9_]{3,24}$'),
  creado  timestamptz not null default now()
);

-- Único sin distinguir mayúsculas: "Ana" y "ana" son el mismo nombre
create unique index if not exists perfiles_nombre_unico on public.perfiles (lower(nombre));

alter table public.perfiles enable row level security;

drop policy if exists "perfiles: ver el propio" on public.perfiles;
create policy "perfiles: ver el propio" on public.perfiles
  for select to authenticated
  using ((select auth.uid()) = id);
-- No hay políticas de insert/update/delete: solo el trigger de abajo escribe aquí.

-- Al crearse un usuario en Auth se crea su perfil con el nombre elegido en el registro
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n text := new.raw_user_meta_data ->> 'nombre';
begin
  if n is null or n !~ '^[A-Za-z0-9_]{3,24}$' then
    n := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into public.perfiles (id, nombre) values (new.id, n);
  return new;
end;
$$;

revoke all on function public.crear_perfil() from public, anon, authenticated;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- El formulario de registro pregunta esto antes de crear la cuenta.
-- Devuelve solo true/false; no expone ningún otro dato.
create or replace function public.nombre_disponible(n text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.perfiles where lower(nombre) = lower(n));
$$;

revoke all on function public.nombre_disponible(text) from public;
grant execute on function public.nombre_disponible(text) to anon, authenticated;

-- ---------------------------------------------------------------
-- 2) Progreso: una fila por usuario con el JSON que arma js/progreso.js
-- ---------------------------------------------------------------
create table if not exists public.progreso (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now(),
  constraint progreso_es_objeto check (jsonb_typeof(datos) = 'object'),
  constraint progreso_tamano    check (pg_column_size(datos) <= 65536)
);

alter table public.progreso enable row level security;

drop policy if exists "progreso: ver el propio"   on public.progreso;
drop policy if exists "progreso: crear el propio"  on public.progreso;
drop policy if exists "progreso: editar el propio" on public.progreso;
drop policy if exists "progreso: borrar el propio" on public.progreso;

create policy "progreso: ver el propio"   on public.progreso
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "progreso: crear el propio" on public.progreso
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progreso: editar el propio" on public.progreso
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progreso: borrar el propio" on public.progreso
  for delete to authenticated using ((select auth.uid()) = user_id);
