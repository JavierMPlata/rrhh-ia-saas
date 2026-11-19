-- Solicitudes de eliminación de datos personales (derecho al olvido, Ley 1581 de 2012).
-- El formulario público /eliminar-datos registra la solicitud; un administrador
-- la revisa en /dashboard/admin y la ejecuta o la rechaza.
-- Ejecutar una vez en Supabase → SQL Editor.

create table if not exists public.solicitudes_eliminacion (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  motivo                text,
  estado                text not null default 'pendiente'
                          check (estado in ('pendiente', 'completada', 'rechazada')),
  ip_solicitud          text,
  created_at            timestamptz not null default now(),
  resuelta_en           timestamptz,
  resuelta_por          uuid references auth.users(id),
  resuelta_por_email    text,
  candidatos_eliminados integer,
  nota_resolucion       text
);

create index if not exists solicitudes_eliminacion_estado_idx
  on public.solicitudes_eliminacion (estado, created_at desc);

-- Solo una solicitud pendiente por correo (evita spam de solicitudes repetidas).
create unique index if not exists solicitudes_eliminacion_pendiente_unica
  on public.solicitudes_eliminacion (lower(email))
  where estado = 'pendiente';

-- RLS activado y sin políticas: nadie accede con la anon key.
-- Las rutas /api/eliminar-datos usan la service key en el servidor
-- y verifican que quien resuelve sea admin.
alter table public.solicitudes_eliminacion enable row level security;
