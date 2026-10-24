-- Configuração da tabela do ranking. Rode uma vez no SQL Editor do Supabase;
-- o app não aplica isso sozinho.

alter table "Users" enable row level security;

-- Leitura pública do ranking.
drop policy if exists "ranking leitura" on "Users";
create policy "ranking leitura" on "Users" for select to anon using (true);

-- Inserção pelo app (a chave publishable é pública; sem policy o insert falha).
drop policy if exists "ranking insercao" on "Users";
create policy "ranking insercao" on "Users" for insert to anon with check (true);

-- Nomes repetidos: o app checa antes de começar, mas só o índice garante entre
-- dois jogadores. Se já houver duplicatas o índice falha; apague-as antes:
--   select lower(nickname), count(*) from "Users" group by 1 having count(*) > 1;
create unique index if not exists users_nickname_lower on "Users" (lower(nickname));

-- Limites de sanidade. O score é calculado no navegador, então dá para inserir
-- valores arbitrários; isso barra pelo menos o absurdo. `not valid` não mexe
-- nas linhas que já existem.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_nickname_tamanho') then
    alter table "Users" add constraint users_nickname_tamanho
      check (char_length(nickname) between 1 and 20) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'users_time_positivo') then
    alter table "Users" add constraint users_time_positivo
      check (time > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'users_score_faixa') then
    alter table "Users" add constraint users_score_faixa
      check (score >= 0 and score <= 1000000) not valid;
  end if;
end $$;
