-- =====================================================
-- Agenda Barber | banco na nuvem (Supabase) para VÁRIAS barbearias
-- Cada dono só vê os dados da própria loja. O cliente final só consegue
-- ver a loja pública, os serviços, os horários ocupados e criar um agendamento.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- =====================================================

create table public.lojas (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null references auth.users(id) on delete cascade,
  slug text unique not null,                 -- o link: /?loja=nome-da-barbearia
  nome text not null,
  whatsapp text not null,
  abre time not null default '09:00',
  fecha time not null default '19:00',
  dias int[] not null default '{1,2,3,4,5,6}',
  passo int not null default 30,
  pausa_de time, pausa_ate time,
  plano text not null default 'teste',       -- teste | ativo | atrasado (para a cobrança)
  criado timestamptz not null default now()
);
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  loja uuid not null references public.lojas(id) on delete cascade,
  nome text not null, minutos int not null check (minutos between 5 and 480), preco numeric(10,2) not null check (preco >= 0)
);
create table public.equipe (
  id uuid primary key default gen_random_uuid(),
  loja uuid not null references public.lojas(id) on delete cascade,
  nome text not null
);
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  loja uuid not null references public.lojas(id) on delete cascade,
  data date not null, hora time not null, minutos int not null,
  servico text, preco numeric(10,2) not null default 0,
  prof uuid references public.equipe(id) on delete set null, prof_nome text,
  cliente text, telefone text,
  status text not null default 'confirmado' check (status in ('confirmado','concluido','cancelado','bloqueio')),
  criado timestamptz not null default now()
);
create index on public.agendamentos (loja, data);

alter table public.lojas enable row level security;
alter table public.servicos enable row level security;
alter table public.equipe enable row level security;
alter table public.agendamentos enable row level security;

-- dono: acesso total à própria loja
create policy dono_lojas on public.lojas for all using (dono = auth.uid()) with check (dono = auth.uid());
create policy dono_servicos on public.servicos for all using (loja in (select id from public.lojas where dono = auth.uid())) with check (loja in (select id from public.lojas where dono = auth.uid()));
create policy dono_equipe on public.equipe for all using (loja in (select id from public.lojas where dono = auth.uid())) with check (loja in (select id from public.lojas where dono = auth.uid()));
create policy dono_agenda on public.agendamentos for all using (loja in (select id from public.lojas where dono = auth.uid())) with check (loja in (select id from public.lojas where dono = auth.uid()));

-- cliente (sem login): lê a loja, serviços e equipe; cria agendamento
create policy pub_lojas on public.lojas for select using (plano in ('teste','ativo'));
create policy pub_servicos on public.servicos for select using (true);
create policy pub_equipe on public.equipe for select using (true);
create policy pub_criar on public.agendamentos for insert with check (status = 'confirmado');

-- o cliente vê apenas os horários ocupados, sem nome nem telefone de ninguém
create view public.horarios_ocupados as
  select loja, data, hora, minutos, prof from public.agendamentos where status in ('confirmado','concluido','bloqueio');
grant select on public.horarios_ocupados to anon, authenticated;
